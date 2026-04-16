import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Alert, Dimensions, Image, Linking, Modal, PixelRatio, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { applyRoundResult, generateRound } from './engine/matchmaker';
import {
    ADULT_SKILL_LEVEL_OPTIONS,
    AdultSkillLevel,
    DEFAULT_ADULT_SKILL_LEVEL,
    getSkillLevelShortLabel,
    HistoryRecord,
    Match,
    RealPlayer,
    SkillLevel,
} from './types';

const APP_LOGO = require('../../assets/logo.png');

// --- DESIGN SYSTEM ---
const COLORS = {
  bgMain: '#07111F',
  bgPanel: '#111A27',
  bgPanel2: '#182230',
  textPrimary: '#F5F7FA',
  textSecondary: '#D7DEE8',
  textMuted: '#B7C2D0',
  accentMain: '#F7B733',
  accentMainStrong: '#FFC247',
  accentCool: '#49C6FF',
  accentAlert: '#FF4D6D',
  borderSoft: '#243244',
  borderStrong: '#31445D',
};

const BELL_SOUND = require('../../assets/boxing-bell.mp3');
const BEEP_SOUND = require('../../assets/short-beep.mp3');
const KLAPS_SOUND = require('../../assets/side_stick_1.mp3');
const FINISH_SOUND = require('../../assets/applause.mp3');
const AUDIO_MODE = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
  interruptionModeIOS: InterruptionModeIOS.DuckOthers,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
} as const;

const ensureAudioFocus = async () => {
  try {
    await Audio.setAudioModeAsync(AUDIO_MODE);
  } catch {}
};

const TOGGLE_TONES = {
  cool: {
    backgroundColor: 'rgba(73, 198, 255, 0.14)',
    borderColor: 'rgba(73, 198, 255, 0.42)',
    textColor: COLORS.accentCool,
  },
  warm: {
    backgroundColor: 'rgba(247, 183, 51, 0.18)',
    borderColor: 'rgba(247, 183, 51, 0.5)',
    textColor: COLORS.accentMain,
  },
  neutral: {
    backgroundColor: 'rgba(215, 222, 232, 0.1)',
    borderColor: 'rgba(215, 222, 232, 0.24)',
    textColor: COLORS.textPrimary,
  },
} as const;

const PLAYERS_DB_KEY = 'BJJ_PLAYERS_DB';
const SKILL_LEVEL_SCHEMA_KEY = 'BJJ_SKILL_LEVEL_SCHEMA_VERSION';
const SKILL_LEVEL_SCHEMA_VERSION = '2';

const normalizeAdultSkillLevel = (skillLevel: number): AdultSkillLevel => {
  const parsedSkillLevel = Number.isFinite(skillLevel)
    ? Math.round(skillLevel)
    : DEFAULT_ADULT_SKILL_LEVEL;

  if (parsedSkillLevel <= 1) return 1;
  if (parsedSkillLevel === 2) return 2;
  if (parsedSkillLevel === 3) return 3;
  return 4;
};

const getNormalizedPlayerSkillLevel = (
  player: Pick<RealPlayer, 'type' | 'skillLevel'>,
  migrateLegacyThreeLevelScale = false
): SkillLevel => {
  if (player.type !== 'ADULT') return 0;

  const normalizedSkillLevel = normalizeAdultSkillLevel(Number(player.skillLevel));

  // Jednorazowa migracja starej skali 1-3, aby dawny PRO zachował poziom PRO.
  if (migrateLegacyThreeLevelScale && normalizedSkillLevel === 3) {
    return 4;
  }

  return normalizedSkillLevel;
};

const normalizeStoredPlayer = (
  player: RealPlayer,
  migrateLegacyThreeLevelScale = false
): RealPlayer => ({
  ...player,
  skillLevel: getNormalizedPlayerSkillLevel(player, migrateLegacyThreeLevelScale),
});

const sortForZadaniowki = (players: RealPlayer[]) => {
    return [...players].sort((a, b) => {
        if (a.gear !== b.gear) return a.gear.localeCompare(b.gear);
        if (a.skillLevel !== b.skillLevel) return b.skillLevel - a.skillLevel;
        return b.weight - a.weight;
    });
};

const chunkSameGearForTriads = (players: RealPlayer[]) => {
    const groups: RealPlayer[][] = [];
    let i = 0;

    while (players.length - i >= 3) {
        groups.push([players[i], players[i + 1], players[i + 2]]);
        i += 3;
    }

    const remaining = players.slice(i);
    if (remaining.length > 0) {
        groups.push(remaining);
    }

    return groups;
};

const mergeSingletonZadaniowkiGroups = (groups: RealPlayer[][]) => {
    const result = groups.filter(group => group.length > 1).map(group => [...group]);
    const singletons = groups
        .filter(group => group.length === 1)
        .map(group => group[0])
        .filter(Boolean);

    if (result.length === 0 && singletons.length === 2) {
        const first = singletons[0];
        const second = singletons[1];
        return first && second ? [[first, second]] : [];
    }

    for (const singleton of singletons) {
        const targetIndex = result.findIndex(group => group.length === 2);

        if (singleton && targetIndex >= 0) {
            result[targetIndex] = [...result[targetIndex], singleton];
        } else if (singleton) {
            const sameGearTripleIndex = result.findIndex(
                group => group.length === 3 && group.every(player => player.gear === singleton.gear)
            );
            const noGiTripleIndex = result.findIndex(
                group => group.length === 3 && group.every(player => player.gear === 'NO')
            );
            const oppositeTripleIndex = result.findIndex(
                group => group.length === 3 && group.every(player => player.gear !== singleton.gear)
            );
            const anyTripleIndex = result.findIndex(group => group.length === 3);
            const donorIndex = singleton.gear === 'GI'
                ? (noGiTripleIndex >= 0 ? noGiTripleIndex : anyTripleIndex)
                : (sameGearTripleIndex >= 0 ? sameGearTripleIndex : oppositeTripleIndex);

            if (donorIndex >= 0) {
                const donorGroup = result[donorIndex];
                const movedPlayer = donorGroup[donorGroup.length - 1];
                result[donorIndex] = donorGroup.slice(0, -1);
                result.push([singleton, movedPlayer]);
            } else {
                result.push([singleton]);
            }
        }
    }

    return result;
};

const completeGiPairsFromNoGiTriads = (groups: RealPlayer[][]) => {
    const result = groups.map(group => [...group]);

    while (true) {
        const giPairIndex = result.findIndex(
            group => group.length === 2 && group.every(player => player.gear === 'GI')
        );
        const noGiTriadIndex = result.findIndex(
            group => group.length === 3 && group.every(player => player.gear === 'NO')
        );

        if (giPairIndex < 0 || noGiTriadIndex < 0) {
            break;
        }

        const donorGroup = result[noGiTriadIndex];
        const movedPlayer = donorGroup[donorGroup.length - 1];
        result[noGiTriadIndex] = donorGroup.slice(0, -1);
        result[giPairIndex] = [...result[giPairIndex], movedPlayer];
    }

    return result;
};

const chunkZadaniowkiByGear = (players: RealPlayer[]) => {
    const giGroups = chunkSameGearForTriads(sortForZadaniowki(players.filter(player => player.gear === 'GI')));
    const noGiGroups = chunkSameGearForTriads(sortForZadaniowki(players.filter(player => player.gear === 'NO')));

    return completeGiPairsFromNoGiTriads(mergeSingletonZadaniowkiGroups([...giGroups, ...noGiGroups]));
};

const countPlayersByGear = (players: RealPlayer[]) => {
    return players.reduce((counts, player) => {
        counts[player.gear] += 1;
        return counts;
    }, { GI: 0, NO: 0 } as Record<RealPlayer['gear'], number>);
};

const countPairGroups = (groups: RealPlayer[][]) => {
    return groups.filter(group => group.length === 2).length;
};

const getGearGroupingPenalty = (groups: RealPlayer[][]) => {
    return groups.reduce((penalty, group) => {
        const gearCount = new Set(group.map(player => player.gear)).size;

        if (group.length === 1) return penalty + 1000;
        if (gearCount > 1) return penalty + 100;
        return penalty;
    }, 0);
};

const compareScoreTuple = (a: number[], b: number[]) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }

    return a.length - b.length;
};

const chooseKidToPromoteToAdults = (
    kids: RealPlayer[],
    adults: RealPlayer[],
    currentKidGearPenalty: number
) => {
    const gearCounts = countPlayersByGear(kids);
    const movableKids = kids.filter(kid => {
        const gearCount = gearCounts[kid.gear];
        return gearCount % 3 !== 0;
    });
    const stableCandidates = movableKids.filter(kid => {
        const groupsWithoutKid = chunkZadaniowkiByGear(kids.filter(player => player.id !== kid.id));
        return getGearGroupingPenalty(groupsWithoutKid) <= currentKidGearPenalty;
    });
    const candidates = stableCandidates.length > 0 ? stableCandidates : movableKids;

    const getCandidateScore = (kid: RealPlayer) => {
        const groupsWithoutKid = chunkZadaniowkiByGear(kids.filter(player => player.id !== kid.id));
        const gearPenalty = getGearGroupingPenalty(groupsWithoutKid);
        const adultPair = findSafestAdultPairForPromotedKid(adults, kid);
        const adultGearPenalty = adultPair
            ? adultPair.filter(adult => adult.gear !== kid.gear).length
            : 99;
        const gearCount = gearCounts[kid.gear];
        const gearRemainder = gearCount % 3;
        const remainderPriority = gearRemainder === 1 ? 0 : gearRemainder === 2 ? 1 : 2;
        const pairBreakPenalty = gearCount === 2 ? 1 : 0;

        return [
            gearPenalty,
            remainderPriority,
            pairBreakPenalty,
            adultGearPenalty,
            -kid.weight,
        ];
    };

    return [...candidates].sort((a, b) => {
        const scoreCompare = compareScoreTuple(getCandidateScore(a), getCandidateScore(b));
        if (scoreCompare !== 0) return scoreCompare;
        return a.id.localeCompare(b.id, 'pl', { sensitivity: 'base' });
    })[0] ?? null;
};

const findSafestAdultPairForPromotedKid = (
    adults: RealPlayer[],
    promotedKid: RealPlayer
) => {
    let bestPair: RealPlayer[] | null = null;
    let bestScore: number[] | null = null;

    for (let i = 0; i < adults.length; i++) {
        for (let j = i + 1; j < adults.length; j++) {
            const pair = [adults[i], adults[j]];
            const remainingAdults = adults.filter(
                adult => adult.id !== pair[0].id && adult.id !== pair[1].id
            );
            const remainingGroups = chunkZadaniowkiByGear(remainingAdults);
            const score = [
                getGearGroupingPenalty([...remainingGroups, [...pair, promotedKid]]),
                pair.filter(adult => adult.gear !== promotedKid.gear).length,
                Math.max(...pair.map(adult => Number(adult.skillLevel) || 0)),
                pair.reduce((sum, adult) => sum + (Number(adult.skillLevel) || 0), 0),
                Math.max(...pair.map(adult => adult.weight)),
                pair.reduce((sum, adult) => sum + adult.weight, 0),
            ];

            if (!bestScore || compareScoreTuple(score, bestScore) < 0) {
                bestPair = pair;
                bestScore = score;
            }
        }
    }

    return bestPair;
};

const getTriadRoleAccent = (role: string, fallback: string) => {
    if (role === '[A]') return COLORS.accentMain;
    if (role === '[B]') return COLORS.accentCool;
    if (role === '[C]') return COLORS.accentAlert;
    return fallback;
};

const getTriadRoleOrder = (role: string) => {
    if (role === '[A]') return 0;
    if (role === '[B]') return 1;
    if (role === '[C]') return 2;
    return 99;
};

const buildTriadZadaniowkiGroups = (players: RealPlayer[]) => {
    let kids = sortForZadaniowki(players.filter(p => p.type === 'KID'));
    let adults = sortForZadaniowki(players.filter(p => p.type === 'ADULT'));
    const promotedAdultGroups: RealPlayer[][] = [];

    let kidsGroups = chunkZadaniowkiByGear(kids);
    let adultsGroups = chunkZadaniowkiByGear(adults);

    while (countPairGroups(kidsGroups) >= 2 && adultsGroups.some(group => group.length === 2)) {
        const currentKidGearPenalty = getGearGroupingPenalty(kidsGroups);
        const promotedKid = chooseKidToPromoteToAdults(kids, adults, currentKidGearPenalty);
        const safestAdultPair = promotedKid
            ? findSafestAdultPairForPromotedKid(adults, promotedKid)
            : null;

        if (!promotedKid || !safestAdultPair) {
            break;
        }

        const safestAdultIds = new Set(safestAdultPair.map(player => player.id));
        kids = kids.filter(player => player.id !== promotedKid.id);
        adults = adults.filter(player => !safestAdultIds.has(player.id));
        promotedAdultGroups.push([...safestAdultPair, promotedKid]);

        kidsGroups = chunkZadaniowkiByGear(kids);
        adultsGroups = chunkZadaniowkiByGear(adults);
    }

    // Singleton kids who can't form a pair/triad get merged into adult groups
    const singletonKids = kids.filter(kid =>
      kidsGroups.some(g => g.length === 1 && g[0].id === kid.id)
    );
    if (singletonKids.length > 0) {
      kids = kids.filter(k => !singletonKids.some(sk => sk.id === k.id));
      adults = [...adults, ...singletonKids];
      kidsGroups = chunkZadaniowkiByGear(kids);
      adultsGroups = chunkZadaniowkiByGear(adults);
    }

    return [...kidsGroups, ...adultsGroups, ...promotedAdultGroups];
};


type ResponsiveDensity = 'large' | 'medium' | 'compact';

type ResponsiveMatchCardProps = {
  leftName: string;
  rightName: string;
  leftColor: string;
  rightColor: string;
  cardWidth: number;
  cardHeight: number;
  layout?: 'auto' | 'row' | 'stacked';
};

const clamp = (min: number, value: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

const withAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace('#', '');

  if (normalized.length !== 6) {
    return hexColor;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getResponsiveDensity = (width: number, height: number): ResponsiveDensity => {
  if (width >= 1500 && height >= 850) return 'large';
  if (width >= 1150 && height >= 720) return 'medium';
  return 'compact';
};

const getTopBarMetrics = (width: number, height: number) => {
  const density = getResponsiveDensity(width, height);

  if (density === 'large') {
    return {
      paddingHorizontal: 16,
      paddingVertical: 12,
      roundFont: clamp(28, width * 0.022, 40),
      phaseFont: clamp(36, height * 0.05, 56),
      timerFont: clamp(72, width * 0.06, 108),
      timerPaddingHorizontal: clamp(18, width * 0.02, 34),
      timerPaddingVertical: clamp(8, height * 0.012, 14),
      estimatedHeight: 168,
    };
  }

  if (density === 'medium') {
    return {
      paddingHorizontal: 14,
      paddingVertical: 10,
      roundFont: clamp(24, width * 0.021, 34),
      phaseFont: clamp(30, height * 0.045, 46),
      timerFont: clamp(58, width * 0.052, 86),
      timerPaddingHorizontal: clamp(16, width * 0.018, 26),
      timerPaddingVertical: clamp(8, height * 0.011, 12),
      estimatedHeight: 150,
    };
  }

  return {
    paddingHorizontal: 12,
    paddingVertical: 8,
    roundFont: clamp(20, width * 0.02, 28),
    phaseFont: clamp(24, height * 0.04, 38),
    timerFont: clamp(46, width * 0.048, 68),
    timerPaddingHorizontal: clamp(12, width * 0.016, 20),
    timerPaddingVertical: clamp(6, height * 0.01, 10),
    estimatedHeight: 128,
  };
};

const getBottomBarMetrics = (width: number, height: number) => {
  const density = getResponsiveDensity(width, height);
  const wrap = width < 1050;

  if (density === 'large') {
    return {
      wrap,
      buttonFont: 20,
      buttonPaddingVertical: 14,
      buttonPaddingHorizontal: 18,
      buttonMinWidth: wrap ? 180 : 160,
      gap: 10,
      estimatedHeight: wrap ? 126 : 92,
    };
  }

  if (density === 'medium') {
    return {
      wrap,
      buttonFont: 18,
      buttonPaddingVertical: 12,
      buttonPaddingHorizontal: 16,
      buttonMinWidth: wrap ? 170 : 150,
      gap: 8,
      estimatedHeight: wrap ? 118 : 84,
    };
  }

  return {
    wrap: width < 900,
    buttonFont: 16,
    buttonPaddingVertical: 10,
    buttonPaddingHorizontal: 14,
    buttonMinWidth: 150,
    gap: 8,
    estimatedHeight: width < 900 ? 118 : 76,
  };
};

const getDynamicMaxRows = (width: number) => {
  if (width >= 1600) return 5;
  if (width >= 1280) return 4;
  if (width >= 1000) return 3;
  if (width >= 800) return 2;
  return 2;
};

type PairGridSpec = {
  cols: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
};

const getCenteredLastRowOffset = (index: number, count: number, cols: number) => {
  const remainder = count % cols;
  const firstLastRowIndex = remainder === 0 ? -1 : count - remainder;

  if (remainder === 0 || index !== firstLastRowIndex) {
    return 0;
  }

  return ((cols - remainder) / cols) * 50;
};

const getBestPairGridSpec = ({
  count,
  sectionWidth,
  sectionHeight,
  cellPadding,
  minCardWidth,
  minCardHeight,
  preferredCardWidth,
  maxCols,
  allowScroll,
}: {
  count: number;
  sectionWidth: number;
  sectionHeight: number;
  cellPadding: number;
  minCardWidth: number;
  minCardHeight: number;
  preferredCardWidth: number;
  maxCols: number;
  allowScroll: boolean;
}): PairGridSpec => {
  if (count <= 0 || sectionWidth <= 0) {
    return { cols: 1, rows: 0, cardWidth: 0, cardHeight: 0 };
  }

  const safeMaxCols = Math.max(1, Math.min(count, maxCols));

  if (allowScroll) {
    let cols = Math.max(
      1,
      Math.min(safeMaxCols, Math.floor((sectionWidth + cellPadding * 2) / preferredCardWidth))
    );
    cols = keepColsWithinMinWidth(sectionWidth, cols, cellPadding, minCardWidth);

    const rows = Math.ceil(count / cols);
    const cardWidth = Math.max(120, sectionWidth / cols - cellPadding * 2);
    const cardHeight = clamp(minCardHeight, cardWidth * 0.62, 220);

    return { cols, rows, cardWidth, cardHeight };
  }

  const validCandidates: PairGridSpec[] = [];
  let bestFallback: (PairGridSpec & { score: number }) | null = null;

  for (let cols = 1; cols <= safeMaxCols; cols++) {
    const rows = Math.ceil(count / cols);
    const cardWidth = Math.max(120, sectionWidth / cols - cellPadding * 2);
    const cardHeight = Math.max(68, sectionHeight / rows - cellPadding * 2);
    const score = Math.min(cardWidth / minCardWidth, cardHeight / minCardHeight);
    const candidate = { cols, rows, cardWidth, cardHeight, score };

    if (cardWidth >= minCardWidth && cardHeight >= minCardHeight) {
      validCandidates.push(candidate);
    }

    if (
      !bestFallback ||
      score > bestFallback.score ||
      (Math.abs(score - bestFallback.score) < 0.001 && cols > bestFallback.cols)
    ) {
      bestFallback = candidate;
    }
  }

  if (validCandidates.length > 0) {
    return validCandidates.sort((a, b) => {
      if (b.cols !== a.cols) return b.cols - a.cols;
      return b.cardHeight - a.cardHeight;
    })[0];
  }

  if (bestFallback) {
    return bestFallback;
  }

  return {
    cols: 1,
    rows: count,
    cardWidth: Math.max(120, sectionWidth - cellPadding * 2),
    cardHeight: minCardHeight,
  };
};

const TRIAD_PREP_MIN_CARD_WIDTH = 250;
const TRIAD_PREP_SAFE_CARD_WIDTH = 260;
const TRIAD_PREP_HARD_CARD_WIDTH = 238;
const TRIAD_PREP_MIN_CARD_HEIGHT = 150;
const TRIAD_PREP_SECTION_HEADER_HEIGHT = 40;
const TRIAD_PREP_DUO_ROW_WEIGHT = 0.68;
const DUO_PREP_MIN_CARD_WIDTH = 205;

const getTriadPrepResponsiveMinHeight = (screenHeight: number) =>
  clamp(60, screenHeight * 0.11, TRIAD_PREP_MIN_CARD_HEIGHT);

const getTriadPrepResponsiveMinWidths = (
  screenWidth: number,
  playerType: 'KID' | 'ADULT',
): { safe: number; hard: number } => {
  if (playerType === 'KID') {
    if (screenWidth >= 1100) return { safe: 230, hard: 210 };
    if (screenWidth >= 700) return { safe: 210, hard: 190 };
    return { safe: 180, hard: 170 };
  }
  if (screenWidth >= 1100) return { safe: 230, hard: 210 };
  if (screenWidth >= 700) return { safe: 210, hard: 190 };
  return { safe: 185, hard: 170 };
};

const keepColsWithinMinWidth = (
  sectionWidth: number,
  cols: number,
  cellPadding: number,
  minCardWidth: number,
) => {
  let safeCols = Math.max(1, cols);

  while (safeCols > 1 && sectionWidth / safeCols - cellPadding * 2 < minCardWidth) {
    safeCols -= 1;
  }

  return safeCols;
};

const getResponsiveTriadPrepCols = (
  sectionWidth: number,
  sectionGridHeight: number,
  count: number,
  playerType: 'KID' | 'ADULT',
  cellPadding: number,
  minCardHeight: number = TRIAD_PREP_MIN_CARD_HEIGHT,
  safeMinWidth?: number,
  hardMinWidth?: number,
) => {
  if (count <= 1) return 1;

  const maxCols = Math.min(count, playerType === 'KID' ? 2 : 4);
  const minCardWidth = safeMinWidth ?? (playerType === 'KID' ? TRIAD_PREP_MIN_CARD_WIDTH : TRIAD_PREP_SAFE_CARD_WIDTH);
  const hardMinCardWidth = hardMinWidth ?? (playerType === 'KID' ? TRIAD_PREP_MIN_CARD_WIDTH : TRIAD_PREP_HARD_CARD_WIDTH);
  const availableHeight = Math.max(96, sectionGridHeight);

  // Pass 1: safe widths + height constraint
  for (let cols = maxCols; cols >= 2; cols--) {
    const rows = Math.ceil(count / cols);
    const cardWidth = sectionWidth / cols - cellPadding * 2;
    const cardHeight = availableHeight / rows - cellPadding * 2;

    if (cardWidth >= minCardWidth && cardHeight >= minCardHeight) {
      return cols;
    }
  }

  // Pass 2: hard widths + height constraint
  for (let cols = maxCols; cols >= 2; cols--) {
    const rows = Math.ceil(count / cols);
    const cardWidth = sectionWidth / cols - cellPadding * 2;
    const cardHeight = availableHeight / rows - cellPadding * 2;

    if (cardWidth >= hardMinCardWidth && cardHeight >= minCardHeight) {
      return cols;
    }
  }

  // Pass 3: width-only (ignore height, will scroll if needed)
  for (let cols = maxCols; cols >= 2; cols--) {
    const cardWidth = sectionWidth / cols - cellPadding * 2;
    if (cardWidth >= hardMinCardWidth) return cols;
  }

  return 1;
};

const getFittedFontSize = (
  availableWidth: number,
  availableHeight: number,
  nameLength: number,
  minFont: number,
  maxFont: number,
  widthRatio: number,
  heightRatio: number,
) => {
  const fromWidth = availableWidth / Math.max(3.2, nameLength * widthRatio);
  const fromHeight = availableHeight * heightRatio;
  return clamp(minFont, Math.min(fromWidth, fromHeight), maxFont);
};

const ResponsiveMatchCard = ({
  leftName,
  rightName,
  leftColor,
  rightColor,
  cardWidth,
  cardHeight,
  layout = 'auto',
}: ResponsiveMatchCardProps) => {
  const longestName = Math.max(leftName.length, rightName.length);
  const effectiveCardWidth = Math.max(112, cardWidth - 24);
  const effectiveCardHeight = Math.max(88, cardHeight - 12);
  const stacked =
    layout === 'stacked'
      ? true
      : layout === 'row'
        ? false
        : effectiveCardWidth < 250 || (longestName >= 10 && effectiveCardWidth < 330);

  const horizontalPadding = clamp(10, effectiveCardWidth * 0.04, 18);
  const verticalPadding = clamp(4, effectiveCardHeight * 0.052, 9);
  const vsGap = clamp(4, effectiveCardHeight * 0.04, 8);
  const vsBadgeHeight = clamp(16, effectiveCardHeight * 0.12, 22);
  const slotWidth = stacked
    ? effectiveCardWidth - horizontalPadding * 2
    : (effectiveCardWidth - horizontalPadding * 2 - vsGap) / 2;
  const slotHeight = stacked
    ? Math.max(26, (effectiveCardHeight - verticalPadding * 2 - vsBadgeHeight - vsGap * 2) / 2)
    : effectiveCardHeight - verticalPadding * 2;

  const nameFont = getFittedFontSize(
    Math.max(62, slotWidth - 2),
    slotHeight,
    longestName,
    15,
    stacked ? 40 : 42,
    stacked ? 0.74 : 0.84,
    stacked ? 0.5 : 0.44,
  );
  const vsFont = clamp(8, nameFont * 0.18, 11);
  const slotMinHeight = Math.max(26, slotHeight);
  const nameLineHeight = Math.round(nameFont * 0.96);
  const vsLineHeight = Math.round(vsFont * 1.04);

  return (
    <View style={styles.matchCard}>
      <View style={styles.matchCardAccentRail}>
        <View style={[styles.matchCardAccentSegment, { backgroundColor: leftColor }]} />
        <View style={[styles.matchCardAccentSegment, { backgroundColor: rightColor }]} />
      </View>
      <View
        style={[
          styles.responsiveCardInner,
          stacked ? styles.responsiveCardInnerStacked : styles.responsiveCardInnerRow,
          { paddingHorizontal: horizontalPadding, paddingVertical: verticalPadding, gap: stacked ? 8 : 6 },
        ]}
      >
        <View
          style={[
            styles.responsiveNameSlot,
            styles.responsiveMatchNameSlot,
            stacked && styles.responsiveNameSlotStacked,
            { minHeight: slotMinHeight, height: slotMinHeight },
          ]}
        >
          <Text
            style={[
              styles.responsiveNameText,
              styles.responsiveMatchNameText,
              {
                fontSize: nameFont,
                lineHeight: nameLineHeight,
                color: leftColor,
              },
            ]}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {leftName}
          </Text>
        </View>

        <View style={[styles.responsiveVsBadge, { minHeight: vsBadgeHeight, height: vsBadgeHeight }]}>
          <Text
            style={[
              styles.responsiveVsText,
              {
                fontSize: vsFont,
                lineHeight: vsLineHeight,
              },
            ]}
            numberOfLines={1}
          >
            VS
          </Text>
        </View>

        <View
          style={[
            styles.responsiveNameSlot,
            styles.responsiveMatchNameSlot,
            stacked && styles.responsiveNameSlotStacked,
            { minHeight: slotMinHeight, height: slotMinHeight },
          ]}
        >
          <Text
            style={[
              styles.responsiveNameText,
              styles.responsiveMatchNameText,
              {
                fontSize: nameFont,
                lineHeight: nameLineHeight,
                color: rightColor,
              },
            ]}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {rightName}
          </Text>
        </View>
      </View>
    </View>
  );
};

const ResponsiveMixedPairCard = ({
  leftName,
  rightName,
  leftColor,
  rightColor,
  cardWidth,
  cardHeight,
}: ResponsiveMatchCardProps) => {
  const effectiveCardWidth = Math.max(240, cardWidth - 20);
  const effectiveCardHeight = Math.max(84, cardHeight - 10);
  const horizontalPadding = clamp(16, effectiveCardWidth * 0.035, 28);
  const verticalPadding = clamp(10, effectiveCardHeight * 0.12, 18);
  const vsBadgeWidth = clamp(28, effectiveCardWidth * 0.04, 44);
  const innerGap = clamp(8, effectiveCardWidth * 0.012, 16);
  const slotWidth = Math.max(72, (effectiveCardWidth - horizontalPadding * 2 - vsBadgeWidth - innerGap * 2) / 2);
  const slotHeight = Math.max(28, effectiveCardHeight - verticalPadding * 2);
  const longestName = Math.max(leftName.length, rightName.length);
  const nameFont = getFittedFontSize(
    slotWidth,
    slotHeight,
    longestName,
    18,
    52,
    0.78,
    0.62,
  );
  const vsFont = clamp(9, nameFont * 0.2, 14);

  return (
    <View style={styles.matchCard}>
      <View style={styles.matchCardAccentRail}>
        <View style={[styles.matchCardAccentSegment, { backgroundColor: leftColor }]} />
        <View style={[styles.matchCardAccentSegment, { backgroundColor: rightColor }]} />
      </View>
      <View
        style={[
          styles.mixedPairCardInner,
          {
            paddingHorizontal: horizontalPadding,
            paddingVertical: verticalPadding,
            gap: innerGap,
          },
        ]}
      >
        <View style={styles.mixedPairNameSlot}>
          <Text
            style={[
              styles.mixedPairNameText,
              {
                fontSize: nameFont,
                lineHeight: Math.round(nameFont * 1.02),
                color: leftColor,
              },
            ]}
            adjustsFontSizeToFit
            minimumFontScale={0.35}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {leftName}
          </Text>
        </View>

        <View style={[styles.responsiveVsBadge, styles.mixedPairVsBadge, { minWidth: vsBadgeWidth }]}>
          <Text
            style={[
              styles.responsiveVsText,
              styles.mixedPairVsText,
              {
                fontSize: vsFont,
                lineHeight: Math.round(vsFont * 1.05),
              },
            ]}
            numberOfLines={1}
          >
            VS
          </Text>
        </View>

        <View style={styles.mixedPairNameSlot}>
          <Text
            style={[
              styles.mixedPairNameText,
              {
                fontSize: nameFont,
                lineHeight: Math.round(nameFont * 1.02),
                color: rightColor,
              },
            ]}
            adjustsFontSizeToFit
            minimumFontScale={0.35}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {rightName}
          </Text>
        </View>
      </View>
    </View>
  );
};

type ResponsiveTriadPrepCardProps = {
  leftRole: string;
  leftName: string;
  leftRoleColor: string;
  leftNameColor: string;
  rightRole: string;
  rightName: string;
  rightRoleColor: string;
  rightNameColor: string;
  restRole?: string;
  restName?: string;
  restRoleColor?: string;
  restNameColor?: string;
  cardWidth: number;
  cardHeight: number;
  reserveRestSpace?: boolean;
  showRoles?: boolean;
};

const ResponsiveTriadPrepCard = ({
  leftRole,
  leftName,
  leftRoleColor,
  leftNameColor,
  rightRole,
  rightName,
  rightRoleColor,
  rightNameColor,
  restRole,
  restName,
  restRoleColor,
  restNameColor,
  cardWidth,
  cardHeight,
  reserveRestSpace = true,
  showRoles = true,
}: ResponsiveTriadPrepCardProps) => {
  const hasRestRole = Boolean(restRole);
  const hasRestPlayer = Boolean(restRole && restName);
  const hasRestArea = hasRestRole || reserveRestSpace;
  const isDuoCard = !hasRestArea;
  const effectiveRestRoleColor = restRoleColor ?? COLORS.accentAlert;
  const effectiveRestNameColor = restNameColor ?? COLORS.textPrimary;
  const effectiveCardWidth = Math.max(132, cardWidth - 14);
  const effectiveCardHeight = Math.max(72, cardHeight);
  const horizontalPadding = clamp(9, effectiveCardWidth * 0.038, 15);
  const verticalPadding = clamp(5, effectiveCardHeight * 0.038, 10);
  const rowGap = clamp(2, effectiveCardHeight * 0.02, 7);
  // Ensure fight area gets at least 55% of the remaining card height.
  // Rest area scales down aggressively on very small cards.
  const innerHeight = Math.max(40, effectiveCardHeight - verticalPadding * 2);
  const maxRestFraction = effectiveCardHeight < 120 ? 0.40 : 0.46;
  const maxRestBudget = innerHeight * maxRestFraction;
  const rawRestHeadingHeight = hasRestArea ? clamp(9, effectiveCardHeight * 0.055, 16) : 0;
  const rawRestBoxHeight = hasRestArea ? clamp(30, effectiveCardHeight * 0.22, 58) : 0;
  const rawRestTotal = rawRestHeadingHeight + rawRestBoxHeight + rowGap * 2;
  const restScale = hasRestArea && rawRestTotal > maxRestBudget ? maxRestBudget / rawRestTotal : 1;
  const restHeadingHeight = hasRestArea ? Math.round(rawRestHeadingHeight * restScale) : 0;
  const restBoxHeight = hasRestArea ? Math.round(rawRestBoxHeight * restScale) : 0;
  const reservedRestHeight = hasRestArea ? rowGap * 2 + restHeadingHeight + restBoxHeight : 0;
  const estimatedFightBoxHeight = Math.max(
    hasRestArea ? 36 : 62,
    effectiveCardHeight - verticalPadding * 2 - reservedRestHeight,
  );
  const contentWidth = Math.max(104, effectiveCardWidth - horizontalPadding * 2);
  const fightRowGap = clamp(2, estimatedFightBoxHeight * 0.03, 6);
  const vsLineHeight = clamp(9, estimatedFightBoxHeight * 0.14, 18);
  const fighterRowHeight = Math.max(
    18,
    (estimatedFightBoxHeight - vsLineHeight - fightRowGap * 2) / 2,
  );
  const rolePillWidth = showRoles
    ? (isDuoCard
        ? clamp(30, contentWidth * 0.12, 44)
        : clamp(34, contentWidth * 0.135, 50))
    : 0;
  const nameClusterGap = showRoles ? (isDuoCard ? 3 : 5) : 0;
  const fighterNameWidth = Math.max(68, contentWidth - rolePillWidth - (showRoles ? (isDuoCard ? 8 : 12) : 0));
  const restNameWidth = Math.max(76, contentWidth - rolePillWidth - (showRoles ? 12 : 0));
  const roleLineFont = showRoles
    ? clamp(10, Math.min(fighterRowHeight * 0.34, rolePillWidth * 0.28), 14)
    : 0;
  const fighterNameHeight = Math.max(20, fighterRowHeight - 2);
  const fighterMaxFont = hasRestArea
    ? clamp(27, effectiveCardWidth * 0.103, 31)
    : clamp(24, effectiveCardWidth * 0.094, 28);
  const getFighterNameFont = (name: string) => getFittedFontSize(
    fighterNameWidth,
    fighterNameHeight,
    name.length,
    15,
    fighterMaxFont,
    0.76,
    0.92,
  );
  const webNoWrapText = Platform.OS === 'web'
    ? ({ whiteSpace: 'nowrap', wordBreak: 'keep-all', overflowWrap: 'normal' } as any)
    : null;
  const vsFont = isDuoCard
    ? clamp(9, vsLineHeight * 0.82, 13)
    : clamp(8, vsLineHeight * 0.72, 12);
  const restHeadingFont = hasRestArea ? clamp(10, restHeadingHeight * 0.85, 20) : 0;
  const restRoleFont = hasRestRole ? clamp(10, Math.min(restBoxHeight * 0.34, rolePillWidth * 0.28), 14) : 0;
  // restBox has paddingVertical:2 → inner height = restBoxHeight - 4
  const restNameHeight = Math.max(20, restBoxHeight - 4);
  const restFont = clamp(
    13,
    getFittedFontSize(
      restNameWidth,
      restNameHeight,
      restName?.length ?? 0,
      13,
      30,
      0.60,
      0.88,
    ),
    30,
  );

  const renderRolePill = (role: string, roleColor: string, roleFont: number) => {
    if (!showRoles) return null;
    const roleAccent = getTriadRoleAccent(role, roleColor);

    return (
      <Text
        style={[
          styles.triadPrepRoleBlock,
          {
            width: rolePillWidth,
            fontSize: roleFont,
            lineHeight: Math.round(roleFont * 1.08),
            color: roleAccent,
            borderColor: withAlpha(roleAccent, 0.34),
            backgroundColor: withAlpha(roleAccent, 0.08),
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {role}
      </Text>
    );
  };

  const renderFighter = (
    role: string,
    name: string,
    roleColor: string,
    nameColor: string,
  ) => {
    const fighterNameFont = getFighterNameFont(name);

    return (
      <View style={[styles.triadPrepFightRow, { minHeight: fighterRowHeight }]}>
        {showRoles && renderRolePill(role, roleColor, roleLineFont)}
        <Text
          style={[
            styles.triadPrepFightName,
            webNoWrapText,
            {
              flex: 1,
              minWidth: 0,
              fontSize: fighterNameFont,
              lineHeight: Math.round(fighterNameFont * 1.04),
              color: nameColor,
            },
          ]}
          adjustsFontSizeToFit
          minimumFontScale={0.05}
          numberOfLines={Platform.OS === 'web' ? undefined : 1}
          ellipsizeMode={Platform.OS === 'web' ? undefined : 'clip'}
        >
          {name}
        </Text>
        {showRoles && <View style={{ width: rolePillWidth }} />}
      </View>
    );
  };

  const renderRest = () => {
    if (!hasRestArea) return null;

    if (!hasRestRole) {
      return <View style={{ height: restHeadingHeight + rowGap + restBoxHeight }} />;
    }

    return (
      <>
        <View style={[styles.triadPrepRestHeading, { height: restHeadingHeight }]}>
          <View style={styles.triadPrepRestHeadingLine} />
          <Text
            style={[
              styles.triadPrepRestHeadingText,
              {
                fontSize: restHeadingFont,
                lineHeight: Math.round(restHeadingFont * 1.08),
              },
            ]}
          >
            ODPOCZYWA
          </Text>
          <View style={styles.triadPrepRestHeadingLine} />
        </View>
        <View
          style={[
            styles.triadPrepRestBox,
            {
              height: restBoxHeight,
              paddingVertical: 2,
              borderColor: withAlpha(COLORS.textPrimary, 0.12),
            },
          ]}
        >
          {showRoles && renderRolePill(restRole ?? '', effectiveRestRoleColor, restRoleFont)}
          {hasRestPlayer && (
            <Text
              style={[
                styles.triadPrepRestNameInline,
                webNoWrapText,
                {
                  flex: 1,
                  minWidth: 0,
                  fontSize: restFont,
                  lineHeight: Math.round(restFont * 1.08),
                  color: effectiveRestNameColor,
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {restName}
            </Text>
          )}
          {showRoles && <View style={{ width: rolePillWidth }} />}
        </View>
      </>
    );
  };

  const activeFighters = [
    { role: leftRole, name: leftName, roleColor: leftRoleColor, nameColor: leftNameColor },
    { role: rightRole, name: rightName, roleColor: rightRoleColor, nameColor: rightNameColor },
  ].sort((a, b) => getTriadRoleOrder(a.role) - getTriadRoleOrder(b.role));

  return (
    <View style={styles.matchCard}>
      <View style={styles.matchCardAccentRail}>
        <View style={[styles.matchCardAccentSegment, { backgroundColor: leftNameColor }]} />
        <View style={[styles.matchCardAccentSegment, { backgroundColor: rightNameColor }]} />
        {hasRestPlayer && <View style={[styles.matchCardAccentSegment, { backgroundColor: effectiveRestNameColor }]} />}
      </View>
      <View
        style={[
          styles.triadPrepCardInner,
          {
            paddingHorizontal: horizontalPadding,
            paddingVertical: verticalPadding,
            gap: rowGap,
          },
        ]}
      >
        <View
          style={[
            styles.triadPrepFightBox,
            {
              flex: 1,
              minHeight: 0,
              borderColor: withAlpha(COLORS.textPrimary, 0.12),
            },
          ]}
        >
          {renderFighter(
            activeFighters[0].role,
            activeFighters[0].name,
            activeFighters[0].roleColor,
            activeFighters[0].nameColor,
          )}

          <View style={[styles.triadPrepVsDivider, { minHeight: vsLineHeight }]}>
            <View style={styles.triadPrepVsLine} />
            <Text style={[styles.triadPrepVsText, { fontSize: vsFont, lineHeight: Math.round(vsLineHeight * 0.9) }]}>VS</Text>
            <View style={styles.triadPrepVsLine} />
          </View>

          {renderFighter(
            activeFighters[1].role,
            activeFighters[1].name,
            activeFighters[1].roleColor,
            activeFighters[1].nameColor,
          )}
        </View>

        {renderRest()}
      </View>
    </View>
  );
};

export default function App() {
  useKeepAwake();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [zadaniowkiMainLayout, setZadaniowkiMainLayout] = useState({ width: 0, height: 0 });
  const [pairsMainLayout, setPairsMainLayout] = useState({ width: 0, height: 0 });

  const [currentScreen, setCurrentScreen] = useState('settings'); 
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isActive, setIsActive] = useState(false); 
  const [phase, setPhase] = useState('PREP'); 
  const [currentRound, setCurrentRound] = useState(1); 
  
  const [trainingMode, setTrainingMode] = useState<'SPARING' | 'ZADANIOWKI'>('SPARING');
  const [zadaniowkiType, setZadaniowkiType] = useState<'TRÓJKI' | 'DWÓJKI'>('TRÓJKI');
  
  const [zadaniowkiGroups, setZadaniowkiGroups] = useState<RealPlayer[][]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  const [roster, setRoster] = useState<RealPlayer[]>([]);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newType, setNewType] = useState<'ADULT'|'KID'>('ADULT'); 
  const [newGear, setNewGear] = useState<'GI'|'NO'>('NO'); 
  const [newSkillLevel, setNewSkillLevel] = useState<AdultSkillLevel>(DEFAULT_ADULT_SKILL_LEVEL); 
  
  const [savedPlayersDB, setSavedPlayersDB] = useState<RealPlayer[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<RealPlayer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [rosterFilterType, setRosterFilterType] = useState<'KID' | 'ADULT' | null>(null);
  const [rosterFilterGear, setRosterFilterGear] = useState<'GI' | 'NO' | null>(null);
  const [rosterFilterSkill, setRosterFilterSkill] = useState<AdultSkillLevel | null>(null);

  const [roundTime, setRoundTime] = useState('6'); 
  const [prepTime, setPrepTime] = useState('60'); 
  const [restTime, setRestTime] = useState('75');   
  const [roundsTotal, setRoundsTotal] = useState('5'); 

  // Sanitize numeric inputs: roundTime allows decimals, others integer-only
  const handleSetRoundTime = (v: string) => setRoundTime(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'));
  const handleSetPrepTime = (v: string) => setPrepTime(v.replace(/[^0-9]/g, ''));
  const handleSetRestTime = (v: string) => setRestTime(v.replace(/[^0-9]/g, ''));
  const handleSetRoundsTotal = (v: string) => setRoundsTotal(v.replace(/[^0-9]/g, ''));

  const [activePlayers, setActivePlayers] = useState<RealPlayer[]>([]);
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const [currentResting, setCurrentResting] = useState<RealPlayer[]>([]);
  const [isDropoutModalVisible, setIsDropoutModalVisible] = useState(false);
  const [selectedDropoutPlayerIds, setSelectedDropoutPlayerIds] = useState<string[]>([]);

  const [noRestPlayers, setNoRestPlayers] = useState<string[]>([]);
  const [isVipModalVisible, setIsVipModalVisible] = useState(false);
  const [isAboutModalVisible, setIsAboutModalVisible] = useState(false);
  const [isDevMetricsVisible, setIsDevMetricsVisible] = useState(false);
  const [devMetricsSections, setDevMetricsSections] = useState<{ title: string; lines: string[] }[]>([]);

  const historyRef = useRef<Map<string, HistoryRecord>>(new Map());
  const currentMatchesRef = useRef<Match[]>([]);
  const currentRestingRef = useRef<RealPlayer[]>([]);
  const activePlayersRef = useRef<RealPlayer[]>([]);
  const noRestPlayersRef = useRef<string[]>([]);
  const soundsRef = useRef<any>({});
  const audioDuckHoldRef = useRef<Audio.Sound | null>(null);
  const tenSecSoundFiredRef = useRef(false);
  const dropoutShouldResumeRef = useRef(false);
  
  const devModeClickCount = useRef(0);

  const updateCurrentResting = useCallback((resting: RealPlayer[]) => {
    currentRestingRef.current = resting;
    setCurrentResting(resting);
  }, []);

  useEffect(() => {
    noRestPlayersRef.current = noRestPlayers;
  }, [noRestPlayers]);

  const showInfo = (title: string, message?: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
      return;
    }

    if (message) {
      Alert.alert(title, message);
    } else {
      Alert.alert(title);
    }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel: string = 'Wyczyść') => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) onConfirm();
      return;
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: confirmLabel,
          style: 'destructive',
          onPress: onConfirm,
        },
      ]
    );
  };

  const handleZadaniowkiMainLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setZadaniowkiMainLayout(current => {
      const widthChanged = Math.abs(current.width - width) >= 1;
      const heightChanged = Math.abs(current.height - height) >= 1;

      return widthChanged || heightChanged ? { width, height } : current;
    });
  }, []);

  const handlePairsMainLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setPairsMainLayout(current => {
      const widthChanged = Math.abs(current.width - width) >= 1;
      const heightChanged = Math.abs(current.height - height) >= 1;

      return widthChanged || heightChanged ? { width, height } : current;
    });
  }, []);

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const [storedDB, storedSkillLevelSchemaVersion] = await Promise.all([
          AsyncStorage.getItem(PLAYERS_DB_KEY),
          AsyncStorage.getItem(SKILL_LEVEL_SCHEMA_KEY),
        ]);

        if (storedDB) {
          const parsedPlayers = JSON.parse(storedDB);
          const requiresLegacySkillMigration =
            storedSkillLevelSchemaVersion !== SKILL_LEVEL_SCHEMA_VERSION;

          const normalizedPlayers = parsedPlayers
            .filter((p: any) => p.type !== 'DUMMY')
            .map((p: RealPlayer) => normalizeStoredPlayer(p, requiresLegacySkillMigration));

          setSavedPlayersDB(normalizedPlayers);

          if (requiresLegacySkillMigration) {
            await AsyncStorage.setItem(PLAYERS_DB_KEY, JSON.stringify(normalizedPlayers));
            await AsyncStorage.setItem(SKILL_LEVEL_SCHEMA_KEY, SKILL_LEVEL_SCHEMA_VERSION);
          }
        } else if (storedSkillLevelSchemaVersion !== SKILL_LEVEL_SCHEMA_VERSION) {
          await AsyncStorage.setItem(SKILL_LEVEL_SCHEMA_KEY, SKILL_LEVEL_SCHEMA_VERSION);
        }
      } catch (e) {
        console.log("Błąd ładowania bazy", e);
      }
    };
    loadDatabase();
  }, []);

  // Set audio mode globally on mount so ducking works from the start
  useEffect(() => {
    ensureAudioFocus();
  }, []);

  const initAudio = async () => {
    try {
      await ensureAudioFocus();
      const { sound: bell } = await Audio.Sound.createAsync(BELL_SOUND, { volume: 1 });
      const { sound: beep } = await Audio.Sound.createAsync(BEEP_SOUND, { volume: 1 });
      const { sound: klaps } = await Audio.Sound.createAsync(KLAPS_SOUND, { volume: 1 });
      const { sound: finish } = await Audio.Sound.createAsync(FINISH_SOUND, { volume: 0.96 });
      soundsRef.current = { bell, warning: beep, tenSec: klaps, finish };
    } catch {}
  };

  useEffect(() => {
      return () => {
          if (soundsRef.current.bell) soundsRef.current.bell.unloadAsync();
          if (soundsRef.current.warning) soundsRef.current.warning.unloadAsync();
          if (soundsRef.current.tenSec) soundsRef.current.tenSec.unloadAsync();
          if (soundsRef.current.finish) soundsRef.current.finish.unloadAsync();
          if (audioDuckHoldRef.current) { audioDuckHoldRef.current.stopAsync(); audioDuckHoldRef.current.unloadAsync(); }
      }
  }, []);

  const playSound = useCallback(async (type: 'start' | 'end' | 'warning' | 'tenSeconds' | 'finish') => {
    try {
      await ensureAudioFocus();
      let s;
      if (type === 'start' || type === 'end') s = soundsRef.current.bell;
      else if (type === 'warning') s = soundsRef.current.warning;
      else if (type === 'tenSeconds') s = soundsRef.current.tenSec;
      else if (type === 'finish') s = soundsRef.current.finish;
      if (s) {
        await s.setPositionAsync(0);
        await s.replayAsync(); 
        if (type === 'tenSeconds') setTimeout(async () => {
          try {
            await ensureAudioFocus();
            await s.setPositionAsync(0);
            await s.replayAsync();
          } catch {}
        }, 180);
      }
    } catch {}
  }, []);

  const activateAudioDuck = useCallback(async () => {
    try {
      if (audioDuckHoldRef.current) return;
      await ensureAudioFocus();
      const { sound } = await Audio.Sound.createAsync(KLAPS_SOUND, {
        isLooping: true,
        volume: 0,
      });
      audioDuckHoldRef.current = sound;
      await sound.playAsync();
    } catch {}
  }, []);

  const deactivateAudioDuck = useCallback(async () => {
    try {
      const hold = audioDuckHoldRef.current;
      if (hold) {
        audioDuckHoldRef.current = null;
        await hold.stopAsync();
        await hold.unloadAsync();
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isActive) {
      deactivateAudioDuck();
      return;
    }

    if (timeLeft > 0) {
      // Activate audio ducking ~12s before phase end to lower background music for countdown
      if (timeLeft <= 12) {
        activateAudioDuck();
      } else if (timeLeft > 15) {
        // New phase with long timer — release duck from previous countdown
        deactivateAudioDuck();
      }

      // Reset 10-second guard when timer moves past 10 (new phase started)
      if (timeLeft > 10) {
        tenSecSoundFiredRef.current = false;
      }

      if (timeLeft <= 3) playSound('warning');
      else if (timeLeft === 10 && (phase === 'WORK' || phase === 'PREP') && !tenSecSoundFiredRef.current) {
        tenSecSoundFiredRef.current = true;
        playSound('tenSeconds');
      }
    }
  }, [timeLeft, isActive, phase, playSound, activateAudioDuck, deactivateAudioDuck]);

  const handleNameChange = (text: string) => {
    setNewName(text);
    if (text.trim().length > 0) {
      const matches = savedPlayersDB.filter(p => p.id.toLowerCase().startsWith(text.toLowerCase()));
      setFilteredSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (player: RealPlayer) => {
    setNewName(player.id);
    setNewWeight(player.weight.toString());
    setNewType(player.type);
    setNewGear(player.gear);
    const selectedSkillLevel = getNormalizedPlayerSkillLevel(player);
    if (selectedSkillLevel !== 0) setNewSkillLevel(selectedSkillLevel);
    setShowSuggestions(false);
  };

  const handleEditPlayer = (p: RealPlayer) => {
    setNewName(p.id);
    setNewWeight(p.weight.toString());
    setNewType(p.type);
    setNewGear(p.gear);
    const selectedSkillLevel = getNormalizedPlayerSkillLevel(p);
    if (selectedSkillLevel !== 0) setNewSkillLevel(selectedSkillLevel);
    setEditingPlayerId(p.id);
  };

  const handleAddPlayer = async () => {
    if (!newName.trim()) return showInfo("Podaj pseudonim zawodnika!");
    if (!newWeight.trim() || isNaN(Number(newWeight))) return showInfo("Podaj prawidłową wagę!");
    
    if (!editingPlayerId && roster.find(p => p.id.toLowerCase() === newName.trim().toLowerCase())) return showInfo("Zawodnik już dodany!");

    const newPlayer: RealPlayer = {
        id: newName.trim().toUpperCase(),
        type: newType,
        gear: newGear,
        weight: parseFloat(newWeight),
        skillLevel: newType === 'ADULT' ? newSkillLevel : 0,
        restDebt: 0,
        lastRestRound: 0,
        consecutiveMatches: 0,
        helpedKidCount: 0,
        mismatchDebt: 0
    };

    let updatedRoster = [...roster];
    let updatedDB = [...savedPlayersDB];

    if (editingPlayerId) {
        const rosterIdx = updatedRoster.findIndex(p => p.id === editingPlayerId);
        if (rosterIdx >= 0) updatedRoster[rosterIdx] = newPlayer;
        
        const dbIdx = updatedDB.findIndex(p => p.id === editingPlayerId);
        if (dbIdx >= 0) {
            updatedDB[dbIdx] = newPlayer;
        } else {
            const newNameDbIdx = updatedDB.findIndex(p => p.id === newPlayer.id);
            if (newNameDbIdx >= 0) updatedDB[newNameDbIdx] = newPlayer;
            else updatedDB.push(newPlayer);
        }
        setEditingPlayerId(null);
    } else {
        updatedRoster.push(newPlayer);
        const existingDbIndex = updatedDB.findIndex(p => p.id === newPlayer.id);
        if (existingDbIndex >= 0) updatedDB[existingDbIndex] = newPlayer; 
        else updatedDB.push(newPlayer); 
    }

    setRoster(updatedRoster);
    setSavedPlayersDB(updatedDB);
    try {
      await AsyncStorage.setItem(PLAYERS_DB_KEY, JSON.stringify(updatedDB));
      await AsyncStorage.setItem(SKILL_LEVEL_SCHEMA_KEY, SKILL_LEVEL_SCHEMA_VERSION);
    } catch {}
    
    setNewName(''); 
    setShowSuggestions(false);
  };

  const handleRemoveFromRoster = (id: string) => {
    const player = roster.find(p => p.id === id);
    const playerName = player ? player.id : id;
    showConfirm(
      'Usuń zawodnika',
      `Czy na pewno chcesz usunąć ${playerName} z maty?`,
      () => {
        setRoster(roster.filter(p => p.id !== id));
        setNoRestPlayers(noRestPlayers.filter(pid => pid !== id));
        if (editingPlayerId === id) {
          setEditingPlayerId(null);
          setNewName('');
        }
      },
      'Usuń'
    );
  };

  const handleClearRoster = () => {
    showConfirm("Nowy Trening", "Czy na pewno chcesz wyczyścić matę z zawodników?", () => {
        setRoster([]);
        setNoRestPlayers([]);
        setEditingPlayerId(null);
        setNewName('');
    });
  };

  const handleSecretDevMode = () => {
    const testPlayers: RealPlayer[] = [
        { id: "GOSIA", type: "ADULT", weight: 66, skillLevel: 4, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "HANIA", type: "ADULT", weight: 51, skillLevel: 1, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "SITO", type: "ADULT", weight: 98, skillLevel: 4, gear: "GI", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "ROMEK", type: "ADULT", weight: 75, skillLevel: 2, gear: "GI", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "TOMEK", type: "ADULT", weight: 60, skillLevel: 3, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "WERKA", type: "ADULT", weight: 69, skillLevel: 3, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "SZYMON", type: "ADULT", weight: 92, skillLevel: 4, gear: "GI", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "SZYMONEK", type: "ADULT", weight: 67, skillLevel: 4, gear: "GI", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "MATEUSZ", type: "ADULT", weight: 50, skillLevel: 2, gear: "GI", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "LEGNICA", type: "ADULT", weight: 100, skillLevel: 4, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "KOPALNIAK", type: "ADULT", weight: 92, skillLevel: 4, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "WIKTOR", type: "ADULT", weight: 82, skillLevel: 1, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "LOCZEK", type: "KID", weight: 38, skillLevel: 0, gear: "GI", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "JOZEK", type: "KID", weight: 50, skillLevel: 0, gear: "GI", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "MARCEL", type: "ADULT", weight: 55, skillLevel: 3, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "ANDRZEJ", type: "ADULT", weight: 70, skillLevel: 2, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "KEDZIOLEK", type: "KID", weight: 43, skillLevel: 0, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "DZIADEK", type: "ADULT", weight: 92, skillLevel: 4, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "GACEK", type: "KID", weight: 47, skillLevel: 0, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "PEJA", type: "ADULT", weight: 66, skillLevel: 3, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "NAZAR", type: "ADULT", weight: 83, skillLevel: 1, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "OLEK", type: "ADULT", weight: 65, skillLevel: 1, gear: "GI", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "WOJTEK", type: "ADULT", weight: 98, skillLevel: 4, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "MAX", type: "KID", weight: 48, skillLevel: 0, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "FABIAN", type: "KID", weight: 46, skillLevel: 0, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 },
        { id: "KACPER", type: "KID", weight: 63, skillLevel: 0, gear: "NO", restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0 }
    ];

    setRoster(testPlayers);
    showInfo("Dev Mode Aktywny", "Wgrano 26 zawodników z bazy testowej.");
  };

  const handleDevModeTrigger = () => {
    devModeClickCount.current += 1;
    setTimeout(() => { devModeClickCount.current = 0; }, 2000);
    if (devModeClickCount.current >= 5) {
        devModeClickCount.current = 0;
        handleSecretDevMode();
    }
  };

  const handleShowDeviceMetrics = () => {
    const screenMetrics = Dimensions.get('screen');
    const windowMetrics = Dimensions.get('window');
    const smallestSide = Math.min(screenWidth, screenHeight);
    const largestSide = Math.max(screenWidth, screenHeight);
    const orientation = screenWidth > screenHeight ? 'LANDSCAPE' : 'PORTRAIT';
    const density = getResponsiveDensity(screenWidth, screenHeight);
    const layoutMode = shouldSplitSettingsLayout ? 'podzielony (2 kolumny)' : 'ułożony pionowo';
    const pxRatio = PixelRatio.get();
    const fontScale = PixelRatio.getFontScale();
    const physicalW = Math.round(screenWidth * pxRatio);
    const physicalH = Math.round(screenHeight * pxRatio);
    const screenPhysicalW = Math.round(screenMetrics.width * pxRatio);
    const screenPhysicalH = Math.round(screenMetrics.height * pxRatio);
    const aspectRatio = (largestSide / smallestSide).toFixed(2);

    const topM = getTopBarMetrics(screenWidth, screenHeight);
    const bottomM = getBottomBarMetrics(screenWidth, screenHeight);

    const forceNoScroll = screenWidth >= 1100;
    const splitThreshold = screenWidth >= 920;
    const estRightCol = screenWidth - 10 * 2 - (screenWidth >= 1000 && screenHeight <= 900 ? 12 : 15) - clamp(360, screenWidth * 0.32, 440);
    const rightColOk = estRightCol >= 700;

    const webUA = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const webDPR = Platform.OS === 'web' && typeof window !== 'undefined' ? (window.devicePixelRatio ?? '?') : '';
    const webInnerSize = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.innerWidth} x ${window.innerHeight}`
      : '';
    const webOuterSize = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.outerWidth} x ${window.outerHeight}`
      : '';

    const sections: { title: string; lines: string[] }[] = [
      {
        title: 'EKRAN',
        lines: [
          `Hook: ${Math.round(screenWidth)}×${Math.round(screenHeight)}`,
          `Window: ${Math.round(windowMetrics.width)}×${Math.round(windowMetrics.height)}`,
          `Screen: ${Math.round(screenMetrics.width)}×${Math.round(screenMetrics.height)}`,
          `PX okna: ${physicalW}×${physicalH}`,
          `PX ekranu: ${screenPhysicalW}×${screenPhysicalH}`,
          `${orientation}  ${aspectRatio}:1`,
          `min=${Math.round(smallestSide)} max=${Math.round(largestSide)}`,
          `pxRatio: ${pxRatio.toFixed(2)}`,
          `fontScale: ${fontScale.toFixed(2)}`,
          `${Platform.OS} v${Platform.Version ?? '?'}`,
        ],
      },
      {
        title: 'RESPONSYWNOŚĆ',
        lines: [
          `DENSITY: ${density.toUpperCase()}`,
          `large ≥1500×850: ${screenWidth >= 1500 ? '✓' : '✗'}w ${screenHeight >= 850 ? '✓' : '✗'}h`,
          `medium ≥1150×720: ${screenWidth >= 1150 ? '✓' : '✗'}w ${screenHeight >= 720 ? '✓' : '✗'}h`,
          `NO-SCROLL ≥1100: ${forceNoScroll ? 'TAK' : 'NIE'}`,
          `PHONE <760: ${screenWidth < 760 ? 'TAK' : 'NIE'}`,
          `WIDE ≥1180: ${screenWidth >= 1180 ? 'TAK' : 'NIE'}`,
          `SPLIT ≥920&r≥700: ${shouldSplitSettingsLayout ? 'TAK' : 'NIE'}`,
          `  w≥920:${splitThreshold ? '✓' : '✗'} r≥700:${rightColOk ? '✓' : `✗(${Math.round(estRightCol)})`}`,
        ],
      },
      {
        title: 'UKŁAD SETTINGS',
        lines: [
          `${layoutMode}`,
          `PANEL: ${Math.round(settingsPanelWidth)} dp`,
          `LEWA: ${Math.round(tabletLeftColumnWidth)} dp`,
          `PRAWA: ${Math.round(rosterAvailableWidth)} dp`,
          `ROSTER KOL: ${rosterGridColumns}`,
          `COMPACT: ${isCompactSettingsUI ? 'TAK' : 'NIE'}`,
          `  h≤900:${isTabletCompactSettings ? '✓' : '✗'} p≤440:${settingsPanelWidth <= 440 ? '✓' : '✗'} f>1.2:${fontScale > 1.2 ? '✓' : '✗'}`,
          `STACK ROWS: ${stackSettingsActionRows ? 'TAK' : 'NIE'}`,
          `STACK TIME: ${stackTimeCards ? 'TAK' : 'NIE'}`,
        ],
      },
      {
        title: 'BARS + GRID',
        lines: [
          `TOP H: ${topM.estimatedHeight}`,
          `  pV=${topM.paddingVertical} rnd=${Math.round(topM.roundFont)} phs=${Math.round(topM.phaseFont)} tmr=${Math.round(topM.timerFont)}`,
          `BTM H: ${bottomM.estimatedHeight}`,
          `  pV=${bottomM.buttonPaddingVertical} btn=${bottomM.buttonFont} wrap=${bottomM.wrap ? 'T' : 'F'}`,
          `COMPACT ≥900: ${screenWidth >= 900 ? 'T' : 'F'}`,
          `EKRAN: ${currentScreen}`,
          `PAIRS: ${Math.round(pairsMainLayout.width)}×${Math.round(pairsMainLayout.height)}`,
          `ZADAN: ${Math.round(zadaniowkiMainLayout.width)}×${Math.round(zadaniowkiMainLayout.height)}`,
        ],
      },
    ];

    if (Platform.OS === 'web') {
      sections.push({
        title: 'WEB',
        lines: [
          `DPR: ${webDPR}`,
          `INNER: ${webInnerSize}`,
          `OUTER: ${webOuterSize}`,
          `UA: ${webUA}`,
        ],
      });
    }

    setDevMetricsSections(sections);
    setIsDevMetricsVisible(true);
  };

  const toggleNoRest = (playerId: string) => {
    if (noRestPlayers.includes(playerId)) setNoRestPlayers(noRestPlayers.filter(id => id !== playerId));
    else setNoRestPlayers([...noRestPlayers, playerId]);
  };

  const handleStartTraining = async () => {
    if (roster.length < 2) return showInfo("Musisz dodać przynajmniej dwóch zawodników!");
    
    const rt = parseFloat(roundTime);
    const pt = parseInt(prepTime, 10);
    const rst = parseInt(restTime, 10);
    const rds = parseInt(roundsTotal, 10);
    if (!rt || rt <= 0) return showInfo("Czas rundy musi być większy od 0!");
    if (!pt || pt <= 0) return showInfo("Czas przygotowania musi być większy od 0!");
    if (!rst || rst <= 0) return showInfo("Czas przerwy musi być większy od 0!");
    if (!rds || rds <= 0) return showInfo("Liczba rund musi być większa od 0!");
    
    await initAudio();

    let freshRoster = roster.map(p => ({...p, restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0}));
    setActivePlayers(freshRoster);
    activePlayersRef.current = freshRoster;
    setCurrentRound(1);
    setCurrentStep(1);
    
    if (trainingMode === 'ZADANIOWKI') {
        if (zadaniowkiType === 'TRÓJKI') {
            setZadaniowkiGroups(buildTriadZadaniowkiGroups(freshRoster));
        } else {
            historyRef.current.clear(); 
            const { matches, resting } = generateRound(freshRoster, historyRef.current, 1, noRestPlayers);
            setCurrentMatches(matches);
            currentMatchesRef.current = matches;
            updateCurrentResting(resting);
        }
        setCurrentScreen('zadaniowki_timer');
        setPhase('PREP');
        setTimeLeft(Math.floor(parseFloat(prepTime)));
        setIsActive(true);
    } else {
        historyRef.current.clear(); 
        setCurrentScreen('timer');
        setPhase('PREP');
        setTimeLeft(Math.floor(parseFloat(prepTime))); 
        setIsActive(true);

        const { matches, resting } = generateRound(freshRoster, historyRef.current, 1, noRestPlayers);
        setCurrentMatches(matches);
        currentMatchesRef.current = matches;
        updateCurrentResting(resting);
    }
  };

  const handleStopTraining = () => {
    setIsActive(false);
    setCurrentScreen('settings');
  };

  const handleOpenDropoutModal = () => {
    dropoutShouldResumeRef.current = isActive;
    setIsActive(false);
    setSelectedDropoutPlayerIds([]);
    setIsDropoutModalVisible(true);
  };

  const handleCloseDropoutModal = () => {
    const shouldResume = dropoutShouldResumeRef.current;
    dropoutShouldResumeRef.current = false;
    setIsDropoutModalVisible(false);
    setSelectedDropoutPlayerIds([]);
    if (shouldResume) {
      setIsActive(true);
    }
  };

  const handleRemovePlayersFromTraining = (playerIds: string[]) => {
    if (playerIds.length === 0) return;

    const removedPlayerIds = new Set(playerIds);
    const updatedPlayers = activePlayersRef.current.filter(p => !removedPlayerIds.has(p.id));
    setActivePlayers(updatedPlayers);
    activePlayersRef.current = updatedPlayers;

    if (trainingMode === 'ZADANIOWKI') {
        if (zadaniowkiType === 'TRÓJKI') {
            setZadaniowkiGroups(buildTriadZadaniowkiGroups(updatedPlayers));
        } else {
            const { matches, resting } = generateRound(updatedPlayers, historyRef.current, currentRound, noRestPlayers);
            setCurrentMatches(matches);
            currentMatchesRef.current = matches;
            updateCurrentResting(resting);
        }
    } else {
        const targetRoundNum = phase === 'PREP' ? currentRound : currentRound + 1;
        const { matches, resting } = generateRound(updatedPlayers, historyRef.current, targetRoundNum, noRestPlayers);
        setCurrentMatches(matches);
        currentMatchesRef.current = matches;
        updateCurrentResting(resting);
    }
    const shouldResume = dropoutShouldResumeRef.current;
    dropoutShouldResumeRef.current = false;
    setSelectedDropoutPlayerIds([]);
    setIsDropoutModalVisible(false);
    if (shouldResume) {
      setIsActive(true);
    }
  };

  const handleConfirmDropoutSelection = () => {
    if (selectedDropoutPlayerIds.length === 0) {
      showInfo('Wybierz przynajmniej jednego zawodnika, który wypadł z treningu.');
      return;
    }

    handleRemovePlayersFromTraining(selectedDropoutPlayerIds);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => { setTimeLeft(prev => prev - 1); }, 1000);
    } else if (isActive && timeLeft === 0) {
      
      if (trainingMode === 'ZADANIOWKI') {
          if (zadaniowkiType === 'TRÓJKI') {
              if (phase === 'PREP') {
                  playSound('start'); setPhase('WORK'); setTimeLeft(Math.floor(parseFloat(roundTime) * 60)); 
              } else if (phase === 'WORK') {
                  if (currentStep < 6) {
                      playSound('end'); setPhase('PREP'); setTimeLeft(Math.floor(parseFloat(restTime)));
                      setCurrentStep(prev => prev + 1);
                  } else { 
                      if (currentRound < parseInt(roundsTotal)) {
                          playSound('end'); setPhase('PREP'); setTimeLeft(Math.floor(parseFloat(restTime))); 
                          setCurrentRound(prev => prev + 1);
                          setCurrentStep(1);
                      } else {
                          playSound('finish'); setIsActive(false); setCurrentScreen('finished'); 
                      }
                  }
              }
          } else { 
              if (phase === 'PREP') {
                  playSound('start'); setPhase('WORK'); setTimeLeft(Math.floor(parseFloat(roundTime) * 60)); 
                  if (currentStep === 1) { 
                      const updated = applyRoundResult(currentMatchesRef.current, currentRestingRef.current, currentRound, historyRef.current, activePlayersRef.current);
                      activePlayersRef.current = updated;
                      setActivePlayers(updated);
                  }
              } else if (phase === 'WORK') {
                  if (currentStep === 1) { 
                      playSound('end'); setPhase('PREP'); setTimeLeft(Math.floor(parseFloat(restTime))); 
                      setCurrentStep(2);
                  } else { 
                      if (currentRound < parseInt(roundsTotal)) {
                          playSound('end'); setPhase('PREP'); 
                          setTimeLeft(Math.floor(parseFloat(prepTime))); 
                          setCurrentRound(prev => prev + 1);
                          setCurrentStep(1);
                          const { matches, resting } = generateRound(activePlayersRef.current, historyRef.current, currentRound + 1, noRestPlayersRef.current);
                          setCurrentMatches(matches); currentMatchesRef.current = matches; updateCurrentResting(resting);
                      } else {
                          playSound('finish'); setIsActive(false); setCurrentScreen('finished'); 
                      }
                  }
              }
          }
      } else { 
          if (phase === 'PREP') {
            playSound('start'); setPhase('WORK'); setTimeLeft(Math.floor(parseFloat(roundTime) * 60)); 
            const updated = applyRoundResult(currentMatchesRef.current, currentRestingRef.current, currentRound, historyRef.current, activePlayersRef.current);
            activePlayersRef.current = updated;
            setActivePlayers(updated);
          } else if (phase === 'WORK') {
            if (currentRound < parseInt(roundsTotal)) {
              playSound('end'); setPhase('REST'); setTimeLeft(Math.floor(parseFloat(restTime))); 
              const { matches, resting } = generateRound(activePlayersRef.current, historyRef.current, currentRound + 1, noRestPlayersRef.current);
              setCurrentMatches(matches); currentMatchesRef.current = matches; updateCurrentResting(resting);
            } else {
              playSound('finish'); 
              setIsActive(false); 
              setCurrentScreen('finished'); 
            }
          } else if (phase === 'REST') {
            const nextRound = currentRound + 1;
            playSound('start'); setPhase('WORK'); setCurrentRound(nextRound); setTimeLeft(Math.floor(parseFloat(roundTime) * 60)); 
            const updated = applyRoundResult(currentMatchesRef.current, currentRestingRef.current, nextRound, historyRef.current, activePlayersRef.current);
            activePlayersRef.current = updated;
            setActivePlayers(updated);
          }
      }
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft, phase, currentRound, roundsTotal, roundTime, restTime, prepTime, trainingMode, zadaniowkiType, currentStep, playSound, updateCurrentResting]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getRoleColor = (char: string) => {
      if (char === '[A]') return COLORS.accentMain;
      if (char === '[B]') return COLORS.accentCool;
      if (char === '[C]') return COLORS.accentAlert;
      return COLORS.textPrimary;
  };

  const getGearColor = (gear: string) => {
      return gear === 'GI' ? COLORS.accentCool : COLORS.textPrimary;
  };

  const getGearCardTheme = (gear: RealPlayer['gear']) => {
    if (gear === 'GI') {
      return {
        accent: COLORS.accentCool,
        borderColor: 'rgba(73, 198, 255, 0.34)',
        backgroundColor: 'rgba(73, 198, 255, 0.08)',
        badgeBackground: 'rgba(73, 198, 255, 0.14)',
      };
    }

    return {
      accent: COLORS.accentMain,
      borderColor: 'rgba(247, 183, 51, 0.34)',
      backgroundColor: 'rgba(247, 183, 51, 0.08)',
      badgeBackground: 'rgba(247, 183, 51, 0.14)',
    };
  };

  const getSkillToggleTone = (skillLevel: AdultSkillLevel) => {
    if (skillLevel === 1) return TOGGLE_TONES.neutral;
    if (skillLevel === 2) return TOGGLE_TONES.cool;
    return TOGGLE_TONES.warm;
  };

  const getRosterGridColumns = (width: number) => {
    if (width >= 1260) return 3;
    if (width >= 620) return 2;
    return 1;
  };

  const settingsOuterPadding = 10;
  const settingsColumnGap = screenWidth >= 1000 && screenHeight <= 900 ? 12 : 15;
  const settingsFontScale = PixelRatio.getFontScale();
  const preferredTabletLeftColumnWidth = clamp(360, screenWidth * 0.32, 440);
  const estimatedSplitRightColumnWidth =
    screenWidth - settingsOuterPadding * 2 - settingsColumnGap - preferredTabletLeftColumnWidth;
  const shouldSplitSettingsLayout =
    screenWidth >= 920 && estimatedSplitRightColumnWidth >= 700;
  const isTabletCompactSettings = shouldSplitSettingsLayout && screenHeight <= 900;
  const tabletLeftColumnWidth = shouldSplitSettingsLayout
    ? preferredTabletLeftColumnWidth
    : screenWidth - settingsOuterPadding * 2;
  const settingsPanelWidth = shouldSplitSettingsLayout
    ? tabletLeftColumnWidth
    : screenWidth - settingsOuterPadding * 2;
  const isCompactSettingsUI =
    isTabletCompactSettings || settingsPanelWidth <= 440 || settingsFontScale > 1.2;
  const stackSettingsActionRows =
    settingsPanelWidth <= 340 || screenHeight <= 520 || settingsFontScale > 1.35;
  const stackTimeCards =
    settingsPanelWidth <= 340 || screenHeight <= 500 || settingsFontScale > 1.35;
  const rosterAvailableWidth = shouldSplitSettingsLayout
    ? estimatedSplitRightColumnWidth
    : screenWidth - settingsOuterPadding * 2;
  const rosterGridColumns = getRosterGridColumns(rosterAvailableWidth);
  const rosterCardBasis =
    rosterGridColumns === 3 ? '31.9%' : rosterGridColumns === 2 ? '48.9%' : '100%';
  const sortedRoster = [...roster].sort((a, b) =>
    a.id.localeCompare(b.id, 'pl', { sensitivity: 'base' })
  );
  const hasAnyRosterFilter = rosterFilterType !== null || rosterFilterGear !== null || rosterFilterSkill !== null;
  const filteredSortedRoster = hasAnyRosterFilter
    ? sortedRoster.filter((p) => {
        if (rosterFilterType !== null && p.type !== rosterFilterType) return false;
        if (rosterFilterGear !== null && p.gear !== rosterFilterGear) return false;
        if (rosterFilterSkill !== null) {
          if (p.type === 'KID') return false;
          if (p.skillLevel !== rosterFilterSkill) return false;
        }
        return true;
      })
    : sortedRoster;
  const selectedSkillOption = ADULT_SKILL_LEVEL_OPTIONS.find(option => option.value === newSkillLevel);
  const activeFormTone = newGear === 'GI' ? TOGGLE_TONES.cool : TOGGLE_TONES.warm;
  const playerTypeTone = {
    kid: TOGGLE_TONES.cool,
    adult: TOGGLE_TONES.warm,
  };
  const topBarMetrics = getTopBarMetrics(screenWidth, screenHeight);
  const bottomBarMetrics = getBottomBarMetrics(screenWidth, screenHeight);
  const isWideInstructionLayout = screenWidth >= 1180;
  const prepCountdownWindow = clamp(3, Math.floor(Number(prepTime) || 10), 10);
  const isPrepCountdownHot = isActive && phase === 'PREP' && timeLeft > 0 && timeLeft <= prepCountdownWindow;
  const isWorkCountdownHot = isActive && phase === 'WORK' && timeLeft > 0 && timeLeft <= 10;
  const isCountdownHot = isPrepCountdownHot || isWorkCountdownHot;
  const countdownAccentColor = isWorkCountdownHot ? COLORS.accentAlert : COLORS.accentMain;
  const countdownPulseOn = isCountdownHot && timeLeft % 2 === 0;
  const countdownGlowColor = withAlpha(countdownAccentColor, countdownPulseOn ? 0.38 : 0.18);
  const countdownPanelStyle = isCountdownHot
    ? {
        backgroundColor: countdownPulseOn ? withAlpha(countdownAccentColor, 0.12) : COLORS.bgPanel,
        borderColor: countdownPulseOn ? withAlpha(COLORS.textPrimary, 0.88) : withAlpha(countdownAccentColor, 0.8),
        shadowColor: countdownAccentColor,
        shadowOpacity: countdownPulseOn ? 0.58 : 0.28,
        shadowRadius: countdownPulseOn ? 28 : 18,
        shadowOffset: { width: 0, height: 0 },
        elevation: countdownPulseOn ? 12 : 6,
      }
    : null;
  const countdownTimerBoxStyle = isPrepCountdownHot
    ? {
        backgroundColor: countdownPulseOn ? withAlpha(countdownAccentColor, 0.18) : COLORS.bgMain,
        borderColor: countdownPulseOn ? COLORS.textPrimary : countdownAccentColor,
        shadowColor: countdownAccentColor,
        shadowOpacity: countdownPulseOn ? 0.56 : 0.24,
        shadowRadius: countdownPulseOn ? 24 : 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: countdownPulseOn ? 10 : 5,
        transform: [{ scale: countdownPulseOn ? 1.035 : 1 }],
      }
    : null;
  const countdownTimerTextStyle = isCountdownHot
    ? {
        color: countdownPulseOn ? COLORS.textPrimary : countdownAccentColor,
        textShadowColor: countdownGlowColor,
        textShadowRadius: countdownPulseOn ? 26 : 10,
      }
    : null;
  const startTrainingLabel =
    trainingMode === 'SPARING'
      ? 'START SPARINGÓW'
      : zadaniowkiType === 'TRÓJKI'
        ? 'START ZADANIÓWKI W TRÓJKACH'
        : 'START ZADANIÓWKI W PARACH';
  const sortedDropoutPlayers = [...activePlayers].sort((a, b) =>
    a.id.localeCompare(b.id, 'pl', { sensitivity: 'base' })
  );
  const selectedDropoutCount = selectedDropoutPlayerIds.length;

  const toggleRosterFilterType = (v: 'KID' | 'ADULT') => setRosterFilterType(prev => prev === v ? null : v);
  const toggleRosterFilterGear = (v: 'GI' | 'NO') => setRosterFilterGear(prev => prev === v ? null : v);
  const toggleRosterFilterSkill = (v: AdultSkillLevel) => setRosterFilterSkill(prev => prev === v ? null : v);
  const clearAllRosterFilters = () => { setRosterFilterType(null); setRosterFilterGear(null); setRosterFilterSkill(null); };

  const rosterFilterBar = roster.length > 0 ? (
    <View style={[styles.rosterFilterBar, isCompactSettingsUI && styles.rosterFilterBarCompact]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rosterFilterScroll}
      >
        <TouchableOpacity
          style={[styles.rosterFilterTag, rosterFilterType === 'KID' && styles.rosterFilterTagActiveCool]}
          onPress={() => toggleRosterFilterType('KID')}
        >
          <Text style={[styles.rosterFilterTagText, rosterFilterType === 'KID' && styles.rosterFilterTagTextActive]}>KID</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rosterFilterTag, rosterFilterType === 'ADULT' && styles.rosterFilterTagActiveWarm]}
          onPress={() => toggleRosterFilterType('ADULT')}
        >
          <Text style={[styles.rosterFilterTagText, rosterFilterType === 'ADULT' && styles.rosterFilterTagTextActive]}>ADULT</Text>
        </TouchableOpacity>

        <View style={styles.rosterFilterSep} />

        <TouchableOpacity
          style={[styles.rosterFilterTag, rosterFilterGear === 'GI' && styles.rosterFilterTagActiveCool]}
          onPress={() => toggleRosterFilterGear('GI')}
        >
          <Text style={[styles.rosterFilterTagText, rosterFilterGear === 'GI' && styles.rosterFilterTagTextActive]}>GI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rosterFilterTag, rosterFilterGear === 'NO' && styles.rosterFilterTagActiveWarm]}
          onPress={() => toggleRosterFilterGear('NO')}
        >
          <Text style={[styles.rosterFilterTagText, rosterFilterGear === 'NO' && styles.rosterFilterTagTextActive]}>NO-GI</Text>
        </TouchableOpacity>

        <View style={styles.rosterFilterSep} />

        {ADULT_SKILL_LEVEL_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.rosterFilterTag, rosterFilterSkill === opt.value && styles.rosterFilterTagActiveSkill]}
            onPress={() => toggleRosterFilterSkill(opt.value)}
          >
            <Text style={[styles.rosterFilterTagText, rosterFilterSkill === opt.value && styles.rosterFilterTagTextActive]}>{opt.shortLabel}</Text>
          </TouchableOpacity>
        ))}

        {hasAnyRosterFilter && (
          <React.Fragment>
            <View style={styles.rosterFilterSep} />
            <TouchableOpacity style={styles.rosterFilterClearBtn} onPress={clearAllRosterFilters}>
              <Text style={styles.rosterFilterClearText}>WYCZYŚĆ</Text>
            </TouchableOpacity>
          </React.Fragment>
        )}
      </ScrollView>
    </View>
  ) : null;

  const leftSettingsContent = (
    <>
      <View style={[styles.controlPanel, isCompactSettingsUI && styles.controlPanelCompact]}>
        <View style={[styles.controlPanelAccent, { backgroundColor: activeFormTone.textColor }]} />
        <View style={{ flexDirection: 'row', gap: isCompactSettingsUI ? 10 : 14 }}>
          <View style={{ flex: 1 }}>
            <View style={[styles.controlPanelHeader, isCompactSettingsUI && styles.controlPanelHeaderCompact]}>
              <Text style={styles.controlPanelEyebrow}>SKŁAD</Text>
              <Text style={[styles.controlPanelTitle, isCompactSettingsUI && styles.controlPanelTitleCompact]}>Dodaj zawodnika</Text>
              <Text style={[styles.controlPanelSubtitle, isCompactSettingsUI && styles.controlPanelSubtitleCompact]}>
                {isCompactSettingsUI
                  ? 'Ustaw zawodnika i szybko dorzuć go na matę.'
                  : 'Szybko ustaw zawodnika i od razu dorzuć go na matę.'}
              </Text>
            </View>

            <View style={[styles.controlSummaryRow, isCompactSettingsUI && styles.controlSummaryRowCompact]}>
              <View
                style={[
                  styles.controlSummaryBadge,
                  isCompactSettingsUI && styles.controlSummaryBadgeCompact,
                  {
                    backgroundColor: newType === 'KID' ? playerTypeTone.kid.backgroundColor : playerTypeTone.adult.backgroundColor,
                    borderColor: newType === 'KID' ? playerTypeTone.kid.borderColor : playerTypeTone.adult.borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.controlSummaryBadgeText,
                    isCompactSettingsUI && styles.controlSummaryBadgeTextCompact,
                    { color: newType === 'KID' ? playerTypeTone.kid.textColor : playerTypeTone.adult.textColor },
                  ]}
                >
                  {newType}
                </Text>
              </View>
              <View
                style={[
                  styles.controlSummaryBadge,
                  isCompactSettingsUI && styles.controlSummaryBadgeCompact,
                  {
                    backgroundColor: activeFormTone.backgroundColor,
                    borderColor: activeFormTone.borderColor,
                  },
                ]}
              >
                <Text style={[styles.controlSummaryBadgeText, isCompactSettingsUI && styles.controlSummaryBadgeTextCompact, { color: activeFormTone.textColor }]}>
                  {newGear === 'GI' ? 'GI' : 'NO-GI'}
                </Text>
              </View>
              {newType === 'ADULT' && selectedSkillOption ? (
                <View style={[styles.controlSummaryBadge, styles.controlSummaryBadgeNeutral, isCompactSettingsUI && styles.controlSummaryBadgeCompact]}>
                  <Text style={[styles.controlSummaryBadgeText, isCompactSettingsUI && styles.controlSummaryBadgeTextCompact]}>{selectedSkillOption.shortLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity activeOpacity={1.0} style={{ width: isCompactSettingsUI ? 100 : 140, justifyContent: 'center' }}>
            <Image source={APP_LOGO} style={{ width: '100%', height: undefined, aspectRatio: 1, maxHeight: isCompactSettingsUI ? 110 : 140, borderRadius: 16 }} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {isCompactSettingsUI ? (
          <>
            <View style={[styles.compactFormRow, styles.compactFormRowRaised]}>
              <View style={[styles.fieldBlock, styles.fieldBlockCompact, styles.compactFieldPrimary, styles.compactFieldRaised]}>
                <Text style={styles.fieldLabelBadge}>PSEUDONIM</Text>
                <View>
                  <TextInput 
                      style={[styles.inputText, styles.inputTextCompact]} 
                      value={newName} 
                      onChangeText={handleNameChange} 
                      placeholder="np. Kowalski" 
                      placeholderTextColor={COLORS.textMuted} 
                      autoCorrect={false}
                      maxLength={35}
                  />
                  
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <View style={[styles.suggestionsBox, styles.suggestionsBoxCompact, { zIndex: 999 }]}>
                      <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                        {filteredSuggestions.map((sugg, idx) => (
                          <TouchableOpacity key={idx} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(sugg)}>
                            <Text style={styles.suggestionName}>{sugg.id}</Text>
                            <Text style={styles.suggestionDetail}>{sugg.weight} kg | {sugg.type} {sugg.gear}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={[styles.fieldBlock, styles.fieldBlockCompact, styles.compactFieldSecondary]}>
              <Text style={styles.fieldLabelBadge}>WAGA (KG)</Text>
              <TextInput style={[styles.inputText, styles.inputTextCompact]} keyboardType="numeric" value={newWeight} onChangeText={setNewWeight} placeholder="np. 82" placeholderTextColor={COLORS.textMuted} />
              </View>
            </View>

            <View style={styles.compactFormRow}>
              <View style={[styles.optionGroup, styles.optionGroupCompact, styles.compactFieldHalf]}>
                <Text style={styles.optionGroupLabel}>KATEGORIA</Text>
                <View style={styles.togglesRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      styles.toggleBtnCompact,
                      newType === 'KID' && {
                        backgroundColor: playerTypeTone.kid.backgroundColor,
                        borderColor: playerTypeTone.kid.borderColor,
                      },
                    ]}
                    onPress={() => setNewType('KID')}
                  >
                    <Text style={[styles.toggleText, styles.toggleTextCompact, newType === 'KID' && { color: playerTypeTone.kid.textColor }]}>KID</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      styles.toggleBtnCompact,
                      newType === 'ADULT' && {
                        backgroundColor: playerTypeTone.adult.backgroundColor,
                        borderColor: playerTypeTone.adult.borderColor,
                      },
                    ]}
                    onPress={() => setNewType('ADULT')}
                  >
                    <Text style={[styles.toggleText, styles.toggleTextCompact, newType === 'ADULT' && { color: playerTypeTone.adult.textColor }]}>ADULT</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.optionGroup, styles.optionGroupCompact, styles.compactFieldHalf]}>
                <Text style={styles.optionGroupLabel}>STRÓJ</Text>
                <View style={styles.togglesRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      styles.toggleBtnCompact,
                      newGear === 'GI' && {
                        backgroundColor: TOGGLE_TONES.cool.backgroundColor,
                        borderColor: TOGGLE_TONES.cool.borderColor,
                      },
                    ]}
                    onPress={() => setNewGear('GI')}
                  >
                    <Text style={[styles.toggleText, styles.toggleTextCompact, newGear === 'GI' && { color: TOGGLE_TONES.cool.textColor }]}>GI</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      styles.toggleBtnCompact,
                      newGear === 'NO' && {
                        backgroundColor: TOGGLE_TONES.warm.backgroundColor,
                        borderColor: TOGGLE_TONES.warm.borderColor,
                      },
                    ]}
                    onPress={() => setNewGear('NO')}
                  >
                    <Text style={[styles.toggleText, styles.toggleTextCompact, newGear === 'NO' && { color: TOGGLE_TONES.warm.textColor }]}>NO-GI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.fieldBlock, isCompactSettingsUI && styles.fieldBlockCompact, { zIndex: 10 }]}>
              <Text style={styles.fieldLabelBadge}>PSEUDONIM</Text>
              <View>
                <TextInput 
                    style={[styles.inputText, isCompactSettingsUI && styles.inputTextCompact]} 
                    value={newName} 
                    onChangeText={handleNameChange} 
                    placeholder="np. Kowalski" 
                    placeholderTextColor={COLORS.textMuted} 
                    autoCorrect={false}
                    maxLength={35}
                />
                
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <View style={[styles.suggestionsBox, isCompactSettingsUI && styles.suggestionsBoxCompact, { zIndex: 999 }]}>
                    <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                      {filteredSuggestions.map((sugg, idx) => (
                        <TouchableOpacity key={idx} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(sugg)}>
                          <Text style={styles.suggestionName}>{sugg.id}</Text>
                          <Text style={styles.suggestionDetail}>{sugg.weight} kg | {sugg.type} {sugg.gear}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
            
            <View style={[styles.fieldBlock, isCompactSettingsUI && styles.fieldBlockCompact]}>
              <Text style={styles.fieldLabelBadge}>WAGA (KG)</Text>
              <TextInput style={[styles.inputText, isCompactSettingsUI && styles.inputTextCompact]} keyboardType="numeric" value={newWeight} onChangeText={setNewWeight} placeholder="np. 82" placeholderTextColor={COLORS.textMuted} />
            </View>
            
            <View style={[styles.optionGroup, isCompactSettingsUI && styles.optionGroupCompact]}>
              <Text style={styles.optionGroupLabel}>KATEGORIA</Text>
              <View style={styles.togglesRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    isCompactSettingsUI && styles.toggleBtnCompact,
                    newType === 'KID' && {
                      backgroundColor: playerTypeTone.kid.backgroundColor,
                      borderColor: playerTypeTone.kid.borderColor,
                    },
                  ]}
                  onPress={() => setNewType('KID')}
                >
                  <Text style={[styles.toggleText, isCompactSettingsUI && styles.toggleTextCompact, newType === 'KID' && { color: playerTypeTone.kid.textColor }]}>KID</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    isCompactSettingsUI && styles.toggleBtnCompact,
                    newType === 'ADULT' && {
                      backgroundColor: playerTypeTone.adult.backgroundColor,
                      borderColor: playerTypeTone.adult.borderColor,
                    },
                  ]}
                  onPress={() => setNewType('ADULT')}
                >
                  <Text style={[styles.toggleText, isCompactSettingsUI && styles.toggleTextCompact, newType === 'ADULT' && { color: playerTypeTone.adult.textColor }]}>ADULT</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.optionGroup, isCompactSettingsUI && styles.optionGroupCompact]}>
              <Text style={styles.optionGroupLabel}>STRÓJ</Text>
              <View style={styles.togglesRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    isCompactSettingsUI && styles.toggleBtnCompact,
                    newGear === 'GI' && {
                      backgroundColor: TOGGLE_TONES.cool.backgroundColor,
                      borderColor: TOGGLE_TONES.cool.borderColor,
                    },
                  ]}
                  onPress={() => setNewGear('GI')}
                >
                  <Text style={[styles.toggleText, isCompactSettingsUI && styles.toggleTextCompact, newGear === 'GI' && { color: TOGGLE_TONES.cool.textColor }]}>GI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    isCompactSettingsUI && styles.toggleBtnCompact,
                    newGear === 'NO' && {
                      backgroundColor: TOGGLE_TONES.warm.backgroundColor,
                      borderColor: TOGGLE_TONES.warm.borderColor,
                    },
                  ]}
                  onPress={() => setNewGear('NO')}
                >
                  <Text style={[styles.toggleText, isCompactSettingsUI && styles.toggleTextCompact, newGear === 'NO' && { color: TOGGLE_TONES.warm.textColor }]}>NO-GI</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {newType === 'ADULT' && (
          <View style={[styles.optionGroup, isCompactSettingsUI && styles.optionGroupCompact]}>
            <Text style={styles.optionGroupLabel}>POZIOM</Text>
            <View style={styles.togglesRow}>
              {ADULT_SKILL_LEVEL_OPTIONS.map((option) => {
                const optionTone = getSkillToggleTone(option.value);

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.toggleBtn,
                      isCompactSettingsUI && styles.toggleBtnCompact,
                      newSkillLevel === option.value && {
                        backgroundColor: optionTone.backgroundColor,
                        borderColor: optionTone.borderColor,
                      },
                    ]}
                    onPress={() => setNewSkillLevel(option.value)}
                  >
                    <Text style={[styles.toggleText, isCompactSettingsUI && styles.toggleTextCompact, newSkillLevel === option.value && { color: optionTone.textColor }]}>
                      {option.shortLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity style={[styles.addButton, isCompactSettingsUI && styles.addButtonCompact]} onPress={handleAddPlayer}>
            <Text style={[styles.addButtonText, isCompactSettingsUI && styles.addButtonTextCompact]}>{editingPlayerId ? 'ZAPISZ ZMIANY' : 'DODAJ ZAWODNIKA'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.controlPanel, isCompactSettingsUI && styles.controlPanelCompact]}>
        <View style={[styles.controlPanelAccent, { backgroundColor: COLORS.accentCool }]} />
        <View style={[styles.controlPanelHeader, isCompactSettingsUI && styles.controlPanelHeaderCompact]}>
          <Text style={styles.controlPanelEyebrow}>TRENING</Text>
          <Text style={[styles.controlPanelTitle, isCompactSettingsUI && styles.controlPanelTitleCompact]}>Czas i rytm rund</Text>
          <Text style={[styles.controlPanelSubtitle, isCompactSettingsUI && styles.controlPanelSubtitleCompact]}>
            {isCompactSettingsUI
              ? 'Ustaw przygotowanie, pracę, przerwy i rundy.'
              : 'Ustaw przygotowanie, pracę, przerwy i liczbę rund w czytelnej siatce.'}
          </Text>
        </View>

        <View style={[styles.timeGrid, isCompactSettingsUI && styles.timeGridCompact]}>
          <View style={[styles.timeGridRow, isCompactSettingsUI && styles.timeGridRowCompact, stackTimeCards && styles.timeGridRowStacked]}>
            <View style={[styles.timeCard, isCompactSettingsUI && styles.timeCardCompact, stackTimeCards && styles.timeCardStacked]}>
              <Text style={[styles.timeCardLabel, isCompactSettingsUI && styles.timeCardLabelCompact]}>RUNDA (MIN)</Text>
              <TextInput style={[styles.timeCardInput, isCompactSettingsUI && styles.timeCardInputCompact]} keyboardType="numeric" value={roundTime} onChangeText={handleSetRoundTime} />
            </View>
            <View style={[styles.timeCard, isCompactSettingsUI && styles.timeCardCompact, stackTimeCards && styles.timeCardStacked]}>
              <Text style={[styles.timeCardLabel, isCompactSettingsUI && styles.timeCardLabelCompact]}>PRZYGOT. (S)</Text>
              <TextInput style={[styles.timeCardInput, isCompactSettingsUI && styles.timeCardInputCompact]} keyboardType="numeric" value={prepTime} onChangeText={handleSetPrepTime} />
            </View>
          </View>
          <View style={[styles.timeGridRow, isCompactSettingsUI && styles.timeGridRowCompact, stackTimeCards && styles.timeGridRowStacked]}>
            <View style={[styles.timeCard, isCompactSettingsUI && styles.timeCardCompact, stackTimeCards && styles.timeCardStacked]}>
              <Text style={[styles.timeCardLabel, isCompactSettingsUI && styles.timeCardLabelCompact]}>PRZERWA (S)</Text>
              <TextInput style={[styles.timeCardInput, isCompactSettingsUI && styles.timeCardInputCompact]} keyboardType="numeric" value={restTime} onChangeText={handleSetRestTime} />
            </View>
            <View style={[styles.timeCard, isCompactSettingsUI && styles.timeCardCompact, stackTimeCards && styles.timeCardStacked]}>
              <Text style={[styles.timeCardLabel, isCompactSettingsUI && styles.timeCardLabelCompact]}>RUNDY</Text>
              <TextInput style={[styles.timeCardInput, isCompactSettingsUI && styles.timeCardInputCompact]} keyboardType="numeric" value={roundsTotal} onChangeText={handleSetRoundsTotal} />
            </View>
          </View>
        </View>
      </View>
      
      <View style={[styles.leftActionStack, isCompactSettingsUI && styles.leftActionStackCompact]}>
        <View style={[styles.optionsRow, isCompactSettingsUI && styles.optionsRowCompact, stackSettingsActionRows && styles.optionsRowStacked]}>
          <TouchableOpacity style={[styles.vipButton, isCompactSettingsUI && styles.vipButtonCompact]} onPress={() => setIsVipModalVisible(true)}><Text style={[styles.vipButtonText, isCompactSettingsUI && styles.vipButtonTextCompact]}>BEZ PAUZY (SPARING)</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.vipButton, isCompactSettingsUI && styles.vipButtonCompact, trainingMode === 'ZADANIOWKI' && styles.vipButtonActive]} onPress={() => setTrainingMode(trainingMode === 'SPARING' ? 'ZADANIOWKI' : 'SPARING')}><Text style={[styles.vipButtonText, isCompactSettingsUI && styles.vipButtonTextCompact, trainingMode === 'ZADANIOWKI' && {color: COLORS.bgMain}]}>TRYB: ZADANIÓWKI</Text></TouchableOpacity>
        </View>
      
        {trainingMode === 'ZADANIOWKI' && (
          <View style={[styles.optionsRow, isCompactSettingsUI && styles.optionsRowCompact, stackSettingsActionRows && styles.optionsRowStacked, {marginTop: 0}]}>
            <TouchableOpacity style={[styles.vipButton, isCompactSettingsUI && styles.vipButtonCompact, zadaniowkiType === 'TRÓJKI' && styles.vipButtonActive]} onPress={() => setZadaniowkiType('TRÓJKI')}>
              <Text style={[styles.vipButtonText, isCompactSettingsUI && styles.vipButtonTextCompact, zadaniowkiType === 'TRÓJKI' && {color: COLORS.bgMain}]}>TRÓJKI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.vipButton, isCompactSettingsUI && styles.vipButtonCompact, zadaniowkiType === 'DWÓJKI' && styles.vipButtonActive]} onPress={() => setZadaniowkiType('DWÓJKI')}>
              <Text style={[styles.vipButtonText, isCompactSettingsUI && styles.vipButtonTextCompact, zadaniowkiType === 'DWÓJKI' && {color: COLORS.bgMain}]}>DWÓJKI</Text>
            </TouchableOpacity>
          </View>
        )}
      
        <TouchableOpacity style={[styles.startButton, isCompactSettingsUI && styles.startButtonCompact]} onPress={handleStartTraining}>
          <Text
            style={[styles.startButtonText, isCompactSettingsUI && styles.startButtonTextCompact]}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={2}
          >
            {startTrainingLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.aboutButtonInline} onPress={() => setIsAboutModalVisible(true)}>
          <Text style={styles.aboutButtonFixedText}>ℹ️</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const dropoutModal = (
    <Modal visible={isDropoutModalVisible} transparent={true} animationType="fade" onRequestClose={handleCloseDropoutModal}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.dropoutModalContent]}>
          <Text style={styles.modalTitle}>KTO WYPADŁ Z TRENINGU?</Text>
          <Text style={styles.dropoutModalSubtitle}>
            Czas został zatrzymany. Możesz zaznaczyć kilka osób i zatwierdzić jednym kliknięciem.
          </Text>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.dropoutList}>
            {sortedDropoutPlayers.map((p) => {
              const isSelected = selectedDropoutPlayerIds.includes(p.id);

              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.dropoutRow, isSelected && styles.dropoutRowActive]}
                  onPress={() =>
                    setSelectedDropoutPlayerIds((prev) =>
                      prev.includes(p.id)
                        ? prev.filter((id) => id !== p.id)
                        : [...prev, p.id]
                    )
                  }
                  activeOpacity={0.9}
                >
                  <View style={styles.dropoutPlayerInfo}>
                    <View style={[styles.dropoutDot, isSelected && styles.dropoutDotActive]} />
                    <Text style={[styles.dropoutPlayerName, isSelected && styles.dropoutPlayerNameActive]}>{p.id}</Text>
                  </View>
                  <View style={[styles.dropoutBadge, isSelected && styles.dropoutBadgeActive]}>
                    <Text style={[styles.dropoutBadgeText, isSelected && styles.dropoutBadgeTextActive]}>
                      {isSelected ? 'ZAZNACZONY' : 'WYBIERZ'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.dropoutActionsRow}>
            <TouchableOpacity style={[styles.closeModalButton, styles.dropoutCancelButton]} onPress={handleCloseDropoutModal}>
              <Text style={styles.closeModalButtonText}>ANULUJ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.removeButton,
                styles.dropoutConfirmButton,
                selectedDropoutCount === 0 && styles.dropoutConfirmButtonDisabled,
              ]}
              disabled={selectedDropoutCount === 0}
              onPress={handleConfirmDropoutSelection}
            >
              <Text style={styles.removeButtonText}>
                {selectedDropoutCount > 0 ? `OK (${selectedDropoutCount})` : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );


  if (currentScreen === 'finished') {
    const finishedLogoSize = Math.round(Math.min(screenWidth * 0.38, screenHeight * 0.28, 400));
    const finishedBigFont = Math.round(clamp(48, Math.min(screenWidth * 0.22, screenHeight * 0.16), 240));
    const finishedSmallFont = Math.round(clamp(22, Math.min(screenWidth * 0.08, screenHeight * 0.06), 78));
    const finishedBtnFont = Math.round(clamp(14, screenWidth * 0.04, 22));
    const finishedGap = Math.round(clamp(6, screenHeight * 0.02, 16));
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.finishedContainer}>
          <View style={[styles.finishedTextWrap, { gap: finishedGap }]}>
            <Image source={APP_LOGO} style={{ width: finishedLogoSize, height: finishedLogoSize, borderRadius: Math.round(finishedLogoSize * 0.08), marginBottom: finishedGap / 2 }} resizeMode="contain" />
            <Text style={[styles.finishedTextBig, { fontSize: finishedBigFont, lineHeight: Math.round(finishedBigFont * 1.05) }]} adjustsFontSizeToFit={true} numberOfLines={1}>DZIĘKUJĘ</Text>
            <Text style={[styles.finishedTextSmall, { fontSize: finishedSmallFont, lineHeight: Math.round(finishedSmallFont * 1.1) }]} adjustsFontSizeToFit={true} numberOfLines={1}>DOBRA ROBOTA!</Text>
          </View>
          <TouchableOpacity style={[styles.finishedReturnBtn, { paddingVertical: Math.round(finishedBtnFont * 0.6), paddingHorizontal: Math.round(finishedBtnFont * 1.2) }]} onPress={() => setCurrentScreen('settings')}>
            <Text style={[styles.finishedReturnText, { fontSize: finishedBtnFont }]}>Wróć do menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'zadaniowki_timer') {
      let isPrep = phase === 'PREP';
      const isEnding = timeLeft <= 15 && phase === 'WORK';
      let timerColor = isEnding ? COLORS.accentAlert : (isPrep ? COLORS.accentMain : COLORS.textPrimary);
      
      const isDwojki = zadaniowkiType === 'DWÓJKI';
      const step = isDwojki ? currentStep : ((currentStep - 1) % 6) + 1;
      const stepsTotal = isDwojki ? 2 : 6;

      const kidsPairs = currentMatches.filter(m => m.p1.type === 'KID' && m.p2.type === 'KID');
      const adultsPairs = currentMatches.filter(m => m.p1.type === 'ADULT' && m.p2.type === 'ADULT');
      const kidsGroups = zadaniowkiGroups.filter(g => g[0] && g[0].type === 'KID');
      const adultsGroups = zadaniowkiGroups.filter(g => g[0] && g[0].type === 'ADULT');

      const kData = isDwojki ? kidsPairs : kidsGroups;
      const aData = isDwojki ? adultsPairs : adultsGroups;

      const isTriadPrepGrid = !isDwojki && phase === 'PREP' && currentStep === 1 && currentRound === 1;
      const isDwojkiPrepGrid = isDwojki && phase === 'PREP' && currentStep === 1;
      const kTriadData = isTriadPrepGrid ? kData.filter((group: any) => Array.isArray(group) && group.length === 3) : kData;
      const kDuoData = isTriadPrepGrid ? kData.filter((group: any) => Array.isArray(group) && group.length === 2) : [];
      const aTriadData = isTriadPrepGrid ? aData.filter((group: any) => Array.isArray(group) && group.length === 3) : aData;
      const aDuoData = isTriadPrepGrid ? aData.filter((group: any) => Array.isArray(group) && group.length === 2) : [];
      const MAX_ROWS = getDynamicMaxRows(screenWidth);
      const hasKidSection = kData.length > 0;
      const hasAdultSection = aData.length > 0;
      const hasBothSections = hasKidSection && hasAdultSection;
      const responsiveOuterPadding = isTriadPrepGrid ? clamp(8, screenWidth * 0.012, 14) : 10;
      const responsiveSectionGap = isTriadPrepGrid ? clamp(10, screenWidth * 0.012, 18) : 12;
      const responsiveSectionPadding = isTriadPrepGrid ? clamp(10, screenWidth * 0.012, 18) : 12;
      const responsiveCellPadding = isTriadPrepGrid ? clamp(4, screenWidth * 0.004, 7) : 4;
      const measuredMainWidth = isTriadPrepGrid && zadaniowkiMainLayout.width > 0
        ? zadaniowkiMainLayout.width
        : screenWidth;
      const measuredMainHeight = isTriadPrepGrid && zadaniowkiMainLayout.height > 0
        ? zadaniowkiMainLayout.height
        : 0;
      const splitAreaWidth = Math.max(320, measuredMainWidth - responsiveOuterPadding * 2);
      const responsiveKidMinW = getTriadPrepResponsiveMinWidths(screenWidth, 'KID').hard;
      const responsiveAdultMinW = getTriadPrepResponsiveMinWidths(screenWidth, 'ADULT').hard;
      const minSideKidCols = hasKidSection
        ? Math.min(kData.length > 3 ? 2 : 1, kData.length)
        : 0;
      const minSideKidWidth = hasKidSection
        ? (minSideKidCols > 1
          ? responsiveKidMinW * 2 + responsiveCellPadding * 4 + responsiveSectionPadding * 2
          : Math.max(280, responsiveKidMinW + 80) + responsiveSectionPadding * 2)
        : 0;
      const minSideAdultCols = hasAdultSection
        ? Math.min(aData.length > 1 ? 2 : 1, aData.length)
        : 0;
      const minSideAdultWidth = hasAdultSection
        ? minSideAdultCols * responsiveAdultMinW + responsiveCellPadding * (minSideAdultCols * 2) + responsiveSectionPadding * 2
        : 0;
      let stackPrepSections = isTriadPrepGrid
        && hasBothSections
        && splitAreaWidth < minSideKidWidth + minSideAdultWidth + responsiveSectionGap + responsiveSectionPadding * 4;
      const gridWidthBudget = splitAreaWidth - (hasBothSections && !stackPrepSections ? responsiveSectionGap : 0);
      const kidSideTargetWidth = kData.length > 3
        ? clamp(500, gridWidthBudget * 0.36, 620)
        : clamp(280, gridWidthBudget * 0.27, 320);
      let kidsSectionWidth = hasKidSection
        ? (stackPrepSections || !hasAdultSection ? gridWidthBudget : Math.min(kidSideTargetWidth, gridWidthBudget * 0.42))
        : 0;
      let adultsSectionWidth = hasAdultSection
        ? (stackPrepSections || !hasKidSection ? gridWidthBudget : Math.max(0, gridWidthBudget - kidsSectionWidth))
        : 0;
      const preliminarySectionHeightBudget = isTriadPrepGrid && measuredMainHeight > 0
        ? Math.max(230, measuredMainHeight - responsiveOuterPadding * 2)
        : Math.max(230, screenHeight - topBarMetrics.estimatedHeight - bottomBarMetrics.estimatedHeight - (isDwojki && currentResting.length > 0 ? 82 : 0) - 48);
      const preliminaryGridHeightBudget = Math.max(
        96,
        preliminarySectionHeightBudget - responsiveSectionPadding * 2 - TRIAD_PREP_SECTION_HEADER_HEIGHT,
      );
      const responsiveMinCardHeight = getTriadPrepResponsiveMinHeight(screenHeight);
      const kidsMinWidths = getTriadPrepResponsiveMinWidths(screenWidth, 'KID');
      const adultsMinWidths = getTriadPrepResponsiveMinWidths(screenWidth, 'ADULT');

      // Re-check: if side-by-side would cram a section to 1 col with many groups, force stack
      if (isTriadPrepGrid && hasBothSections && !stackPrepSections) {
        const trialAdultCols = getResponsiveTriadPrepCols(
          adultsSectionWidth, preliminaryGridHeightBudget,
          Math.max(aTriadData.length, aDuoData.length), 'ADULT', responsiveCellPadding,
          responsiveMinCardHeight, adultsMinWidths.safe, adultsMinWidths.hard,
        );
        const trialKidCols = getResponsiveTriadPrepCols(
          kidsSectionWidth, preliminaryGridHeightBudget,
          Math.max(kTriadData.length, kDuoData.length), 'KID', responsiveCellPadding,
          responsiveMinCardHeight, kidsMinWidths.safe, kidsMinWidths.hard,
        );
        const adultsNeedMoreCols = aData.length > 2 && trialAdultCols <= 1;
        const kidsNeedMoreCols = kData.length > 2 && trialKidCols <= 1;
        // On tablet (screenWidth >= 1100), avoid stacking because it halves height budget per section.
        // Prefer tight side-by-side layout where adjustsFontSizeToFit handles small widths.
        if ((adultsNeedMoreCols || kidsNeedMoreCols) && screenWidth < 1100) {
          stackPrepSections = true;
          const stackedWidthBudget = splitAreaWidth;
          kidsSectionWidth = hasKidSection ? stackedWidthBudget : 0;
          adultsSectionWidth = hasAdultSection ? stackedWidthBudget : 0;
        }
      }

      let kidsCols = isTriadPrepGrid
        ? getResponsiveTriadPrepCols(kidsSectionWidth, preliminaryGridHeightBudget, Math.max(kTriadData.length, kDuoData.length), 'KID', responsiveCellPadding, responsiveMinCardHeight, kidsMinWidths.safe, kidsMinWidths.hard)
        : Math.ceil(kData.length / MAX_ROWS) || 1;
      let adultsCols = isTriadPrepGrid
        ? getResponsiveTriadPrepCols(adultsSectionWidth, preliminaryGridHeightBudget, Math.max(aTriadData.length, aDuoData.length), 'ADULT', responsiveCellPadding, responsiveMinCardHeight, adultsMinWidths.safe, adultsMinWidths.hard)
        : Math.ceil(aData.length / MAX_ROWS) || 1;

      if (isDwojki) {
        kidsCols = keepColsWithinMinWidth(kidsSectionWidth, kidsCols, responsiveCellPadding, DUO_PREP_MIN_CARD_WIDTH);
        adultsCols = keepColsWithinMinWidth(adultsSectionWidth, adultsCols, responsiveCellPadding, DUO_PREP_MIN_CARD_WIDTH);
      }

      const kidsDuoCols = isTriadPrepGrid && kDuoData.length > 0 ? Math.max(1, kidsCols) : 1;
      const adultsDuoCols = isTriadPrepGrid && aDuoData.length > 0 ? Math.max(1, adultsCols) : 1;

      let kidsFlex = hasKidSection ? (isTriadPrepGrid ? kidsSectionWidth : kidsCols) : 0;
      let adultsFlex = hasAdultSection ? (isTriadPrepGrid ? adultsSectionWidth : adultsCols) : 0;
      if (kidsFlex === 0 && adultsFlex === 0) { kidsFlex = 1; adultsFlex = 1; }
      else if (kidsFlex === 0) adultsFlex = 1;
      else if (adultsFlex === 0) kidsFlex = 1;

      const kidsTriadRows = isTriadPrepGrid ? Math.ceil(kTriadData.length / kidsCols) || 0 : Math.ceil(kData.length / kidsCols) || 1;
      const adultsTriadRows = isTriadPrepGrid ? Math.ceil(aTriadData.length / adultsCols) || 0 : Math.ceil(aData.length / adultsCols) || 1;
      const kidsDuoRows = isTriadPrepGrid ? Math.ceil(kDuoData.length / kidsDuoCols) || 0 : 0;
      const adultsDuoRows = isTriadPrepGrid ? Math.ceil(aDuoData.length / adultsDuoCols) || 0 : 0;
      const kidsRows = isTriadPrepGrid
        ? Math.max(1, kidsTriadRows + kidsDuoRows * TRIAD_PREP_DUO_ROW_WEIGHT)
        : kidsTriadRows;
      const adultsRows = isTriadPrepGrid
        ? Math.max(1, adultsTriadRows + adultsDuoRows * TRIAD_PREP_DUO_ROW_WEIGHT)
        : adultsTriadRows;
      const prepGridRows = isTriadPrepGrid && !stackPrepSections
        ? Math.max(hasKidSection ? kidsRows : 0, hasAdultSection ? adultsRows : 0, 1)
        : 0;
      const gridHeightBudget = preliminaryGridHeightBudget;
      const stackedRowsTotal = Math.max(1, (hasKidSection ? kidsRows : 0) + (hasAdultSection ? adultsRows : 0));
      const stackedSectionOverhead = TRIAD_PREP_SECTION_HEADER_HEIGHT + responsiveSectionPadding * 2 + 8;
      const kidsHeightBudget = stackPrepSections && hasBothSections
        ? Math.max(responsiveMinCardHeight, preliminarySectionHeightBudget * (kidsRows / stackedRowsTotal) - responsiveSectionGap - stackedSectionOverhead)
        : gridHeightBudget;
      const adultsHeightBudget = stackPrepSections && hasBothSections
        ? Math.max(responsiveMinCardHeight, preliminarySectionHeightBudget * (adultsRows / stackedRowsTotal) - responsiveSectionGap - stackedSectionOverhead)
        : gridHeightBudget;
      const kidsCardWidth = kidsCols > 0 ? Math.max(130, kidsSectionWidth / kidsCols - responsiveCellPadding * 2) : 0;
      const adultsCardWidth = adultsCols > 0 ? Math.max(130, adultsSectionWidth / adultsCols - responsiveCellPadding * 2) : 0;
      const kidsComputedCardHeight = kidsRows > 0 ? kidsHeightBudget / (isTriadPrepGrid && !stackPrepSections ? prepGridRows : kidsRows) - responsiveCellPadding * 2 : 0;
      const adultsComputedCardHeight = adultsRows > 0 ? adultsHeightBudget / (isTriadPrepGrid && !stackPrepSections ? prepGridRows : adultsRows) - responsiveCellPadding * 2 : 0;
      const scrollTriadCardHeight = clamp(130, screenHeight * 0.2, 175);
      // Check if the total stacked content would exceed available space
      const minKidsContentHeight = kidsRows > 0 ? kidsRows * (responsiveMinCardHeight + responsiveCellPadding * 2) : 0;
      const minAdultsContentHeight = adultsRows > 0 ? adultsRows * (responsiveMinCardHeight + responsiveCellPadding * 2) : 0;
      const stackedTotalMinNeeded = stackPrepSections && hasBothSections
        ? (minKidsContentHeight + stackedSectionOverhead) + (minAdultsContentHeight + stackedSectionOverhead) + responsiveSectionGap
        : 0;

      // Build merged list of triads + duos per section for a single-grid layout
      type MergedGridItem = { group: any; isDuo: boolean };
      const kMergedData: MergedGridItem[] = isTriadPrepGrid
        ? [...kTriadData.map((g: any) => ({ group: g, isDuo: false })), ...kDuoData.map((g: any) => ({ group: g, isDuo: true }))]
        : [];
      const aMergedData: MergedGridItem[] = isTriadPrepGrid
        ? [...aTriadData.map((g: any) => ({ group: g, isDuo: false })), ...aDuoData.map((g: any) => ({ group: g, isDuo: true }))]
        : [];

      // On wide screens (tablet on wall), everything MUST fit without scrolling.
      // On narrow screens, allow scrolling.
      const forceNoScroll = screenWidth >= 1100;

      const shouldScrollTriadGrid = (() => {
        if (!isTriadPrepGrid) return false;
        if (forceNoScroll) return false;
        if (kidsComputedCardHeight < responsiveMinCardHeight ||
            adultsComputedCardHeight < responsiveMinCardHeight) return true;
        if (stackedTotalMinNeeded > 0 && stackedTotalMinNeeded > preliminarySectionHeightBudget) return true;

        // Check if merged grid pixel heights would overflow the available space
        const tryTriadH = Math.max(60, kidsComputedCardHeight);
        const tryDuoH = Math.max(40, tryTriadH * TRIAD_PREP_DUO_ROW_WEIGHT);
        const tryATriadH = Math.max(60, adultsComputedCardHeight);
        const tryADuoH = Math.max(40, tryATriadH * TRIAD_PREP_DUO_ROW_WEIGHT);
        const kCols = Math.max(1, kidsCols);
        const aCols = Math.max(1, adultsCols);
        let kTotalH = 0;
        for (let i = 0; i < kMergedData.length; i += kCols) {
          const rowMax = Math.max(...kMergedData.slice(i, i + kCols).map(it => it.isDuo ? tryDuoH : tryTriadH));
          kTotalH += rowMax + responsiveCellPadding * 2;
        }
        let aTotalH = 0;
        for (let i = 0; i < aMergedData.length; i += aCols) {
          const rowMax = Math.max(...aMergedData.slice(i, i + aCols).map(it => it.isDuo ? tryADuoH : tryATriadH));
          aTotalH += rowMax + responsiveCellPadding * 2;
        }
        if (!stackPrepSections) {
          const maxGridH = Math.max(kTotalH, aTotalH);
          if (maxGridH > gridHeightBudget) return true;
        } else if (hasBothSections) {
          if (kTotalH > kidsHeightBudget || aTotalH > adultsHeightBudget) return true;
        }
        return false;
      })();

      // For forceNoScroll: compute card heights that fit the grid budget exactly.
      // Count triad rows and duo rows to distribute height proportionally.
      const computeFittedCardHeights = (
        mergedData: MergedGridItem[],
        cols: number,
        heightBudget: number,
      ): { triadH: number; duoH: number } => {
        const safeCols = Math.max(1, cols);
        let triadRowCount = 0;
        let duoRowCount = 0;
        for (let i = 0; i < mergedData.length; i += safeCols) {
          const rowItems = mergedData.slice(i, i + safeCols);
          const hasTrio = rowItems.some(it => !it.isDuo);
          if (hasTrio) triadRowCount++;
          else duoRowCount++;
        }
        const totalRows = triadRowCount + duoRowCount;
        if (totalRows === 0) return { triadH: 60, duoH: 48 };
        const totalPadding = totalRows * responsiveCellPadding * 2;
        const availableForCards = Math.max(0, heightBudget - totalPadding);
        const weightedTotal = triadRowCount + duoRowCount * TRIAD_PREP_DUO_ROW_WEIGHT;
        const triadH = Math.max(60, availableForCards / weightedTotal);
        const duoH = Math.max(40, triadH * TRIAD_PREP_DUO_ROW_WEIGHT);
        return { triadH, duoH };
      };

      let kidsCardHeight: number;
      let adultsCardHeight: number;
      let kidsDuoCardHeight: number;
      let adultsDuoCardHeight: number;

      if (shouldScrollTriadGrid) {
        kidsCardHeight = scrollTriadCardHeight;
        adultsCardHeight = scrollTriadCardHeight;
        kidsDuoCardHeight = Math.max(72, kidsCardHeight * TRIAD_PREP_DUO_ROW_WEIGHT);
        adultsDuoCardHeight = Math.max(72, adultsCardHeight * TRIAD_PREP_DUO_ROW_WEIGHT);
      } else if (forceNoScroll && isTriadPrepGrid) {
        // Compute heights that fit without scrolling
        const kBudget = stackPrepSections && hasBothSections ? kidsHeightBudget : gridHeightBudget;
        const aBudget = stackPrepSections && hasBothSections ? adultsHeightBudget : gridHeightBudget;
        const kFitted = computeFittedCardHeights(kMergedData, kidsCols, kBudget);
        const aFitted = computeFittedCardHeights(aMergedData, adultsCols, aBudget);
        kidsCardHeight = kFitted.triadH;
        adultsCardHeight = aFitted.triadH;
        kidsDuoCardHeight = kFitted.duoH;
        adultsDuoCardHeight = aFitted.duoH;
      } else {
        kidsCardHeight = Math.max(60, kidsComputedCardHeight);
        adultsCardHeight = Math.max(60, adultsComputedCardHeight);
        kidsDuoCardHeight = Math.max(40, kidsCardHeight * TRIAD_PREP_DUO_ROW_WEIGHT);
        adultsDuoCardHeight = Math.max(40, adultsCardHeight * TRIAD_PREP_DUO_ROW_WEIGHT);
      }

      const kidsDuoCardWidth = kidsDuoCols > 0 ? Math.max(130, kidsSectionWidth / kidsDuoCols - responsiveCellPadding * 2) : 0;
      const adultsDuoCardWidth = adultsDuoCols > 0 ? Math.max(130, adultsSectionWidth / adultsDuoCols - responsiveCellPadding * 2) : 0;

      // Compute merged grid heights for scroll mode
      const computeMergedGridHeight = (
        items: MergedGridItem[],
        cols: number,
        triadCH: number,
        duoCH: number,
      ): number => {
        const safeCols = Math.max(1, cols);
        let totalHeight = 0;
        for (let i = 0; i < items.length; i += safeCols) {
          const rowItems = items.slice(i, i + safeCols);
          const maxCardH = Math.max(...rowItems.map(it => it.isDuo ? duoCH : triadCH));
          totalHeight += maxCardH + responsiveCellPadding * 2;
        }
        return totalHeight;
      };

      const kidsMergedGridHeight = isTriadPrepGrid
        ? computeMergedGridHeight(kMergedData, kidsCols, kidsCardHeight, kidsDuoCardHeight)
        : undefined;
      const adultsMergedGridHeight = isTriadPrepGrid
        ? computeMergedGridHeight(aMergedData, adultsCols, adultsCardHeight, adultsDuoCardHeight)
        : undefined;

      const headerAndPaddingHeight = responsiveSectionPadding * 2 + TRIAD_PREP_SECTION_HEADER_HEIGHT + 8;
      const kidsSectionScrollHeight = shouldScrollTriadGrid
        ? headerAndPaddingHeight + (kidsMergedGridHeight ?? 0)
        : undefined;
      const adultsSectionScrollHeight = shouldScrollTriadGrid
        ? headerAndPaddingHeight + (adultsMergedGridHeight ?? 0)
        : undefined;
      // For triad prep, always compute explicit section heights based on merged grid
      const kidsSectionExplicitHeight = isTriadPrepGrid
        ? headerAndPaddingHeight + (kidsMergedGridHeight ?? 0)
        : undefined;
      const adultsSectionExplicitHeight = isTriadPrepGrid
        ? headerAndPaddingHeight + (adultsMergedGridHeight ?? 0)
        : undefined;

      // --- Dwójki prep grid: sparring-style responsive layout ---
      const dwPairOuterPadding = isDwojkiPrepGrid ? clamp(8, screenWidth * 0.01, 14) : 0;
      const dwPairSectionGap = isDwojkiPrepGrid ? clamp(8, screenWidth * 0.01, 16) : 0;
      const dwPairSectionPadding = isDwojkiPrepGrid ? clamp(10, screenWidth * 0.012, 18) : 0;
      const dwPairCellPadding = isDwojkiPrepGrid ? clamp(4, screenWidth * 0.0038, 6) : 0;
      const dwPairHeaderHeight = isDwojkiPrepGrid ? clamp(30, screenHeight * 0.04, 40) : 0;

      let isDwojkiPhoneView = isDwojkiPrepGrid && (
        screenWidth < 760 ||
        Math.min(screenWidth, screenHeight) < 560 ||
        (screenHeight < 560 && screenWidth < 980)
      );

      const dwMeasuredMainWidth = isDwojkiPrepGrid && zadaniowkiMainLayout.width > 0 ? zadaniowkiMainLayout.width : screenWidth;
      const dwMeasuredMainHeight = isDwojkiPrepGrid && zadaniowkiMainLayout.height > 0
        ? zadaniowkiMainLayout.height
        : Math.max(260, screenHeight - topBarMetrics.estimatedHeight - bottomBarMetrics.estimatedHeight - 28);
      const dwContentWidth = Math.max(260, dwMeasuredMainWidth - dwPairOuterPadding * 2);
      const dwContentHeight = Math.max(220, dwMeasuredMainHeight - dwPairOuterPadding * 2);
      const dwTotalPairs = Math.max(1, kidsPairs.length + adultsPairs.length);

      const dwRestingBadgeCols = Math.max(1, Math.floor(dwContentWidth / 210));
      const dwRestingBadgeRows = isDwojkiPrepGrid && currentResting.length > 0
        ? Math.ceil(currentResting.length / dwRestingBadgeCols)
        : 0;
      const dwRestingPanelHeight = isDwojkiPrepGrid && currentResting.length > 0
        ? Math.max(74, dwPairSectionPadding * 2 + 24 + dwRestingBadgeRows * 42 + Math.max(0, dwRestingBadgeRows - 1) * 8) + dwPairHeaderHeight
        : 0;
      const dwBottomGap = isDwojkiPrepGrid && currentResting.length > 0 ? dwPairSectionGap : 0;
      const dwSplitAreaHeight = isDwojkiPhoneView
        ? 0
        : Math.max(160, dwContentHeight - dwRestingPanelHeight - dwBottomGap);
      const dwSplitAreaWidth = hasBothSections
        ? Math.max(260, dwContentWidth - dwPairSectionGap)
        : dwContentWidth;
      const dwPhoneSectionWidth = Math.max(240, dwContentWidth);
      const dwKidsWidthRatio = hasBothSections
        ? clamp(0.22, kidsPairs.length / dwTotalPairs, kidsPairs.length >= 5 ? 0.42 : 0.34)
        : 1;
      const dwKidsPreferredWidth = hasBothSections
        ? clamp(240, dwSplitAreaWidth * dwKidsWidthRatio, kidsPairs.length >= 5 ? 480 : 360)
        : dwSplitAreaWidth;
      const dwKidsSectionWidth = hasKidSection
        ? (hasBothSections ? dwKidsPreferredWidth : dwSplitAreaWidth)
        : 0;
      const dwAdultsSectionWidth = hasAdultSection
        ? (hasBothSections ? Math.max(280, dwSplitAreaWidth - dwKidsSectionWidth) : dwSplitAreaWidth)
        : 0;
      const dwSectionBodyHeight = isDwojkiPhoneView
        ? 0
        : Math.max(110, dwSplitAreaHeight - dwPairSectionPadding * 2 - dwPairHeaderHeight);
      const dwKidsBodyWidth = isDwojkiPhoneView
        ? Math.max(220, dwPhoneSectionWidth - dwPairSectionPadding * 2)
        : Math.max(180, dwKidsSectionWidth - dwPairSectionPadding * 2);
      const dwAdultsBodyWidth = isDwojkiPhoneView
        ? Math.max(220, dwPhoneSectionWidth - dwPairSectionPadding * 2)
        : Math.max(220, dwAdultsSectionWidth - dwPairSectionPadding * 2);
      const dwPhonePairCardHeight = isDwojkiPrepGrid ? clamp(116, Math.min(screenWidth * 0.34, screenHeight * 0.22), 156) : 0;

      // Dynamic check: can pairs fit at readable size in grid mode? Skip for tablets >= 1000px.
      if (isDwojkiPrepGrid && !isDwojkiPhoneView && screenWidth < 1000 && (kidsPairs.length > 0 || adultsPairs.length > 0)) {
        const estGridBodyHeight = dwSectionBodyHeight;
        const pairsFitInGrid = (pairCount: number, bodyWidth: number) => {
          if (pairCount <= 0) return true;
          const estMaxCols = Math.max(1, Math.floor(bodyWidth / 270));
          const cols = Math.min(pairCount, estMaxCols);
          const rows = Math.ceil(pairCount / cols);
          return estGridBodyHeight / rows >= 88;
        };
        if (!pairsFitInGrid(kidsPairs.length, dwKidsBodyWidth) || !pairsFitInGrid(adultsPairs.length, dwAdultsBodyWidth)) {
          isDwojkiPhoneView = true;
        }
      }

      const dwKidsGridSpec = isDwojkiPrepGrid ? getBestPairGridSpec({
        count: kidsPairs.length,
        sectionWidth: dwKidsBodyWidth,
        sectionHeight: dwSectionBodyHeight,
        cellPadding: dwPairCellPadding,
        minCardWidth: isDwojkiPhoneView ? dwKidsBodyWidth : 180,
        minCardHeight: isDwojkiPhoneView ? dwPhonePairCardHeight : 68,
        preferredCardWidth: isDwojkiPhoneView ? dwKidsBodyWidth : 240,
        maxCols: isDwojkiPhoneView ? 1 : Math.min(kidsPairs.length || 1, 2),
        allowScroll: isDwojkiPhoneView,
      }) : { cols: 1, rows: 0, cardWidth: 0, cardHeight: 0 };
      const dwAdultsGridSpec = isDwojkiPrepGrid ? getBestPairGridSpec({
        count: adultsPairs.length,
        sectionWidth: dwAdultsBodyWidth,
        sectionHeight: dwSectionBodyHeight,
        cellPadding: dwPairCellPadding,
        minCardWidth: isDwojkiPhoneView ? dwAdultsBodyWidth : 180,
        minCardHeight: isDwojkiPhoneView ? dwPhonePairCardHeight : 68,
        preferredCardWidth: isDwojkiPhoneView ? dwAdultsBodyWidth : 300,
        maxCols: isDwojkiPhoneView
          ? 1
          : Math.min(adultsPairs.length || 1, dwAdultsBodyWidth >= 1380 ? 4 : dwAdultsBodyWidth >= 700 ? 3 : 2),
        allowScroll: isDwojkiPhoneView,
      }) : { cols: 1, rows: 0, cardWidth: 0, cardHeight: 0 };

      const dwKidsSectionStyle = hasBothSections
        ? { flexBasis: dwKidsSectionWidth, width: dwKidsSectionWidth, maxWidth: dwKidsSectionWidth, flexGrow: 0, flexShrink: 0 }
        : { flex: 1 };
      const dwAdultsSectionStyle = hasBothSections
        ? { flexBasis: dwAdultsSectionWidth, width: dwAdultsSectionWidth, maxWidth: dwAdultsSectionWidth, flexGrow: 0, flexShrink: 0 }
        : { flex: 1 };
      const dwStackTopBar = isDwojkiPhoneView && screenWidth < 560;

      const getLastRowOffset = (index: number, count: number, cols: number) => {
        const remainder = count % cols;
        const firstLastRowIndex = remainder === 0 ? -1 : count - remainder;

        if (isTriadPrepGrid || remainder === 0 || index !== firstLastRowIndex) {
          return 0;
        }

        return ((cols - remainder) / cols) * 50;
      };

      const getRoles = (s: number) => {
          const mod = (s - 1) % 6;
          switch(mod) {
              case 0: return { btm: 0, top: 1, rest: 2 }; 
              case 1: return { btm: 0, top: 2, rest: 1 }; 
              case 2: return { btm: 2, top: 1, rest: 0 }; 
              case 3: return { btm: 2, top: 0, rest: 1 }; 
              case 4: return { btm: 1, top: 0, rest: 2 }; 
              default: return { btm: 1, top: 2, rest: 0 }; 
          }
      };

      const getGenericInstruction = (s: number) => {
          const mod = (s - 1) % 6;
          switch(mod) {
              case 0: return { b: "[A]", t: "[B]", r: "[C]" };
              case 1: return { b: "[A]", t: "[C]", r: "[B]" };
              case 2: return { b: "[C]", t: "[B]", r: "[A]" };
              case 3: return { b: "[C]", t: "[A]", r: "[B]" };
              case 4: return { b: "[B]", t: "[A]", r: "[C]" };
              default: return { b: "[B]", t: "[C]", r: "[A]" };
          }
      };

      const letters = ['[A]', '[B]', '[C]'];
      const triadLegend = !isDwojki ? getGenericInstruction(step) : null;
      const triadLegendItems = triadLegend
        ? [
            { role: triadLegend.b, label: 'DÓŁ' },
            { role: triadLegend.t, label: 'GÓRA' },
            { role: triadLegend.r, label: 'PAUZA' },
          ].sort((a, b) => getTriadRoleOrder(a.role) - getTriadRoleOrder(b.role))
        : [];
      const dwojkiLegendItems = isDwojki
        ? (step === 1
          ? [{ role: '[A]', label: 'DÓŁ' }, { role: '[B]', label: 'GÓRA' }]
          : [{ role: '[B]', label: 'DÓŁ' }, { role: '[A]', label: 'GÓRA' }])
        : [];

      const showGrid = phase === 'PREP' && currentStep === 1 && (currentRound === 1 || isDwojki);

      if (!showGrid) {
          const timerLabel = formatTime(timeLeft);
          const [timerMinutes = '00', timerSeconds = '00'] = timerLabel.split(':');
          
          let topWord = "", btmWord = "", restWord = "";
          let nextTopWord = "", nextBtmWord = "", nextRestWord = "";

          if (isDwojki) {
              btmWord = step === 1 ? '[A]' : '[B]';
              topWord = step === 1 ? '[B]' : '[A]';
              if (step === 1) {
                  nextBtmWord = '[B]';
                  nextTopWord = '[A]';
              }
          } else {
              const instr = getGenericInstruction(step);
              btmWord = instr.b; topWord = instr.t; restWord = instr.r;
              if (step < 6) {
                  const nInstr = getGenericInstruction(step + 1);
                  nextBtmWord = nInstr.b; nextTopWord = nInstr.t; nextRestWord = nInstr.r;
              }
          }

          const hasNext = (isDwojki && step === 1) || (!isDwojki && step < 6);
          const hasRestLine = !isDwojki;

          // Estimate the instruction area needs, then give ALL remaining space to the timer.
          // Instructions area: header label + main fight line + rest line (optional) + next section (optional)
          const instructionLineCount = 1 + (hasRestLine ? 1 : 0); // fight + optional rest
          const nextLineCount = hasNext ? (1 + (hasRestLine ? 1 : 0)) : 0; // next fight + optional rest
          const totalInstructionLines = 1 + instructionLineCount + nextLineCount; // label + current + next

          // Scale fonts from BOTH dimensions, using the LARGER possible value (maximize readability)
          const phaseHeaderFont = clamp(18, Math.min(screenWidth * 0.028, screenHeight * 0.032), 32);
          const instructionLabelFont = clamp(14, Math.min(screenWidth * 0.018, screenHeight * 0.022), 24);
          const mainInstructionFont = clamp(22, Math.min(
            screenWidth * (isWideInstructionLayout ? 0.036 : 0.052),
            screenHeight * 0.048,
          ), 48);
          const mainRestFont = clamp(16, Math.min(
            screenWidth * (isWideInstructionLayout ? 0.028 : 0.038),
            screenHeight * 0.036,
          ), 36);
          const nextInstructionFont = clamp(16, Math.min(
            screenWidth * (isWideInstructionLayout ? 0.028 : 0.038),
            screenHeight * 0.034,
          ), 36);
          const nextRestFont = clamp(14, Math.min(
            screenWidth * (isWideInstructionLayout ? 0.022 : 0.032),
            screenHeight * 0.028,
          ), 28);

          // Estimated heights for fixed areas (header, instructions, buttons)
          const headerAreaHeight = phaseHeaderFont * 1.5 + 12;
          const mainFightLineH = mainInstructionFont * 1.3;
          const mainRestLineH = hasRestLine ? mainRestFont * 1.3 + 6 : 0;
          const mainLabelH = instructionLabelFont * 1.3 + 4;
          const currentSectionH = mainLabelH + mainFightLineH + mainRestLineH;
          const nextSectionH = hasNext ? (mainLabelH + nextInstructionFont * 1.3 + (hasRestLine ? nextRestFont * 1.3 + 6 : 0)) : 0;
          const dividerGap = hasNext ? (isWideInstructionLayout ? 0 : 16) : 0;
          const instructionAreaH = currentSectionH + nextSectionH + dividerGap + 16;
          const btnAreaHeight = clamp(54, screenHeight * 0.075, 76);
          const restingAlertH = isDwojki && currentResting.length > 0 ? mainRestFont * 1.3 + 6 : 0;

          // Timer gets everything remaining
          const fixedAreasTotal = headerAreaHeight + instructionAreaH + restingAlertH + btnAreaHeight + 16;
          const timerAreaHeight = Math.max(60, screenHeight - fixedAreasTotal - (topBarMetrics.estimatedHeight || 0));
          // Width constraint: "00" + ":" + "00" where each digit ~0.6×font, colon~12%+padding
          const timerMaxFromWidth = (screenWidth * 0.86 - 40) / 2.4;
          // Height constraint: fill the available vertical space
          const timerMaxFromHeight = timerAreaHeight * 0.88;
          const timerFontSize = Math.max(40, Math.min(timerMaxFromWidth, timerMaxFromHeight));
          const timerColonFontSize = Math.round(timerFontSize * 0.88);

          const btnPaddingV = clamp(10, screenHeight * 0.018, 18);

          return (
            <SafeAreaView style={styles.safeArea}>
              <View style={[styles.timerContainerGigantic, { paddingVertical: 4 }]}>
                
                <View style={{width: '100%', alignItems: 'center', paddingTop: 4}}>
                  <Text style={[styles.roundInfoGigantic, {marginTop: 0, fontSize: phaseHeaderFont}]}>
                      <Text style={{color: COLORS.textPrimary}}>RUNDA {currentRound} / {roundsTotal} </Text>
                      <Text style={{color: COLORS.textMuted}}>(Etap {step}/{stepsTotal}) - </Text>
                      <Text style={{color: phase === 'PREP' ? COLORS.accentMain : COLORS.textPrimary}}>
                          {phase === 'PREP' ? 'ZMIANA!' : 'PRACA'}
                      </Text>
                  </Text>
                </View>

                <View style={[styles.clockBoxGigantic, {flex: 1, justifyContent: 'center', overflow: 'visible', paddingBottom: 0}]}>
                    <View style={styles.hugeTimerDigitsRow}>
                      <View style={styles.hugeTimerDigitBlock}>
                        <Text
                          style={[
                            styles.hugeTimerTextGigantic,
                            styles.hugeTimerDigitGroup,
                            {
                              fontSize: timerFontSize,
                              lineHeight: Math.round(timerFontSize * 0.92),
                              color: timerColor,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {timerMinutes}
                        </Text>
                      </View>
                      <View style={styles.hugeTimerColonBlock}>
                        <Text
                          style={[
                            styles.hugeTimerTextGigantic,
                            styles.hugeTimerColon,
                            {
                              fontSize: timerColonFontSize,
                              lineHeight: Math.round(timerColonFontSize * 0.88),
                              color: timerColor,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          :
                        </Text>
                      </View>
                      <View style={styles.hugeTimerDigitBlock}>
                        <Text
                          style={[
                            styles.hugeTimerTextGigantic,
                            styles.hugeTimerDigitGroup,
                            {
                              fontSize: timerFontSize,
                              lineHeight: Math.round(timerFontSize * 0.92),
                              color: timerColor,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {timerSeconds}
                        </Text>
                      </View>
                    </View>
                </View>

                <View style={{ flexGrow: 0, flexShrink: 0, flexDirection: isWideInstructionLayout ? 'row' : 'column', justifyContent: 'center', alignItems: 'stretch', width: '100%', paddingHorizontal: 8 }}>
                    
                    <View style={{ flexGrow: isWideInstructionLayout ? 1 : 0, flexShrink: 0, alignItems: 'center', borderRightWidth: isWideInstructionLayout && hasNext ? 2 : 0, borderBottomWidth: !isWideInstructionLayout && hasNext ? 2 : 0, borderColor: COLORS.borderStrong, paddingHorizontal: 8, paddingBottom: !isWideInstructionLayout && hasNext ? 8 : 0, marginBottom: !isWideInstructionLayout && hasNext ? 8 : 0 }}>
                        <Text style={{ fontSize: instructionLabelFont, color: COLORS.textSecondary, marginBottom: 3, fontWeight: '900', textAlign: 'center' }}>
                            {phase === 'PREP' ? 'ZARAZ WALCZĄ:' : 'TERAZ WALCZĄ:'}
                        </Text>
                        
                        <Text style={{ fontSize: mainInstructionFont, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center' }} adjustsFontSizeToFit minimumFontScale={0.45} numberOfLines={isWideInstructionLayout ? 1 : 2} ellipsizeMode="clip">
                            <Text style={{color: getRoleColor(btmWord)}}>{btmWord}</Text>
                            <Text style={{color: COLORS.textSecondary}}> DÓŁ </Text>
                            <Text style={{color: COLORS.textMuted}}> vs </Text>
                            <Text style={{color: getRoleColor(topWord)}}>{topWord}</Text>
                            <Text style={{color: COLORS.textSecondary}}> GÓRA</Text>
                        </Text>
                        
                        {!isDwojki && (
                            <Text style={{ fontSize: mainRestFont, fontWeight: '900', color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }} adjustsFontSizeToFit minimumFontScale={0.45} numberOfLines={isWideInstructionLayout ? 1 : 2} ellipsizeMode="clip">
                                odpoczywa: <Text style={{color: getRoleColor(restWord)}}>{restWord}</Text>
                            </Text>
                        )}
                        {isDwojki && currentResting.length > 0 && (
                            <Text style={{ fontSize: mainRestFont, fontWeight: '900', color: COLORS.accentAlert, textAlign: 'center', marginTop: 4 }}>
                                OSOBY ODPOCZYWAJĄCE NA MATY!
                            </Text>
                        )}
                    </View>

                    {hasNext && (
                        <View style={{ flexGrow: isWideInstructionLayout ? 1 : 0, flexShrink: 0, alignItems: 'center', paddingHorizontal: 8 }}>
                            <Text style={{ fontSize: instructionLabelFont, color: COLORS.textMuted, marginBottom: 3, fontWeight: '900', textAlign: 'center' }}>
                                NASTĘPNA ZMIANA:
                            </Text>
                            
                            <Text style={{ fontSize: nextInstructionFont, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center', opacity: 0.6 }} adjustsFontSizeToFit minimumFontScale={0.45} numberOfLines={isWideInstructionLayout ? 1 : 2} ellipsizeMode="clip">
                                <Text style={{color: getRoleColor(nextBtmWord)}}>{nextBtmWord}</Text>
                                <Text style={{color: COLORS.textSecondary}}> DÓŁ </Text>
                                <Text style={{color: COLORS.textMuted}}> vs </Text>
                                <Text style={{color: getRoleColor(nextTopWord)}}>{nextTopWord}</Text>
                                <Text style={{color: COLORS.textSecondary}}> GÓRA</Text>
                            </Text>
                            
                            {!isDwojki && (
                                <Text style={{ fontSize: nextRestFont, fontWeight: '900', color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, opacity: 0.6 }} adjustsFontSizeToFit minimumFontScale={0.45} numberOfLines={isWideInstructionLayout ? 1 : 2} ellipsizeMode="clip">
                                    odpoczywa: <Text style={{color: getRoleColor(nextRestWord)}}>{nextRestWord}</Text>
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                <View style={[styles.timerButtonsRowGigantic, { marginBottom: 4, padding: 6 }]}>
                  <TouchableOpacity style={[styles.controlButtonGigantic, { paddingVertical: btnPaddingV }, isActive ? styles.btnStandard : styles.btnImportant]} onPress={() => setIsActive(!isActive)}>
                    <Text style={[styles.controlButtonTextGigantic, isActive ? {color: COLORS.textPrimary} : {color: COLORS.bgMain}]}>
                        {isActive ? 'PAUZA' : 'WZNÓW'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlButtonGigantic, { paddingVertical: btnPaddingV }, styles.btnStop]} onPress={handleStopTraining}>
                    <Text style={styles.controlButtonTextGigantic}>ZAKOŃCZ</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {dropoutModal}
            </SafeAreaView>
          );
      }

      // ZADANIÓWKI - UŻYWAMY PREFIKSÓW [A] i [B]
      const renderZadaniowkiCardPrep = (g: any, cardWidth: number, cardHeight: number) => {
          if (isDwojki) {
              const match = g as Match;
              return (
                  <ResponsiveTriadPrepCard
                    leftRole="[A]"
                    leftName={match.p1.id}
                    leftRoleColor={getRoleColor('[A]')}
                    leftNameColor={getGearColor(match.p1.gear)}
                    rightRole="[B]"
                    rightName={match.p2.id}
                    rightRoleColor={getRoleColor('[B]')}
                    rightNameColor={getGearColor(match.p2.gear)}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    reserveRestSpace={false}
                  />
              );
          } else {
              const group = g as RealPlayer[];
              if (group.length === 3) {
                  const { btm, top, rest } = getRoles(step);
                  return (
                      <ResponsiveTriadPrepCard
                        leftRole={letters[btm]}
                        leftName={group[btm].id}
                        leftRoleColor={getRoleColor(letters[btm])}
                        leftNameColor={getGearColor(group[btm].gear)}
                        rightRole={letters[top]}
                        rightName={group[top].id}
                        rightRoleColor={getRoleColor(letters[top])}
                        rightNameColor={getGearColor(group[top].gear)}
                        restRole={letters[rest]}
                        restName={group[rest].id}
                        restRoleColor={getRoleColor(letters[rest])}
                        restNameColor={getGearColor(group[rest].gear)}
                        cardWidth={cardWidth}
                        cardHeight={cardHeight}
                      />
                  );
              } else if (group.length === 2) {
                  return (
                      <ResponsiveTriadPrepCard
                        leftRole="[A]"
                        leftName={group[0].id}
                        leftRoleColor={COLORS.accentMain}
                        leftNameColor={getGearColor(group[0].gear)}
                        rightRole="[B]"
                        rightName={group[1].id}
                        rightRoleColor={COLORS.accentCool}
                        rightNameColor={getGearColor(group[1].gear)}
                        cardWidth={cardWidth}
                        cardHeight={cardHeight}
                        reserveRestSpace={false}
                      />
                  );
              }
          }
          return null;
      };

      const renderPrepGridCells = (
        groups: any[],
        cols: number,
        rows: number,
        cardWidth: number,
        cardHeight: number,
        keyPrefix: string,
      ) => {
        const safeCols = Math.max(1, cols);
        const safeRows = Math.max(1, rows);

        return groups.map((group: any, index: number) => (
          <View
            key={`${keyPrefix}-${index}`}
            style={{
              width: `${100 / safeCols}%` as any,
              height: shouldScrollTriadGrid
                ? cardHeight + responsiveCellPadding * 2
                : `${100 / safeRows}%` as any,
              padding: isTriadPrepGrid ? responsiveCellPadding : 4,
            }}
          >
            {renderZadaniowkiCardPrep(group, cardWidth, cardHeight)}
          </View>
        ));
      };

      const renderMergedGridCells = (
        items: MergedGridItem[],
        cols: number,
        triadCardWidth: number,
        triadCardHeight: number,
        duoCardWidth: number,
        duoCardHeight: number,
        keyPrefix: string,
      ) => {
        const safeCols = Math.max(1, cols);

        return items.map((item, index) => {
          const cw = item.isDuo ? duoCardWidth : triadCardWidth;
          const ch = item.isDuo ? duoCardHeight : triadCardHeight;
          return (
            <View
              key={`${keyPrefix}-${index}`}
              style={{
                width: `${100 / safeCols}%` as any,
                height: ch + responsiveCellPadding * 2,
                padding: responsiveCellPadding,
              }}
            >
              {renderZadaniowkiCardPrep(item.group, cw, ch)}
            </View>
          );
        });
      };

      // --- Dwójki prep grid: sparring-style rendering ---
      if (isDwojkiPrepGrid) {
        const renderDwPairCard = (match: Match, cardWidth: number, cardHeight: number) => (
          <ResponsiveTriadPrepCard
            leftRole="[A]"
            leftName={match.p1.id}
            leftRoleColor={getRoleColor('[A]')}
            leftNameColor={getGearColor(match.p1.gear)}
            rightRole="[B]"
            rightName={match.p2.id}
            rightRoleColor={getRoleColor('[B]')}
            rightNameColor={getGearColor(match.p2.gear)}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            reserveRestSpace={false}
          />
        );

        const renderDwPairCells = (
          matches: Match[],
          spec: PairGridSpec,
          keyPrefix: string,
        ) => matches.map((match, index) => {
          const cellWidth = `${100 / Math.max(1, spec.cols)}%`;
          const cellHeight = `${100 / Math.max(1, spec.rows)}%`;
          const lastRowOffset = getCenteredLastRowOffset(index, matches.length, Math.max(1, spec.cols));
          return (
            <View
              key={`${keyPrefix}-${match.p1.id}-${match.p2.id}-${index}`}
              style={{
                width: isDwojkiPhoneView ? '100%' : cellWidth as any,
                height: isDwojkiPhoneView ? (spec.cardHeight + dwPairCellPadding * 2) : cellHeight as any,
                padding: dwPairCellPadding,
                marginLeft: !isDwojkiPhoneView && lastRowOffset ? `${lastRowOffset}%` as any : 0,
              }}
            >
              {renderDwPairCard(match, spec.cardWidth, spec.cardHeight)}
            </View>
          );
        });

        const renderDwPhonePairList = (
          matches: Match[],
          keyPrefix: string,
        ) => (
          <View style={styles.timerPairPhoneList}>
            {matches.map((match, index) => (
              <View
                key={`${keyPrefix}-phone-${match.p1.id}-${match.p2.id}-${index}`}
                style={{ width: '100%', paddingVertical: dwPairCellPadding }}
              >
                <View style={{ width: '100%', height: dwPhonePairCardHeight }}>
                  {renderDwPairCard(
                    match,
                    Math.max(220, dwPhoneSectionWidth - dwPairSectionPadding * 2 - dwPairCellPadding * 2),
                    dwPhonePairCardHeight,
                  )}
                </View>
              </View>
            ))}
          </View>
        );

        const renderDwMatchSection = (
          title: string,
          color: string,
          matches: Match[],
          spec: PairGridSpec,
          sectionStyle: any,
          keyPrefix: string,
        ) => (
          <View
            style={[
              styles.sideSection,
              isDwojkiPhoneView ? styles.sideSectionStacked : sectionStyle,
              {
                paddingHorizontal: dwPairSectionPadding,
                paddingTop: dwPairSectionPadding,
                paddingBottom: dwPairSectionPadding,
              },
              !isDwojkiPhoneView && { height: dwSplitAreaHeight },
            ]}
          >
            <View style={[styles.matchSectionAccent, { backgroundColor: color }]} />
            <View style={[styles.matchSectionHeader, { minHeight: dwPairHeaderHeight }]}>
              <Text style={[styles.matchSectionTitle, { color }]}>{title}</Text>
            </View>
            {isDwojkiPhoneView ? (
              renderDwPhonePairList(matches, keyPrefix)
            ) : (
              <View
                style={[
                  styles.gridWrap,
                  styles.gridWrapNoScroll,
                  { flex: 1, marginHorizontal: -dwPairCellPadding, marginBottom: -dwPairCellPadding },
                ]}
              >
                {renderDwPairCells(matches, spec, keyPrefix)}
              </View>
            )}
          </View>
        );

        const dwPairsContent = (
          <>
            {isDwojkiPhoneView ? (
              <>
                {hasKidSection &&
                  renderDwMatchSection('KID', COLORS.accentCool, kidsPairs, dwKidsGridSpec, { width: '100%' }, 'dw-kid')}
                {hasAdultSection && (
                  <View style={{ marginTop: hasKidSection ? dwPairSectionGap : 0 }}>
                    {renderDwMatchSection('ADULT', COLORS.accentMain, adultsPairs, dwAdultsGridSpec, { width: '100%' }, 'dw-adult')}
                  </View>
                )}
              </>
            ) : (
              (hasKidSection || hasAdultSection) && (
                <View style={[styles.splitMainArea, { gap: dwPairSectionGap, minHeight: dwSplitAreaHeight }]}>
                  {hasKidSection &&
                    renderDwMatchSection('KID', COLORS.accentCool, kidsPairs, dwKidsGridSpec, dwKidsSectionStyle, 'dw-kid')}
                  {hasAdultSection &&
                    renderDwMatchSection('ADULT', COLORS.accentMain, adultsPairs, dwAdultsGridSpec, dwAdultsSectionStyle, 'dw-adult')}
                </View>
              )
            )}

            {currentResting.length > 0 && (
              <View
                style={[
                  styles.sideSection,
                  styles.pairMetaSection,
                  {
                    marginTop: hasKidSection || hasAdultSection ? dwPairSectionGap : 0,
                    paddingHorizontal: dwPairSectionPadding,
                    paddingTop: dwPairSectionPadding,
                    paddingBottom: dwPairSectionPadding,
                  },
                  !isDwojkiPhoneView && { minHeight: dwRestingPanelHeight, height: dwRestingPanelHeight },
                ]}
              >
                <View style={[styles.matchSectionAccent, { backgroundColor: COLORS.accentAlert }]} />
                <View style={[styles.matchSectionHeader, { minHeight: dwPairHeaderHeight }]}>
                  <Text style={[styles.matchSectionTitle, { color: COLORS.accentAlert }]}>ODPOCZYWA</Text>
                </View>
                <View style={[styles.restingWrapMath, { flex: isDwojkiPhoneView ? 0 : 1, marginTop: 2 }]}>
                  {currentResting.map((playerObj) => (
                    <View key={playerObj.id} style={styles.restingBadge}>
                      <Text style={styles.restingPlayerTextMath} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1}>
                        {playerObj.id}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        );

        return (
          <SafeAreaView style={styles.safeArea}>
            <View
              style={[
                styles.topBar,
                dwStackTopBar && styles.topBarStacked,
                { paddingHorizontal: topBarMetrics.paddingHorizontal, paddingVertical: topBarMetrics.paddingVertical },
              ]}
            >
              <View style={{ flex: dwStackTopBar ? 0 : 1, width: dwStackTopBar ? '100%' : undefined, paddingRight: dwStackTopBar ? 0 : 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {!isDwojkiPhoneView && <Image source={APP_LOGO} style={{ width: Math.round(topBarMetrics.timerFont + topBarMetrics.timerPaddingVertical * 1.4 + 8), height: Math.round(topBarMetrics.timerFont + topBarMetrics.timerPaddingVertical * 1.4 + 8), borderRadius: 12 }} resizeMode="contain" />}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.topBarRound, { fontSize: topBarMetrics.roundFont }]}>RUNDA {currentRound} / {roundsTotal}</Text>
                    <Text style={[styles.topBarPhase, { color: COLORS.accentMain, fontSize: topBarMetrics.phaseFont }]}>PRZYGOTOWANIE</Text>
                    {dwojkiLegendItems.length > 0 && (
                      <View style={[styles.triadLegendRow, { marginTop: 4 }]}>
                        {dwojkiLegendItems.map(item => (
                          <View key={item.role} style={styles.triadLegendItem}>
                            <Text style={[styles.triadLegendRole, { color: getTriadRoleAccent(item.role, getRoleColor(item.role)) }]}>{item.role}</Text>
                            <Text style={styles.triadLegendLabel}>{item.label}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.topBarTimerBox,
                  dwStackTopBar && styles.topBarTimerBoxStacked,
                  {
                    borderColor: COLORS.accentMain,
                    paddingHorizontal: Math.round(topBarMetrics.timerPaddingHorizontal * 0.72),
                    paddingVertical: Math.round(topBarMetrics.timerPaddingVertical * 0.7),
                  },
                  countdownTimerBoxStyle,
                ]}
              >
                <Text
                  style={[
                    styles.topBarTimer,
                    { color: COLORS.accentMain, fontSize: Math.round(topBarMetrics.timerFont * 0.84) },
                    countdownTimerTextStyle,
                  ]}
                >
                  {formatTime(timeLeft)}
                </Text>
              </View>
            </View>

            {isDwojkiPhoneView ? (
              <ScrollView
                style={styles.timerScroll}
                contentContainerStyle={[
                  styles.timerScrollContent,
                  {
                    paddingHorizontal: dwPairOuterPadding,
                    paddingTop: dwPairOuterPadding,
                    paddingBottom: dwPairOuterPadding,
                    gap: dwPairSectionGap,
                  },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {dwPairsContent}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.matchmakingMainContainer,
                  { paddingHorizontal: dwPairOuterPadding, paddingTop: dwPairOuterPadding, paddingBottom: dwPairOuterPadding },
                ]}
                onLayout={handleZadaniowkiMainLayout}
              >
                {dwPairsContent}
              </View>
            )}

            <View style={[styles.bottomButtonsBar, { paddingHorizontal: bottomBarMetrics.gap, paddingVertical: bottomBarMetrics.gap, flexWrap: bottomBarMetrics.wrap ? 'wrap' : 'nowrap' }]}>
              <TouchableOpacity style={[styles.controlButtonSmall, { paddingVertical: bottomBarMetrics.buttonPaddingVertical, paddingHorizontal: bottomBarMetrics.buttonPaddingHorizontal, minWidth: bottomBarMetrics.buttonMinWidth, marginHorizontal: bottomBarMetrics.gap / 2, marginVertical: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : 0, flexBasis: bottomBarMetrics.wrap ? '47%' : undefined, flexGrow: bottomBarMetrics.wrap ? 1 : 0 }, isActive ? styles.btnStandard : styles.btnImportant]} onPress={() => setIsActive(!isActive)}>
                <Text style={[styles.controlButtonTextSmall, { fontSize: bottomBarMetrics.buttonFont }, isActive ? { color: COLORS.textPrimary } : { color: COLORS.bgMain }]}>
                  {isActive ? 'PAUZA' : 'WZNÓW'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButtonSmall, { paddingVertical: bottomBarMetrics.buttonPaddingVertical, paddingHorizontal: bottomBarMetrics.buttonPaddingHorizontal, minWidth: bottomBarMetrics.buttonMinWidth, marginHorizontal: bottomBarMetrics.gap / 2, marginVertical: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : 0, flexBasis: bottomBarMetrics.wrap ? '47%' : undefined, flexGrow: bottomBarMetrics.wrap ? 1 : 0 }, styles.btnSecondary]} onPress={handleOpenDropoutModal}>
                <Text style={[styles.controlButtonTextSmall, { fontSize: bottomBarMetrics.buttonFont, color: COLORS.accentAlert }]}>KTOŚ WYPADŁ?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButtonSmall, { paddingVertical: bottomBarMetrics.buttonPaddingVertical, paddingHorizontal: bottomBarMetrics.buttonPaddingHorizontal, minWidth: bottomBarMetrics.buttonMinWidth, marginHorizontal: bottomBarMetrics.gap / 2, marginVertical: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : 0, flexBasis: bottomBarMetrics.wrap ? '47%' : undefined, flexGrow: bottomBarMetrics.wrap ? 1 : 0 }, styles.btnStop]} onPress={handleStopTraining}>
                <Text style={[styles.controlButtonTextSmall, { fontSize: bottomBarMetrics.buttonFont }]}>ZAKOŃCZ</Text>
              </TouchableOpacity>
            </View>
            {dropoutModal}
          </SafeAreaView>
        );
      }
      
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.topBar, { paddingHorizontal: topBarMetrics.paddingHorizontal, paddingVertical: topBarMetrics.paddingVertical }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {screenWidth >= 760 && <Image source={APP_LOGO} style={{ width: Math.round(topBarMetrics.timerFont + topBarMetrics.timerPaddingVertical * 1.4 + 8), height: Math.round(topBarMetrics.timerFont + topBarMetrics.timerPaddingVertical * 1.4 + 8), borderRadius: 12 }} resizeMode="contain" />}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topBarRound, { fontSize: topBarMetrics.roundFont }]}>RUNDA {currentRound} / {roundsTotal}</Text>
                  <Text style={[styles.topBarPhase, { color: COLORS.accentMain, fontSize: topBarMetrics.phaseFont }]}>PRZYGOTOWANIE</Text>
                  {triadLegend && (
                    <View style={[styles.triadLegendRow, { marginTop: 4 }]}>
                      {triadLegendItems.map(item => (
                        <View key={item.role} style={styles.triadLegendItem}>
                          <Text style={[styles.triadLegendRole, { color: getTriadRoleAccent(item.role, getRoleColor(item.role)) }]}>{item.role}</Text>
                          <Text style={styles.triadLegendLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {isDwojki && dwojkiLegendItems.length > 0 && (
                    <View style={[styles.triadLegendRow, { marginTop: 4 }]}>
                      {dwojkiLegendItems.map(item => (
                        <View key={item.role} style={styles.triadLegendItem}>
                          <Text style={[styles.triadLegendRole, { color: getTriadRoleAccent(item.role, getRoleColor(item.role)) }]}>{item.role}</Text>
                          <Text style={styles.triadLegendLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View
              style={[
                styles.topBarTimerBox,
                {
                  borderColor: COLORS.accentMain,
                  paddingHorizontal: Math.round(topBarMetrics.timerPaddingHorizontal * 0.72),
                  paddingVertical: Math.round(topBarMetrics.timerPaddingVertical * 0.7),
                },
                countdownTimerBoxStyle,
              ]}
            >
              <Text
                style={[
                  styles.topBarTimer,
                  { color: COLORS.accentMain, fontSize: Math.round(topBarMetrics.timerFont * 0.84) },
                  countdownTimerTextStyle,
                ]}
              >
                {formatTime(timeLeft)}
              </Text>
            </View>
          </View>

          <ScrollView
            style={[
              styles.matchmakingMainContainer,
              isTriadPrepGrid && {
                paddingHorizontal: responsiveOuterPadding,
                paddingTop: responsiveOuterPadding,
                paddingBottom: responsiveOuterPadding,
              },
            ]}
            contentContainerStyle={(shouldScrollTriadGrid || isTriadPrepGrid) ? { flexGrow: 1 } : { flex: 1 }}
            scrollEnabled={shouldScrollTriadGrid}
            showsVerticalScrollIndicator={shouldScrollTriadGrid}
            onLayout={isTriadPrepGrid ? handleZadaniowkiMainLayout : undefined}
          >
            <View
              style={[
                styles.splitMainArea,
                (shouldScrollTriadGrid || isTriadPrepGrid) && {
                  flexGrow: 0,
                  flexShrink: 0,
                  minHeight: stackPrepSections
                    ? (kidsSectionExplicitHeight ?? 0) + (adultsSectionExplicitHeight ?? 0) + responsiveSectionGap
                    : Math.max(kidsSectionExplicitHeight ?? 0, adultsSectionExplicitHeight ?? 0),
                },
                isTriadPrepGrid && {
                  flexDirection: stackPrepSections ? 'column' : 'row',
                  gap: responsiveSectionGap,
                },
              ]}
            >
              
              {kData.length > 0 && (
                <View
                  style={[
                    styles.sideSection,
                    isTriadPrepGrid
                      ? (stackPrepSections
                        ? { flexGrow: 0, flexShrink: 0, height: kidsSectionExplicitHeight }
                        : { flex: kidsFlex, height: kidsSectionExplicitHeight })
                      : shouldScrollTriadGrid
                        ? { flexGrow: 0, flexShrink: 0, height: kidsSectionScrollHeight }
                        : { flex: stackPrepSections ? kidsRows : kidsFlex },
                    {
                      paddingHorizontal: responsiveSectionPadding,
                      paddingTop: responsiveSectionPadding,
                      paddingBottom: responsiveSectionPadding,
                    },
                  ]}
                >
                  <View style={[styles.matchSectionAccent, { backgroundColor: COLORS.accentCool }]} />
                  <View style={styles.matchSectionHeader}>
                    <Text style={[styles.matchSectionTitle, { color: COLORS.accentCool }]}>KID</Text>
                  </View>
                  {isTriadPrepGrid ? (
                    <View style={[styles.gridWrap, { flex: 0, flexGrow: 0, flexShrink: 0, height: kidsMergedGridHeight }]}>
                      {renderMergedGridCells(kMergedData, kidsCols, kidsCardWidth, kidsCardHeight, kidsDuoCardWidth, kidsDuoCardHeight, 'dz')}
                    </View>
                  ) : (
                    <View style={[styles.gridWrap, shouldScrollTriadGrid && { flex: 0, flexGrow: 0, flexShrink: 0, height: Math.ceil(kData.length / kidsCols) * (kidsCardHeight + responsiveCellPadding * 2) }]}>
                        {kData.map((group: any, index: number) => {
                          const remainder = kData.length % kidsCols;
                          const isLastRow = remainder !== 0 && index >= kData.length - remainder;
                          const cellWidth = isLastRow
                              ? `${100 / remainder}%`
                              : `${100 / kidsCols}%`;
                          const lastRowOffset = getLastRowOffset(index, kData.length, kidsCols);

                          return (
                            <View key={`dz-${index}`} style={{ width: cellWidth as any, height: shouldScrollTriadGrid ? kidsCardHeight + responsiveCellPadding * 2 : `${100/kidsRows}%`, padding: 4, marginLeft: lastRowOffset ? `${lastRowOffset}%` as any : 0, justifyContent: isDwojki ? 'center' : undefined }}>
                                {renderZadaniowkiCardPrep(group, kidsCardWidth, kidsCardHeight)}
                            </View>
                          );
                        })}
                    </View>
                  )}
                </View>
              )}

              {aData.length > 0 && (
                <View
                  style={[
                    styles.sideSection,
                    isTriadPrepGrid
                      ? (stackPrepSections
                        ? { flexGrow: 0, flexShrink: 0, height: adultsSectionExplicitHeight }
                        : { flex: adultsFlex, height: adultsSectionExplicitHeight })
                      : shouldScrollTriadGrid
                        ? { flexGrow: 0, flexShrink: 0, height: adultsSectionScrollHeight }
                        : { flex: stackPrepSections ? adultsRows : adultsFlex },
                    {
                      paddingHorizontal: responsiveSectionPadding,
                      paddingTop: responsiveSectionPadding,
                      paddingBottom: responsiveSectionPadding,
                    },
                  ]}
                >
                  <View style={[styles.matchSectionAccent, { backgroundColor: COLORS.accentMain }]} />
                  <View style={styles.matchSectionHeader}>
                    <Text style={[styles.matchSectionTitle, { color: COLORS.accentMain }]}>ADULT</Text>
                  </View>
                  {isTriadPrepGrid ? (
                    <View style={[styles.gridWrap, { flex: 0, flexGrow: 0, flexShrink: 0, height: adultsMergedGridHeight }]}>
                      {renderMergedGridCells(aMergedData, adultsCols, adultsCardWidth, adultsCardHeight, adultsDuoCardWidth, adultsDuoCardHeight, 'do')}
                    </View>
                  ) : (
                    <View style={[styles.gridWrap, shouldScrollTriadGrid && { flex: 0, flexGrow: 0, flexShrink: 0, height: Math.ceil(aData.length / adultsCols) * (adultsCardHeight + responsiveCellPadding * 2) }]}>
                        {aData.map((group: any, index: number) => {
                          const remainder = aData.length % adultsCols;
                          const isLastRow = remainder !== 0 && index >= aData.length - remainder;
                          const cellWidth = isLastRow
                              ? `${100 / remainder}%`
                              : `${100 / adultsCols}%`;
                          const lastRowOffset = getLastRowOffset(index, aData.length, adultsCols);

                          return (
                            <View key={`do-${index}`} style={{ width: cellWidth as any, height: shouldScrollTriadGrid ? adultsCardHeight + responsiveCellPadding * 2 : `${100/adultsRows}%`, padding: 4, marginLeft: lastRowOffset ? `${lastRowOffset}%` as any : 0, justifyContent: isDwojki ? 'center' : undefined }}>
                                {renderZadaniowkiCardPrep(group, adultsCardWidth, adultsCardHeight)}
                            </View>
                          );
                        })}
                    </View>
                  )}
                </View>
              )}
            </View>
            {isDwojki && currentResting.length > 0 && (
              <View style={styles.restingContainerMath}>
                <Text style={styles.restingTitleMath}>ODPOCZYWA:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  {currentResting.map((playerObj, idx) => (
                    <View key={idx} style={styles.restingBadge}>
                      <Text style={[styles.restingPlayerTextMath, {color: COLORS.accentAlert}]}>{playerObj.id}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={[styles.bottomButtonsBar, { paddingHorizontal: bottomBarMetrics.gap, paddingVertical: bottomBarMetrics.gap, flexWrap: bottomBarMetrics.wrap ? 'wrap' : 'nowrap' }]}>
              <TouchableOpacity style={[styles.controlButtonSmall, { paddingVertical: bottomBarMetrics.buttonPaddingVertical, paddingHorizontal: bottomBarMetrics.buttonPaddingHorizontal, minWidth: bottomBarMetrics.buttonMinWidth, marginHorizontal: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : bottomBarMetrics.gap / 2, marginVertical: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : 0, flexBasis: bottomBarMetrics.wrap ? '47%' : undefined, flexGrow: bottomBarMetrics.wrap ? 1 : 0 }, isActive ? styles.btnStandard : styles.btnImportant]} onPress={() => setIsActive(!isActive)}>
                <Text style={[styles.controlButtonTextSmall, { fontSize: bottomBarMetrics.buttonFont }, isActive ? {color: COLORS.textPrimary} : {color: COLORS.bgMain}]}>
                    {isActive ? 'PAUZA' : 'WZNÓW'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButtonSmall, { paddingVertical: bottomBarMetrics.buttonPaddingVertical, paddingHorizontal: bottomBarMetrics.buttonPaddingHorizontal, minWidth: bottomBarMetrics.buttonMinWidth, marginHorizontal: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : bottomBarMetrics.gap / 2, marginVertical: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : 0, flexBasis: bottomBarMetrics.wrap ? '47%' : undefined, flexGrow: bottomBarMetrics.wrap ? 1 : 0 }, styles.btnSecondary]} onPress={handleOpenDropoutModal}>
                <Text style={[styles.controlButtonTextSmall, { fontSize: bottomBarMetrics.buttonFont, color: COLORS.accentAlert }]}>KTOŚ WYPADŁ?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButtonSmall, { paddingVertical: bottomBarMetrics.buttonPaddingVertical, paddingHorizontal: bottomBarMetrics.buttonPaddingHorizontal, minWidth: bottomBarMetrics.buttonMinWidth, marginHorizontal: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : bottomBarMetrics.gap / 2, marginVertical: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : 0, flexBasis: bottomBarMetrics.wrap ? '47%' : undefined, flexGrow: bottomBarMetrics.wrap ? 1 : 0 }, styles.btnStop]} onPress={handleStopTraining}>
                <Text style={[styles.controlButtonTextSmall, { fontSize: bottomBarMetrics.buttonFont }]}>ZAKOŃCZ</Text>
              </TouchableOpacity>
          </View>
          {dropoutModal}
        </SafeAreaView>
      );
  }

  if (currentScreen === 'timer') {
    let isPrep = phase === 'PREP';
    const isEnding = timeLeft <= 15 && phase === 'WORK';
    let timerColor = isEnding ? COLORS.accentAlert : (isPrep ? COLORS.accentMain : COLORS.textPrimary);
    
    let phaseText = phase === 'PREP' ? 'PRZYGOTOWANIE' : 'PRZERWA';
    const displayRound = phase === 'PREP' ? currentRound : currentRound + 1;

    const kidsPairs = currentMatches.filter(m => m.p1.type === 'KID' && m.p2.type === 'KID');
    const adultsPairs = currentMatches.filter(m => m.p1.type === 'ADULT' && m.p2.type === 'ADULT');
    const mixedPairs = currentMatches.filter(m => m.p1.type !== m.p2.type);

    if (phase === 'WORK') {
      const workTimerLabel = formatTime(timeLeft);
      const [workMinutes = '00', workSeconds = '00'] = workTimerLabel.split(':');
      const colonWidth = Math.max(54, screenWidth * 0.12);
      const digitBlockWidth = (screenWidth - 36 - colonWidth) / 2;
      const timerDigitFontSize = clamp(
        80,
        Math.min(
          digitBlockWidth * 0.82,
          (screenHeight - 160) * 0.82,
        ),
        500,
      );
      const timerColonFontSize = Math.round(timerDigitFontSize * 0.9);
      const workTimerButtonFont = clamp(20, bottomBarMetrics.buttonFont + 3, 24);
      const workTimerAccent = isEnding ? COLORS.accentAlert : COLORS.accentMain;
      const workTimerGap = clamp(6, screenWidth * 0.008, 10);
      const workTimerButtonMinWidth = bottomBarMetrics.wrap ? 176 : 164;

      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.workTimerScreen}>
            <View style={styles.workTimerHeader}>
              <View style={[styles.controlPanelAccent, { backgroundColor: workTimerAccent }]} />
              <Text style={[styles.workTimerRoundTitle, { color: COLORS.textPrimary }]}>RUNDA {currentRound} / {roundsTotal}</Text>
            </View>

            <View style={styles.workTimerHeroWrap}>
              <View style={[styles.workTimerHeroCard, countdownPanelStyle]}>
                <View style={[styles.controlPanelAccent, { backgroundColor: workTimerAccent }]} />
                <View style={styles.workTimerDigitsRow}>
                  <View style={styles.workTimerDigitBlock}>
                    <Text
                      style={[
                        styles.workTimerHeroValue,
                        styles.workTimerDigitGroup,
                        { fontSize: timerDigitFontSize, lineHeight: Math.round(timerDigitFontSize * 0.92), color: timerColor },
                        countdownTimerTextStyle,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.4}
                    >
                      {workMinutes}
                    </Text>
                  </View>
                  <View style={styles.workTimerColonBlock}>
                    <Text
                      style={[
                        styles.workTimerHeroValue,
                        styles.workTimerColon,
                        { fontSize: timerColonFontSize, lineHeight: Math.round(timerColonFontSize * 0.9), color: timerColor },
                        countdownTimerTextStyle,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.4}
                    >
                      :
                    </Text>
                  </View>
                  <View style={styles.workTimerDigitBlock}>
                    <Text
                      style={[
                        styles.workTimerHeroValue,
                        styles.workTimerDigitGroup,
                        { fontSize: timerDigitFontSize, lineHeight: Math.round(timerDigitFontSize * 0.92), color: timerColor },
                        countdownTimerTextStyle,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.4}
                    >
                      {workSeconds}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.bottomButtonsBar,
                styles.workTimerBottomBar,
                {
                  paddingHorizontal: workTimerGap,
                  paddingVertical: workTimerGap,
                  flexWrap: bottomBarMetrics.wrap ? 'wrap' : 'nowrap',
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.controlButtonSmall,
                  styles.workTimerActionButton,
                  {
                    paddingVertical: clamp(10, bottomBarMetrics.buttonPaddingVertical - 2, 14),
                    paddingHorizontal: clamp(16, bottomBarMetrics.buttonPaddingHorizontal - 1, 22),
                    minWidth: workTimerButtonMinWidth,
                    marginHorizontal: workTimerGap / 2,
                    marginVertical: bottomBarMetrics.wrap ? workTimerGap / 2 : 0,
                    flexBasis: bottomBarMetrics.wrap ? '47%' : undefined,
                    flexGrow: bottomBarMetrics.wrap ? 1 : 0,
                  },
                  isActive ? styles.btnStandard : styles.btnImportant,
                ]}
                onPress={() => setIsActive(!isActive)}
              >
                <Text
                  style={[
                    styles.controlButtonTextSmall,
                    styles.workTimerActionText,
                    { fontSize: workTimerButtonFont, lineHeight: Math.round(workTimerButtonFont * 1.02) },
                    isActive ? { color: COLORS.textPrimary } : { color: COLORS.bgMain },
                  ]}
                >
                  {isActive ? 'PAUZA' : 'WZNÓW'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.controlButtonSmall,
                  styles.workTimerActionButton,
                  {
                    paddingVertical: clamp(10, bottomBarMetrics.buttonPaddingVertical - 2, 14),
                    paddingHorizontal: clamp(16, bottomBarMetrics.buttonPaddingHorizontal - 1, 22),
                    minWidth: workTimerButtonMinWidth,
                    marginHorizontal: workTimerGap / 2,
                    marginVertical: bottomBarMetrics.wrap ? workTimerGap / 2 : 0,
                    flexBasis: bottomBarMetrics.wrap ? '47%' : undefined,
                    flexGrow: bottomBarMetrics.wrap ? 1 : 0,
                  },
                  styles.btnStop,
                ]}
                onPress={handleStopTraining}
              >
                <Text
                  style={[
                    styles.controlButtonTextSmall,
                    styles.workTimerActionText,
                    { fontSize: workTimerButtonFont, lineHeight: Math.round(workTimerButtonFont * 1.02) },
                  ]}
                >
                  ZAKOŃCZ
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    const pairFontScale = PixelRatio.getFontScale();
    let isPhonePairsView =
      screenWidth < 760 ||
      Math.min(screenWidth, screenHeight) < 560 ||
      (screenHeight < 560 && screenWidth < 980) ||
      (pairFontScale > 1.12 && screenWidth < 900);
    const hasKidSection = kidsPairs.length > 0;
    const hasAdultSection = adultsPairs.length > 0;
    const hasBothSections = hasKidSection && hasAdultSection;

    // Dynamic check: can pairs actually fit at readable size in grid mode?
    // On tablet (>=1000px) never switch to phone view — cards shrink to fit.
    if (!isPhonePairsView && screenWidth < 1000 && (kidsPairs.length > 0 || adultsPairs.length > 0)) {
      const estContentHeight = screenHeight - topBarMetrics.estimatedHeight - bottomBarMetrics.estimatedHeight - 48;
      const estMixedReserve = mixedPairs.length > 0 ? 140 : 0;
      const estRestingReserve = currentResting.length > 0 ? 90 : 0;
      const estGridBodyHeight = Math.max(80, estContentHeight - estMixedReserve - estRestingReserve - 70);

      const pairsFitInGrid = (pairCount: number, widthRatio: number) => {
        if (pairCount <= 0) return true;
        const estWidth = screenWidth * widthRatio;
        const estMaxCols = Math.max(1, Math.floor(estWidth / 270));
        const cols = Math.min(pairCount, estMaxCols);
        const rows = Math.ceil(pairCount / cols);
        return estGridBodyHeight / rows >= 88;
      };

      const kidsOk = pairsFitInGrid(kidsPairs.length, hasBothSections ? 0.28 : 0.85);
      const adultsOk = pairsFitInGrid(adultsPairs.length, hasBothSections ? 0.68 : 0.85);

      if (!kidsOk || !adultsOk) {
        isPhonePairsView = true;
      }
    }

    const pairOuterPadding = clamp(8, screenWidth * 0.01, 14);
    const pairSectionGap = clamp(8, screenWidth * 0.01, 16);
    const pairSectionPadding = clamp(10, screenWidth * 0.012, 18);
    const pairCellPadding = clamp(4, screenWidth * 0.0038, 6);
    const pairHeaderHeight = clamp(30, screenHeight * 0.04, 40);
    const phonePairCardHeight = clamp(116, Math.min(screenWidth * 0.34, screenHeight * 0.22), 156);
    const phoneMixedCardHeight = clamp(98, Math.min(screenWidth * 0.26, screenHeight * 0.18), 126);
    const measuredPairsMainWidth = pairsMainLayout.width > 0 ? pairsMainLayout.width : screenWidth;
    const measuredPairsMainHeight = pairsMainLayout.height > 0
      ? pairsMainLayout.height
      : Math.max(260, screenHeight - topBarMetrics.estimatedHeight - bottomBarMetrics.estimatedHeight - 28);
    const pairContentWidth = Math.max(260, measuredPairsMainWidth - pairOuterPadding * 2);
    const pairContentHeight = Math.max(220, measuredPairsMainHeight - pairOuterPadding * 2);
    const totalSplitPairs = Math.max(1, kidsPairs.length + adultsPairs.length);

    const restingBadgeColumns = Math.max(1, Math.floor(pairContentWidth / 210));
    const restingBadgeRows = currentResting.length > 0
      ? Math.ceil(currentResting.length / restingBadgeColumns)
      : 0;
    const restingSectionHeight = currentResting.length > 0
      ? Math.max(
          74,
          pairSectionPadding * 2 +
            24 +
            restingBadgeRows * 42 +
            Math.max(0, restingBadgeRows - 1) * 8
        )
      : 0;
    const restingPanelHeight = currentResting.length > 0 ? restingSectionHeight + pairHeaderHeight : 0;

    const mixedCardHeight = isPhonePairsView
      ? clamp(98, screenHeight * 0.12, 124)
      : clamp(58, screenHeight * 0.07, 86);
    const mixedListCardHeight = isPhonePairsView
      ? phoneMixedCardHeight
      : Math.max(64, mixedCardHeight);
    const mixedRows = mixedPairs.length;
    const mixedSectionHeight = mixedPairs.length > 0
      ? Math.max(
          64,
          pairSectionPadding * 2 +
            mixedRows * (mixedListCardHeight + pairCellPadding * 2) +
            Math.max(0, mixedRows - 1) * pairCellPadding * 2
        )
      : 0;
    const mixedPanelHeight = mixedPairs.length > 0 ? mixedSectionHeight + pairHeaderHeight : 0;

    // On tablet grid view, place MIESZANE + ODPOCZYWA inside a side column
    // to give the main pair grid the full vertical space.
    // When both KID and ADULT exist: embed in KID column.
    // When only ADULT exists but mixed pairs exist: create a side column for mixed.
    const embedMixedInSide = !isPhonePairsView && hasBothSections && mixedPairs.length > 0;
    const embedRestingInSide = !isPhonePairsView && hasBothSections && currentResting.length > 0 && mixedPairs.length > 0;
    const embedMixedAsColumn = !isPhonePairsView && !hasBothSections && mixedPairs.length > 0
      && (hasKidSection || hasAdultSection);
    const embedRestingAsColumn = !isPhonePairsView && !hasBothSections && currentResting.length > 0
      && (hasKidSection || hasAdultSection) && embedMixedAsColumn;
    const anyEmbedMixed = embedMixedInSide || embedMixedAsColumn;
    const anyEmbedResting = embedRestingInSide || embedRestingAsColumn;

    const pairBottomSectionsGap =
      (mixedPairs.length > 0 && !anyEmbedMixed ? pairSectionGap : 0) +
      (currentResting.length > 0 && !anyEmbedResting ? pairSectionGap : 0);
    const splitAreaHeight = isPhonePairsView
      ? 0
      : Math.max(160, pairContentHeight
        - (anyEmbedMixed ? 0 : mixedPanelHeight)
        - (anyEmbedResting ? 0 : restingPanelHeight)
        - pairBottomSectionsGap);
    // Side column width for embed-as-column layout (mixed pairs beside main grid)
    const mixedSideColumnWidth = embedMixedAsColumn ? clamp(220, pairContentWidth * 0.24, 320) : 0;
    const splitAreaWidth = hasBothSections
      ? Math.max(260, pairContentWidth - pairSectionGap)
      : embedMixedAsColumn
        ? Math.max(260, pairContentWidth - mixedSideColumnWidth - pairSectionGap)
        : pairContentWidth;
    const phoneSectionWidth = Math.max(240, pairContentWidth);
    const kidsWidthRatio = hasBothSections
      ? clamp(0.22, kidsPairs.length / totalSplitPairs, kidsPairs.length >= 5 ? 0.42 : 0.34)
      : 1;
    const kidsPreferredWidth = hasBothSections
      ? clamp(240, splitAreaWidth * kidsWidthRatio, kidsPairs.length >= 5 ? 480 : 360)
      : splitAreaWidth;
    const kidsSectionWidth = hasKidSection
      ? (hasBothSections ? kidsPreferredWidth : splitAreaWidth)
      : 0;
    const adultsSectionWidth = hasAdultSection
      ? (hasBothSections ? Math.max(280, splitAreaWidth - kidsSectionWidth) : splitAreaWidth)
      : 0;
    const sectionBodyHeight = isPhonePairsView
      ? 0
      : Math.max(110, splitAreaHeight - pairSectionPadding * 2 - pairHeaderHeight);
    // Kids grid gets less height when mixed/resting are embedded in the kid column
    const embeddedMixedHeight = embedMixedInSide ? mixedPanelHeight + pairSectionGap : 0;
    const embeddedRestingHeight = embedRestingInSide ? restingPanelHeight + pairSectionGap : 0;
    const kidsSectionBodyHeight = isPhonePairsView
      ? 0
      : Math.max(80, sectionBodyHeight - embeddedMixedHeight - embeddedRestingHeight);
    const kidsBodyWidth = isPhonePairsView
      ? Math.max(220, phoneSectionWidth - pairSectionPadding * 2)
      : Math.max(180, kidsSectionWidth - pairSectionPadding * 2);
    const adultsBodyWidth = isPhonePairsView
      ? Math.max(220, phoneSectionWidth - pairSectionPadding * 2)
      : Math.max(220, adultsSectionWidth - pairSectionPadding * 2);
    const kidsGridSpec = getBestPairGridSpec({
      count: kidsPairs.length,
      sectionWidth: kidsBodyWidth,
      sectionHeight: kidsSectionBodyHeight,
      cellPadding: pairCellPadding,
      minCardWidth: isPhonePairsView ? kidsBodyWidth : 180,
      minCardHeight: isPhonePairsView ? phonePairCardHeight : 68,
      preferredCardWidth: isPhonePairsView ? kidsBodyWidth : 240,
      maxCols: isPhonePairsView ? 1 : Math.min(kidsPairs.length || 1, 2),
      allowScroll: isPhonePairsView,
    });
    const adultsGridSpec = getBestPairGridSpec({
      count: adultsPairs.length,
      sectionWidth: adultsBodyWidth,
      sectionHeight: sectionBodyHeight,
      cellPadding: pairCellPadding,
      minCardWidth: isPhonePairsView ? adultsBodyWidth : 180,
      minCardHeight: isPhonePairsView ? phonePairCardHeight : 68,
      preferredCardWidth: isPhonePairsView ? adultsBodyWidth : 300,
      maxCols: isPhonePairsView
        ? 1
        : Math.min(
            adultsPairs.length || 1,
            adultsBodyWidth >= 1100 ? 4 : adultsBodyWidth >= 650 ? 3 : 2,
          ),
      allowScroll: isPhonePairsView,
    });
    const mixedBodyWidth = Math.max(220, pairContentWidth - pairSectionPadding * 2);
    const stackTimerTopBar = isPhonePairsView && screenWidth < 560;
    const kidsSectionStyle = hasBothSections
      ? {
          flexBasis: kidsSectionWidth,
          width: kidsSectionWidth,
          maxWidth: kidsSectionWidth,
          flexGrow: 0,
          flexShrink: 0,
        }
      : { flex: 1 };
    const adultsSectionStyle = hasBothSections
      ? {
          flexBasis: adultsSectionWidth,
          width: adultsSectionWidth,
          maxWidth: adultsSectionWidth,
          flexGrow: 0,
          flexShrink: 0,
        }
      : { flex: 1 };

    const renderPairCard = (
      match: Match,
      cardWidth: number,
      cardHeight: number,
      layout: 'stacked' | 'row' | 'auto',
    ) => {
      return (
        <ResponsiveTriadPrepCard
          leftRole="[A]"
          leftName={match.p1.id}
          leftRoleColor={COLORS.accentMain}
          leftNameColor={getGearColor(match.p1.gear)}
          rightRole="[B]"
          rightName={match.p2.id}
          rightRoleColor={COLORS.accentCool}
          rightNameColor={getGearColor(match.p2.gear)}
          cardWidth={cardWidth}
          cardHeight={layout === 'row' ? Math.max(cardHeight, 108) : cardHeight}
          reserveRestSpace={false}
          showRoles={false}
        />
      );
    };

    const renderMixedPairCard = (
      match: Match,
      cardWidth: number,
      cardHeight: number,
    ) => (
      <ResponsiveMixedPairCard
        leftName={match.p1.id}
        rightName={match.p2.id}
        leftColor={getGearColor(match.p1.gear)}
        rightColor={getGearColor(match.p2.gear)}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
      />
    );

    const renderPairCells = (
      matches: Match[],
      spec: PairGridSpec,
      keyPrefix: string,
      layout: 'stacked' | 'row' | 'auto',
    ) => {
      return matches.map((match: Match, index: number) => {
        const cellWidth = `${100 / Math.max(1, spec.cols)}%`;
        const cellHeight = `${100 / Math.max(1, spec.rows)}%`;
        const lastRowOffset = getCenteredLastRowOffset(index, matches.length, Math.max(1, spec.cols));

        return (
          <View
            key={`${keyPrefix}-${match.p1.id}-${match.p2.id}-${index}`}
            style={{
              width: isPhonePairsView ? '100%' : cellWidth as any,
              height: isPhonePairsView ? (spec.cardHeight + pairCellPadding * 2) : cellHeight as any,
              padding: pairCellPadding,
              marginLeft: !isPhonePairsView && lastRowOffset ? `${lastRowOffset}%` as any : 0,
            }}
          >
            {renderPairCard(match, spec.cardWidth, spec.cardHeight, layout)}
          </View>
        );
      });
    };
    const renderPhonePairList = (
      matches: Match[],
      keyPrefix: string,
      layout: 'stacked' | 'row',
      cardHeight: number,
    ) => (
      <View style={styles.timerPairPhoneList}>
        {matches.map((match: Match, index: number) => (
          <View
            key={`${keyPrefix}-phone-${match.p1.id}-${match.p2.id}-${index}`}
            style={{
              width: '100%',
              paddingVertical: pairCellPadding,
            }}
          >
            <View style={{ width: '100%', height: cardHeight }}>
              {renderPairCard(
                match,
                Math.max(220, phoneSectionWidth - pairSectionPadding * 2 - pairCellPadding * 2),
                cardHeight,
                layout,
              )}
            </View>
          </View>
        ))}
      </View>
    );
    const renderMixedPairList = (
      matches: Match[],
      keyPrefix: string,
      cardHeight: number,
    ) => (
      <View style={styles.timerPairPhoneList}>
        {matches.map((match: Match, index: number) => (
          <View
            key={`${keyPrefix}-mixed-${match.p1.id}-${match.p2.id}-${index}`}
            style={{
              width: '100%',
              paddingVertical: pairCellPadding,
            }}
          >
            <View style={{ width: '100%', height: cardHeight }}>
              {renderMixedPairCard(
                match,
                Math.max(220, mixedBodyWidth - pairCellPadding * 2),
                cardHeight,
              )}
            </View>
          </View>
        ))}
      </View>
    );
    const renderMatchSection = (
      title: string,
      color: string,
      matches: Match[],
      spec: PairGridSpec,
      sectionStyle: any,
      keyPrefix: string,
      useFixedHeight: boolean = true,
    ) => (
      <View
        style={[
          styles.sideSection,
          isPhonePairsView ? styles.sideSectionStacked : sectionStyle,
          {
            paddingHorizontal: pairSectionPadding,
            paddingTop: pairSectionPadding,
            paddingBottom: pairSectionPadding,
          },
          !isPhonePairsView && useFixedHeight && { height: splitAreaHeight },
        ]}
        >
          <View style={[styles.matchSectionAccent, { backgroundColor: color }]} />
          <View style={[styles.matchSectionHeader, { minHeight: pairHeaderHeight }]}>
            <Text style={[styles.matchSectionTitle, { color }]}>{title}</Text>
          </View>
          {isPhonePairsView ? (
            renderPhonePairList(matches, keyPrefix, 'stacked', phonePairCardHeight)
          ) : (
            <View
              style={[
                styles.gridWrap,
                styles.gridWrapNoScroll,
                {
                  flex: 1,
                  marginHorizontal: -pairCellPadding,
                  marginBottom: -pairCellPadding,
                },
              ]}
            >
              {renderPairCells(matches, spec, keyPrefix, 'stacked')}
            </View>
          )}
      </View>
    );

    const renderInlineMixedSection = () => {
      // Use the side column width appropriate for the layout context
      const inlineMixedCardWidth = embedMixedAsColumn
        ? Math.max(160, mixedSideColumnWidth - pairSectionPadding * 2 - pairCellPadding * 2)
        : Math.max(180, kidsBodyWidth - pairCellPadding * 2);
      const inlineMixedCardHeight = embedMixedAsColumn
        ? clamp(68, mixedSideColumnWidth * 0.36, 100)
        : mixedListCardHeight;
      return (
      <View
        style={[
          styles.sideSection,
          styles.pairMetaSection,
          {
            marginTop: embedMixedAsColumn ? 0 : pairSectionGap,
            paddingHorizontal: pairSectionPadding,
            paddingTop: pairSectionPadding,
            paddingBottom: pairSectionPadding,
          },
        ]}
      >
        <View style={[styles.matchSectionAccent, { backgroundColor: COLORS.accentMain }]} />
        <View style={[styles.matchSectionHeader, { minHeight: pairHeaderHeight }]}>
          <Text style={[styles.matchSectionTitle, { color: COLORS.accentMain }]}>MIESZANE</Text>
        </View>
        <View style={{ marginHorizontal: -pairCellPadding }}>
          {mixedPairs.map((match: Match, index: number) => (
            <View key={`mixed-inline-${match.p1.id}-${match.p2.id}-${index}`} style={{ paddingVertical: pairCellPadding }}>
              <View style={{ height: inlineMixedCardHeight }}>
                {embedMixedAsColumn ? (
                  <ResponsiveTriadPrepCard
                    leftRole="[A]"
                    leftName={match.p1.id}
                    leftRoleColor={COLORS.accentMain}
                    leftNameColor={getGearColor(match.p1.gear)}
                    rightRole="[B]"
                    rightName={match.p2.id}
                    rightRoleColor={COLORS.accentCool}
                    rightNameColor={getGearColor(match.p2.gear)}
                    cardWidth={inlineMixedCardWidth}
                    cardHeight={inlineMixedCardHeight}
                    reserveRestSpace={false}
                    showRoles={false}
                  />
                ) : (
                  renderMixedPairCard(match, inlineMixedCardWidth, inlineMixedCardHeight)
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
      );
    };

    const renderInlineRestingSection = () => (
      <View
        style={[
          styles.sideSection,
          styles.pairMetaSection,
          {
            marginTop: pairSectionGap,
            paddingHorizontal: pairSectionPadding,
            paddingTop: pairSectionPadding,
            paddingBottom: pairSectionPadding,
          },
        ]}
      >
        <View style={[styles.matchSectionAccent, { backgroundColor: COLORS.accentAlert }]} />
        <View style={[styles.matchSectionHeader, { minHeight: pairHeaderHeight }]}>
          <Text style={[styles.matchSectionTitle, { color: COLORS.accentAlert }]}>ODPOCZYWA</Text>
        </View>
        <View style={[styles.restingWrapMath, { marginTop: 2 }]}>
          {currentResting.map((playerObj) => (
            <View key={playerObj.id} style={styles.restingBadge}>
              <Text style={styles.restingPlayerTextMath} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1}>
                {playerObj.id}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );

    const timerPairsContent = (
      <>
        {isPhonePairsView ? (
          <>
            {hasKidSection &&
              renderMatchSection('KID', COLORS.accentCool, kidsPairs, kidsGridSpec, { width: '100%' }, 'kid')}
            {hasAdultSection && (
              <View style={{ marginTop: hasKidSection ? pairSectionGap : 0 }}>
                {renderMatchSection('ADULT', COLORS.accentMain, adultsPairs, adultsGridSpec, { width: '100%' }, 'adult')}
              </View>
            )}
          </>
        ) : (
          (hasKidSection || hasAdultSection) && (
            <View
              style={[
                styles.splitMainArea,
                { gap: pairSectionGap, minHeight: splitAreaHeight },
              ]}
            >
              {hasKidSection && (
                <View style={[kidsSectionStyle, { flexDirection: 'column' }]}>
                  {renderMatchSection('KID', COLORS.accentCool, kidsPairs, kidsGridSpec, { flex: 0, flexGrow: 1, flexShrink: 1 }, 'kid', !embedMixedInSide)}
                  {embedMixedInSide && renderInlineMixedSection()}
                  {embedRestingInSide && renderInlineRestingSection()}
                </View>
              )}
              {hasAdultSection &&
                renderMatchSection('ADULT', COLORS.accentMain, adultsPairs, adultsGridSpec, hasBothSections ? adultsSectionStyle : { flex: 1 }, 'adult')}
              {embedMixedAsColumn && (
                <View style={{ width: mixedSideColumnWidth, flexDirection: 'column', gap: pairSectionGap }}>
                  {renderInlineMixedSection()}
                  {embedRestingAsColumn && renderInlineRestingSection()}
                </View>
              )}
            </View>
          )
        )}

        {mixedPairs.length > 0 && !anyEmbedMixed && (
          <View
            style={[
              styles.sideSection,
              styles.pairMetaSection,
              {
                marginTop: hasKidSection || hasAdultSection ? pairSectionGap : 0,
                paddingHorizontal: pairSectionPadding,
                paddingTop: pairSectionPadding,
                paddingBottom: pairSectionPadding,
              },
              !isPhonePairsView && { minHeight: mixedPanelHeight, height: mixedPanelHeight },
            ]}
          >
            <View style={[styles.matchSectionAccent, { backgroundColor: COLORS.accentMain }]} />
            <View style={[styles.matchSectionHeader, { minHeight: pairHeaderHeight }]}>
              <Text style={[styles.matchSectionTitle, { color: COLORS.accentMain }]}>MIESZANE</Text>
            </View>
            {isPhonePairsView ? (
              renderPhonePairList(mixedPairs, 'mixed', 'stacked', phonePairCardHeight)
            ) : (
              <View
                style={[
                  styles.timerPairPhoneList,
                  {
                    flex: 1,
                    marginHorizontal: -pairCellPadding,
                    marginBottom: -pairCellPadding,
                  },
                ]}
              >
                {renderMixedPairList(mixedPairs, 'mixed', mixedListCardHeight)}
              </View>
            )}
          </View>
        )}

        {currentResting.length > 0 && !anyEmbedResting && (
          <View
            style={[
              styles.sideSection,
              styles.pairMetaSection,
              {
                marginTop: mixedPairs.length > 0 || hasKidSection || hasAdultSection ? pairSectionGap : 0,
                paddingHorizontal: pairSectionPadding,
                paddingTop: pairSectionPadding,
                paddingBottom: pairSectionPadding,
              },
              !isPhonePairsView && { minHeight: restingPanelHeight, height: restingPanelHeight },
            ]}
          >
            <View style={[styles.matchSectionAccent, { backgroundColor: COLORS.accentAlert }]} />
            <View style={[styles.matchSectionHeader, { minHeight: pairHeaderHeight }]}>
              <Text style={[styles.matchSectionTitle, { color: COLORS.accentAlert }]}>ODPOCZYWA</Text>
            </View>
            <View
              style={[
                styles.restingWrapMath,
                {
                  flex: isPhonePairsView ? 0 : 1,
                  marginTop: 2,
                },
              ]}
            >
              {currentResting.map((playerObj) => (
                <View key={playerObj.id} style={styles.restingBadge}>
                  <Text
                    style={styles.restingPlayerTextMath}
                    adjustsFontSizeToFit
                    minimumFontScale={0.55}
                    numberOfLines={1}
                  >
                    {playerObj.id}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </>
    );

    const timerActionBar = (
      <View
        style={[
          styles.bottomButtonsBar,
          {
            paddingHorizontal: bottomBarMetrics.gap,
            paddingVertical: bottomBarMetrics.gap,
            flexWrap: bottomBarMetrics.wrap ? 'wrap' : 'nowrap',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.controlButtonSmall,
            {
              paddingVertical: bottomBarMetrics.buttonPaddingVertical,
              paddingHorizontal: bottomBarMetrics.buttonPaddingHorizontal,
              minWidth: bottomBarMetrics.buttonMinWidth,
              marginHorizontal: bottomBarMetrics.gap / 2,
              marginVertical: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : 0,
              flexBasis: bottomBarMetrics.wrap ? '47%' : undefined,
              flexGrow: bottomBarMetrics.wrap ? 1 : 0,
            },
            isActive ? styles.btnStandard : styles.btnImportant,
          ]}
          onPress={() => setIsActive(!isActive)}
        >
          <Text
            style={[
              styles.controlButtonTextSmall,
              { fontSize: bottomBarMetrics.buttonFont },
              isActive ? { color: COLORS.textPrimary } : { color: COLORS.bgMain },
            ]}
          >
            {isActive ? 'PAUZA' : 'WZNÓW'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButtonSmall,
            {
              paddingVertical: bottomBarMetrics.buttonPaddingVertical,
              paddingHorizontal: bottomBarMetrics.buttonPaddingHorizontal,
              minWidth: bottomBarMetrics.buttonMinWidth,
              marginHorizontal: bottomBarMetrics.gap / 2,
              marginVertical: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : 0,
              flexBasis: bottomBarMetrics.wrap ? '47%' : undefined,
              flexGrow: bottomBarMetrics.wrap ? 1 : 0,
            },
            styles.btnSecondary,
          ]}
          onPress={handleOpenDropoutModal}
        >
          <Text
            style={[
              styles.controlButtonTextSmall,
              { fontSize: bottomBarMetrics.buttonFont, color: COLORS.accentAlert },
            ]}
          >
            KTOŚ WYPADŁ?
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButtonSmall,
            {
              paddingVertical: bottomBarMetrics.buttonPaddingVertical,
              paddingHorizontal: bottomBarMetrics.buttonPaddingHorizontal,
              minWidth: bottomBarMetrics.buttonMinWidth,
              marginHorizontal: bottomBarMetrics.gap / 2,
              marginVertical: bottomBarMetrics.wrap ? bottomBarMetrics.gap / 2 : 0,
              flexBasis: bottomBarMetrics.wrap ? '47%' : undefined,
              flexGrow: bottomBarMetrics.wrap ? 1 : 0,
            },
            styles.btnStop,
          ]}
          onPress={handleStopTraining}
        >
          <Text style={[styles.controlButtonTextSmall, { fontSize: bottomBarMetrics.buttonFont }]}>ZAKOŃCZ</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.topBar,
            stackTimerTopBar && styles.topBarStacked,
            {
              paddingHorizontal: topBarMetrics.paddingHorizontal,
              paddingVertical: topBarMetrics.paddingVertical,
            },
          ]}
        >
          <View
            style={{
              flex: stackTimerTopBar ? 0 : 1,
              width: stackTimerTopBar ? '100%' : undefined,
              paddingRight: stackTimerTopBar ? 0 : 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {isPrep && !isPhonePairsView && <Image source={APP_LOGO} style={{ width: Math.round(topBarMetrics.timerFont + topBarMetrics.timerPaddingVertical * 1.4 + 8), height: Math.round(topBarMetrics.timerFont + topBarMetrics.timerPaddingVertical * 1.4 + 8), borderRadius: 12 }} resizeMode="contain" />}
              <View>
                <Text style={[styles.topBarRound, { fontSize: topBarMetrics.roundFont }]}>RUNDA {displayRound} / {roundsTotal}</Text>
                <Text
                  style={[
                    styles.topBarPhase,
                    {
                      color: isPrep ? COLORS.accentMain : COLORS.accentAlert,
                      fontSize: topBarMetrics.phaseFont,
                    },
                  ]}
                >
                  {phaseText}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.topBarTimerBox,
              stackTimerTopBar && styles.topBarTimerBoxStacked,
              {
                borderColor: isPrep ? COLORS.accentMain : COLORS.accentAlert,
                paddingHorizontal: topBarMetrics.timerPaddingHorizontal,
                paddingVertical: topBarMetrics.timerPaddingVertical,
              },
              countdownTimerBoxStyle,
            ]}
          >
            <Text
              style={[
                styles.topBarTimer,
                { color: isPrep ? COLORS.accentMain : COLORS.accentAlert, fontSize: topBarMetrics.timerFont },
                countdownTimerTextStyle,
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
          </View>
        </View>

        {isPhonePairsView ? (
          <ScrollView
            style={styles.timerScroll}
            contentContainerStyle={[
              styles.timerScrollContent,
              {
                paddingHorizontal: pairOuterPadding,
                paddingTop: pairOuterPadding,
                paddingBottom: pairOuterPadding,
                gap: pairSectionGap,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {timerPairsContent}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.matchmakingMainContainer,
              {
                paddingHorizontal: pairOuterPadding,
                paddingTop: pairOuterPadding,
                paddingBottom: pairOuterPadding,
              },
            ]}
            onLayout={handlePairsMainLayout}
          >
            {timerPairsContent}
          </View>
        )}

        {timerActionBar}
        {dropoutModal}
      </SafeAreaView>
    );
  }

  // ==========================================
  // WIDOK 1: EKRAN REJESTRACJI 
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.settingsScroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {shouldSplitSettingsLayout ? (
          <View style={[styles.contentSplit, isCompactSettingsUI && styles.contentSplitCompact]}>
            <ScrollView
              style={[
                styles.leftCol,
                isCompactSettingsUI && styles.leftColCompact,
                { flexBasis: tabletLeftColumnWidth, maxWidth: tabletLeftColumnWidth },
              ]}
              contentContainerStyle={styles.leftColScrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {leftSettingsContent}
            </ScrollView>

            <View style={[styles.rightCol, isCompactSettingsUI && styles.rightColCompact]}>
              <View
                style={[
                  styles.sectionBox,
                  isCompactSettingsUI && styles.sectionBoxCompact,
                  styles.sectionBoxFill,
                  { marginBottom: 0 },
                ]}
              >
                <View style={[styles.rosterHeaderRow, isCompactSettingsUI && styles.rosterHeaderRowCompact]}>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[styles.sectionTitle, styles.rosterHeaderTitle]}>ZAWODNICY NA MACIE ({roster.length})</Text>
                      <Text style={[styles.rosterHeaderSubtitle, isCompactSettingsUI && styles.rosterHeaderSubtitleCompact]}>{hasAnyRosterFilter ? `Filtrowanie: ${filteredSortedRoster.length} z ${roster.length}` : 'Kolejność alfabetyczna A-Z'}</Text>
                    </View>
                    {roster.length > 0 && (
                        <TouchableOpacity style={[styles.clearMataBtn, isCompactSettingsUI && styles.clearMataBtnCompact]} onPress={handleClearRoster}>
                            <Text style={[styles.clearMataText, isCompactSettingsUI && styles.clearMataTextCompact]}>NOWY TRENING</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {rosterFilterBar}
                <ScrollView
                  style={styles.rosterScrollView}
                  contentContainerStyle={[styles.rosterScrollContent, isCompactSettingsUI && styles.rosterScrollContentCompact]}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  {filteredSortedRoster.length > 0 ? (
                    <View style={[styles.rosterGrid, isCompactSettingsUI && styles.rosterGridCompact]}>
                        {filteredSortedRoster.map((p) => {
                          const gearTheme = getGearCardTheme(p.gear);
                          const skillLabel = p.type === 'ADULT' ? getSkillLevelShortLabel(p.skillLevel) : '';

                          return (
                            <TouchableOpacity
                              key={p.id}
                              style={[
                                styles.rosterCard,
                                isCompactSettingsUI && styles.rosterCardCompact,
                                {
                                  flexBasis: rosterCardBasis as any,
                                  backgroundColor: gearTheme.backgroundColor,
                                  borderColor: gearTheme.borderColor,
                                },
                              ]}
                              activeOpacity={0.92}
                              onPress={() => handleEditPlayer(p)}
                            >
                                <View style={[styles.rosterCardAccent, { backgroundColor: gearTheme.accent }]} />
                                <View style={styles.rosterCardTopRow}>
                                    <View style={[styles.rosterBadgeRow, isCompactSettingsUI && styles.rosterBadgeRowCompact]}>
                                      <View
                                        style={[
                                          styles.rosterGearBadge,
                                          isCompactSettingsUI && styles.rosterGearBadgeCompact,
                                          {
                                            backgroundColor: gearTheme.badgeBackground,
                                            borderColor: gearTheme.borderColor,
                                          },
                                        ]}
                                      >
                                        <View style={[styles.rosterGearDot, isCompactSettingsUI && styles.rosterGearDotCompact, { backgroundColor: gearTheme.accent }]} />
                                        <Text style={[styles.rosterGearBadgeText, isCompactSettingsUI && styles.rosterGearBadgeTextCompact, { color: gearTheme.accent }]}>
                                          {p.gear === 'GI' ? 'GI' : 'NO-GI'}
                                        </Text>
                                      </View>
                                      <View style={[styles.rosterTypeBadge, isCompactSettingsUI && styles.rosterTypeBadgeCompact]}>
                                        <Text style={[styles.rosterTypeBadgeText, isCompactSettingsUI && styles.rosterTypeBadgeTextCompact]}>{p.type}</Text>
                                      </View>
                                    </View>
                                    <TouchableOpacity
                                      style={[styles.rosterCardDeleteBtn, isCompactSettingsUI && styles.rosterCardDeleteBtnCompact]}
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromRoster(p.id);
                                      }}
                                    >
                                        <Text style={styles.rosterDeleteText}>X</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text
                                  style={[styles.rosterName, isCompactSettingsUI && styles.rosterNameCompact]}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.72}
                                  numberOfLines={2}
                                  ellipsizeMode="clip"
                                >
                                  {p.id}
                                </Text>
                                <View style={[styles.rosterInfoRow, isCompactSettingsUI && styles.rosterInfoRowCompact]}>
                                  <View style={[styles.rosterInfoChip, isCompactSettingsUI && styles.rosterInfoChipCompact]}>
                                    <Text style={[styles.rosterInfoChipText, isCompactSettingsUI && styles.rosterInfoChipTextCompact]}>{p.weight} kg</Text>
                                  </View>
                                  {skillLabel ? (
                                    <View style={[styles.rosterInfoChip, isCompactSettingsUI && styles.rosterInfoChipCompact, { borderColor: gearTheme.borderColor }]}>
                                      <Text style={[styles.rosterInfoChipText, isCompactSettingsUI && styles.rosterInfoChipTextCompact]}>{skillLabel}</Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text style={[styles.rosterEditHint, isCompactSettingsUI && styles.rosterEditHintCompact]}>Dotknij, aby edytować zawodnika</Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  ) : (
                    <View style={styles.rosterEmptyState}>
                      <Text style={styles.rosterEmptyTitle}>{hasAnyRosterFilter ? 'Brak wyników dla wybranych filtrów' : 'Mata jest jeszcze pusta'}</Text>
                      <Text style={styles.rosterEmptyText}>
                        {hasAnyRosterFilter ? 'Zmień filtry lub wyczyść je, aby zobaczyć wszystkich zawodników.' : 'Dodaj zawodników z panelu po lewej, a tutaj pojawią się uporządkowane kafelki.'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.settingsStack}>
            <View style={styles.settingsStackSection}>
              {leftSettingsContent}
            </View>

            <View style={styles.settingsStackSection}>
              <View
                style={[
                  styles.sectionBox,
                  isCompactSettingsUI && styles.sectionBoxCompact,
                  styles.sectionBoxStacked,
                  { marginBottom: 0 },
                ]}
              >
                <View style={[styles.rosterHeaderRow, isCompactSettingsUI && styles.rosterHeaderRowCompact]}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[styles.sectionTitle, styles.rosterHeaderTitle]}>ZAWODNICY NA MACIE ({roster.length})</Text>
                    <Text style={[styles.rosterHeaderSubtitle, isCompactSettingsUI && styles.rosterHeaderSubtitleCompact]}>{hasAnyRosterFilter ? `Filtrowanie: ${filteredSortedRoster.length} z ${roster.length}` : 'Kolejność alfabetyczna A-Z'}</Text>
                  </View>
                  {roster.length > 0 && (
                    <TouchableOpacity style={[styles.clearMataBtn, isCompactSettingsUI && styles.clearMataBtnCompact]} onPress={handleClearRoster}>
                      <Text style={[styles.clearMataText, isCompactSettingsUI && styles.clearMataTextCompact]}>NOWY TRENING</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {rosterFilterBar}
                {filteredSortedRoster.length > 0 ? (
                  <View style={[styles.rosterGrid, isCompactSettingsUI && styles.rosterGridCompact]}>
                    {filteredSortedRoster.map((p) => {
                      const gearTheme = getGearCardTheme(p.gear);
                      const skillLabel = p.type === 'ADULT' ? getSkillLevelShortLabel(p.skillLevel) : '';

                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[
                            styles.rosterCard,
                            isCompactSettingsUI && styles.rosterCardCompact,
                            {
                              flexBasis: rosterCardBasis as any,
                              backgroundColor: gearTheme.backgroundColor,
                              borderColor: gearTheme.borderColor,
                            },
                          ]}
                          activeOpacity={0.92}
                          onPress={() => handleEditPlayer(p)}
                        >
                          <View style={[styles.rosterCardAccent, { backgroundColor: gearTheme.accent }]} />
                          <View style={styles.rosterCardTopRow}>
                            <View style={[styles.rosterBadgeRow, isCompactSettingsUI && styles.rosterBadgeRowCompact]}>
                              <View
                                style={[
                                  styles.rosterGearBadge,
                                  isCompactSettingsUI && styles.rosterGearBadgeCompact,
                                  {
                                    backgroundColor: gearTheme.badgeBackground,
                                    borderColor: gearTheme.borderColor,
                                  },
                                ]}
                              >
                                <View style={[styles.rosterGearDot, isCompactSettingsUI && styles.rosterGearDotCompact, { backgroundColor: gearTheme.accent }]} />
                                <Text style={[styles.rosterGearBadgeText, isCompactSettingsUI && styles.rosterGearBadgeTextCompact, { color: gearTheme.accent }]}>
                                  {p.gear === 'GI' ? 'GI' : 'NO-GI'}
                                </Text>
                              </View>
                              <View style={[styles.rosterTypeBadge, isCompactSettingsUI && styles.rosterTypeBadgeCompact]}>
                                <Text style={[styles.rosterTypeBadgeText, isCompactSettingsUI && styles.rosterTypeBadgeTextCompact]}>{p.type}</Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={[styles.rosterCardDeleteBtn, isCompactSettingsUI && styles.rosterCardDeleteBtnCompact]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRemoveFromRoster(p.id);
                              }}
                            >
                              <Text style={styles.rosterDeleteText}>X</Text>
                            </TouchableOpacity>
                          </View>
                          <Text
                            style={[styles.rosterName, isCompactSettingsUI && styles.rosterNameCompact]}
                            adjustsFontSizeToFit
                            minimumFontScale={0.72}
                            numberOfLines={2}
                            ellipsizeMode="clip"
                          >
                            {p.id}
                          </Text>
                          <View style={[styles.rosterInfoRow, isCompactSettingsUI && styles.rosterInfoRowCompact]}>
                            <View style={[styles.rosterInfoChip, isCompactSettingsUI && styles.rosterInfoChipCompact]}>
                              <Text style={[styles.rosterInfoChipText, isCompactSettingsUI && styles.rosterInfoChipTextCompact]}>{p.weight} kg</Text>
                            </View>
                            {skillLabel ? (
                              <View style={[styles.rosterInfoChip, isCompactSettingsUI && styles.rosterInfoChipCompact, { borderColor: gearTheme.borderColor }]}>
                                <Text style={[styles.rosterInfoChipText, isCompactSettingsUI && styles.rosterInfoChipTextCompact]}>{skillLabel}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={[styles.rosterEditHint, isCompactSettingsUI && styles.rosterEditHintCompact]}>Dotknij, aby edytować zawodnika</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.rosterEmptyState}>
                    <Text style={styles.rosterEmptyTitle}>{hasAnyRosterFilter ? 'Brak wyników dla wybranych filtrów' : 'Mata jest jeszcze pusta'}</Text>
                    <Text style={styles.rosterEmptyText}>
                      {hasAnyRosterFilter ? 'Zmień filtry lub wyczyść je, aby zobaczyć wszystkich zawodników.' : 'Dodaj zawodników z panelu powyżej, a tutaj pojawią się uporządkowane kafelki.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        <Modal visible={isAboutModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsAboutModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxWidth: 420, width: '88%' }]}>
              <Image source={APP_LOGO} style={{ width: 100, height: 100, borderRadius: 20, marginBottom: 16 }} resizeMode="contain" />
              <Text style={[styles.modalTitle, { marginBottom: 4 }]}>Z NIM NIE ROBIĘ</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, fontWeight: '700', marginBottom: 20 }}>Wersja V1</Text>

              <View style={{ width: '100%', gap: 12, marginBottom: 20 }}>
                <TouchableOpacity
                  style={styles.aboutLinkRow}
                  onPress={() => Linking.openURL('mailto:drozdz.szymon@gmail.com')}
                >
                  <Text style={styles.aboutLinkIcon}>✉️</Text>
                  <Text style={styles.aboutLinkText}>drozdz.szymon@gmail.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.aboutLinkRow}
                  onPress={() => Linking.openURL('https://github.com/drozdzszymon/z-nim-nie-robie')}
                >
                  <Text style={styles.aboutLinkIcon}>🔗</Text>
                  <Text style={styles.aboutLinkText}>GitHub — z-nim-nie-robie</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.aboutLinkRow}
                  onPress={() => Linking.openURL('https://www.mantoshop.pl/')}
                >
                  <Text style={styles.aboutLinkIcon}>🥋</Text>
                  <Text style={styles.aboutLinkText}>mantoshop.pl</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                Aplikacja treningowa do zarządzania parami, rundami i rotacją zawodników podczas treningów BJJ.
              </Text>

              <TouchableOpacity style={[styles.closeModalButton, { marginTop: 20 }]} onPress={() => setIsAboutModalVisible(false)}>
                <Text style={styles.closeModalButtonText}>ZAMKNIJ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={isVipModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>ZAWODNICY BEZ PAUZY</Text>
              <ScrollView style={{width: '100%'}}>
                <View style={styles.vipGrid}>
                  {sortedRoster.map((p) => {
                    const isVip = noRestPlayers.includes(p.id);
                    return (
                      <TouchableOpacity key={p.id} style={[styles.vipPlayerBox, isVip && styles.vipPlayerBoxActive]} onPress={() => toggleNoRest(p.id)}>
                        <Text style={[styles.vipPlayerText, isVip && {color: COLORS.bgMain}]}>{p.id}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsVipModalVisible(false)}><Text style={styles.closeModalButtonText}>GOTOWE</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <Modal visible={isDevMetricsVisible} transparent={true} animationType="fade" onRequestClose={() => setIsDevMetricsVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', padding: 12, paddingTop: 16 }}>
          <Text style={{ color: COLORS.accentMain, fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 8, letterSpacing: 1 }}>PARAMETRY URZĄDZENIA</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, ...(screenWidth >= 700 ? { alignContent: 'center', flexGrow: 1 } : {}) }}>
            {devMetricsSections.map((section, si) => (
              <View key={si} style={{ flexBasis: screenWidth >= 700 ? '48%' : '100%', flexGrow: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(73,198,255,0.15)' }}>
                <Text style={{ color: COLORS.accentCool, fontSize: 12, fontWeight: '800', marginBottom: 4, letterSpacing: 1 }}>{section.title}</Text>
                {section.lines.map((line, li) => (
                  <Text
                    key={li}
                    selectable={true}
                    style={{
                      color: COLORS.textPrimary,
                      fontSize: 11,
                      fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
                      lineHeight: 16,
                    }}
                  >{line}</Text>
                ))}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={{ backgroundColor: COLORS.borderSoft, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
            onPress={() => setIsDevMetricsVisible(false)}
          >
            <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' }}>ZAMKNIJ</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgMain }, 
  settingsScroll: { flex: 1 },
  container: { flexGrow: 1, width: '100%', padding: 10 },
  
  finishedContainer: { flex: 1, backgroundColor: COLORS.bgMain, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36 },
  finishedTextWrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 16 },
  finishedTextBig: { width: '100%', fontSize: 240, fontWeight: '900', color: COLORS.accentMain, textAlign: 'center', includeFontPadding: false, lineHeight: 240 },
  finishedTextSmall: { width: '100%', fontSize: 78, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center', includeFontPadding: false, lineHeight: 84 },
  finishedReturnBtn: { paddingVertical: 14, paddingHorizontal: 28, backgroundColor: COLORS.bgPanel, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderSoft, alignSelf: 'center' },
  finishedReturnText: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '900' },

  contentSplit: { flex: 1, flexDirection: 'row', width: '100%', gap: 15, marginTop: 5, minHeight: 0 },
  contentSplitCompact: { gap: 12, minHeight: 0 },
  contentSplitStacked: { flexDirection: 'column', gap: 10 },
  settingsStack: { width: '100%', gap: 10, marginTop: 5, alignItems: 'stretch' },
  settingsStackSection: { width: '100%', alignSelf: 'stretch', position: 'relative', zIndex: 0 },
  leftCol: { flex: 1, maxWidth: 500, zIndex: 10, minHeight: 0 },
  leftColCompact: { maxWidth: 430, minHeight: 0 },
  leftColStacked: { flex: 0, width: '100%', maxWidth: '100%', zIndex: 0 },
  leftColScrollContent: { paddingBottom: 4 },
  rightCol: { flex: 1, minHeight: 0 },
  rightColCompact: { minHeight: 0 },
  rightColStacked: { flex: 0, width: '100%', zIndex: 0 },
  leftActionStack: { gap: 10, marginTop: 2 },
  leftActionStackCompact: { gap: 8, marginTop: 0 },

  sectionBox: { backgroundColor: COLORS.bgPanel, padding: 10, borderRadius: 15, marginBottom: 8, borderWidth: 1, borderColor: COLORS.borderSoft },
  sectionBoxCompact: { padding: 8, borderRadius: 14 },
  sectionBoxFill: { flex: 1 },
  sectionBoxStacked: { width: '100%' },
  sectionTitle: { color: COLORS.accentCool, fontSize: 16, fontWeight: 'bold', marginBottom: 6, textAlign: 'center', letterSpacing: 1 }, 

  controlPanel: {
    backgroundColor: COLORS.bgPanel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 12,
    padding: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  controlPanelCompact: { padding: 10, borderRadius: 18, marginBottom: 10 },
  controlPanelAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  controlPanelHeader: { marginBottom: 12 },
  controlPanelHeaderCompact: { marginBottom: 7 },
  controlPanelEyebrow: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 },
  controlPanelTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900', letterSpacing: 0.3 },
  controlPanelTitleCompact: { fontSize: 18 },
  controlPanelSubtitle: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 360 },
  controlPanelSubtitleCompact: { fontSize: 11, lineHeight: 15, marginTop: 3, maxWidth: 290 },
  controlSummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  controlSummaryRowCompact: { gap: 6, marginBottom: 8 },
  controlSummaryBadge: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  controlSummaryBadgeCompact: { paddingVertical: 5, paddingHorizontal: 9 },
  controlSummaryBadgeNeutral: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: COLORS.borderSoft,
  },
  controlSummaryBadgeText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  controlSummaryBadgeTextCompact: { fontSize: 11 },
  fieldBlock: { marginBottom: 12 },
  fieldBlockCompact: { marginBottom: 8 },
  compactFormRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  compactFormRowRaised: { zIndex: 10 },
  compactFieldPrimary: { flex: 1.35, minWidth: 0 },
  compactFieldSecondary: { flex: 0.8, minWidth: 0 },
  compactFieldHalf: { flex: 1, minWidth: 0 },
  compactFieldRaised: { zIndex: 12 },
  fieldLabelBadge: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  optionGroup: { marginBottom: 12 },
  optionGroupCompact: { marginBottom: 8 },
  optionGroupLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  
  inputText: {
    backgroundColor: COLORS.bgPanel2,
    color: COLORS.textPrimary,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  inputTextCompact: { fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  
  suggestionsBox: { position: 'absolute', top: 60, left: 0, right: 0, backgroundColor: COLORS.bgPanel2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderStrong, elevation: 5, overflow: 'hidden' },
  suggestionsBoxCompact: { top: 50 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft },
  suggestionName: { color: COLORS.accentMain, fontSize: 18, fontWeight: 'bold' },
  suggestionDetail: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  togglesRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  toggleBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: COLORS.bgMain,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  toggleBtnCompact: { minHeight: 40, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 13 },
  toggleText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  toggleTextCompact: { fontSize: 11.5 },

  addButton: {
    backgroundColor: COLORS.accentCool,
    paddingVertical: 15,
    borderRadius: 18,
    marginTop: 6,
    alignItems: 'center',
    shadowColor: COLORS.accentCool,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  }, 
  addButtonCompact: { paddingVertical: 11, borderRadius: 16, marginTop: 1 },
  addButtonText: { color: COLORS.bgMain, fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  addButtonTextCompact: { fontSize: 14, letterSpacing: 0.35 },

  timeGrid: { gap: 10 },
  timeGridCompact: { gap: 8 },
  timeGridRow: { flexDirection: 'row', width: '100%', gap: 10 },
  timeGridRowCompact: { gap: 8 },
  timeGridRowStacked: { flexDirection: 'column' },
  timeCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.bgPanel2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 12,
  },
  timeCardStacked: { width: '100%' },
  timeCardCompact: { padding: 9, borderRadius: 15 },
  timeCardLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  timeCardLabelCompact: { fontSize: 9.5, marginBottom: 6 },
  timeCardInput: {
    backgroundColor: COLORS.bgMain,
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  timeCardInputCompact: { fontSize: 18, paddingVertical: 7, borderRadius: 12 },

  rosterHeaderRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 },
  rosterHeaderRowCompact: { marginBottom: 8, gap: 6 },
  rosterHeaderTitle: { marginBottom: 0, textAlign: 'left' },
  rosterHeaderSubtitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginTop: 2 },
  rosterHeaderSubtitleCompact: { fontSize: 11, marginTop: 1 },

  rosterFilterBar: { marginBottom: 10 },
  rosterFilterBarCompact: { marginBottom: 8 },
  rosterFilterScroll: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 },
  rosterFilterTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.bgPanel2,
  },
  rosterFilterTagActiveCool: {
    backgroundColor: 'rgba(73, 198, 255, 0.18)',
    borderColor: COLORS.accentCool,
  },
  rosterFilterTagActiveWarm: {
    backgroundColor: 'rgba(247, 183, 51, 0.18)',
    borderColor: COLORS.accentMain,
  },
  rosterFilterTagActiveSkill: {
    backgroundColor: 'rgba(245, 247, 250, 0.12)',
    borderColor: COLORS.textPrimary,
  },
  rosterFilterTagText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rosterFilterTagTextActive: {
    color: COLORS.textPrimary,
  },
  rosterFilterSep: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.borderSoft,
    marginHorizontal: 2,
  },
  rosterFilterClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rosterFilterClearText: {
    color: COLORS.accentAlert,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  rosterScrollView: { flex: 1 },
  rosterScrollContent: { paddingBottom: 4 },
  rosterScrollContentCompact: { paddingBottom: 8 },
  rosterGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', alignContent: 'flex-start', gap: 10 },
  rosterGridCompact: { gap: 8 },
  rosterCard: {
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  rosterCardCompact: { minHeight: 116, borderRadius: 16, padding: 12 },
  rosterCardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  rosterCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rosterBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flexShrink: 1 },
  rosterBadgeRowCompact: { gap: 6 },
  rosterGearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  rosterGearBadgeCompact: { paddingVertical: 4, paddingHorizontal: 8 },
  rosterGearDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  rosterGearDotCompact: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  rosterGearBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  rosterGearBadgeTextCompact: { fontSize: 11 },
  rosterTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  rosterTypeBadgeCompact: { paddingVertical: 4, paddingHorizontal: 8 },
  rosterTypeBadgeText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  rosterTypeBadgeTextCompact: { fontSize: 11 },
  rosterName: { fontSize: 25, fontWeight: '900', color: COLORS.textPrimary, marginTop: 14, letterSpacing: 0.4, lineHeight: 30, flexShrink: 1, minHeight: 60 },
  rosterNameCompact: { fontSize: 21, marginTop: 12, lineHeight: 24, minHeight: 48 },
  rosterInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  rosterInfoRowCompact: { gap: 6, marginTop: 10 },
  rosterInfoChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  rosterInfoChipCompact: { paddingVertical: 5, paddingHorizontal: 9 },
  rosterInfoChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  rosterInfoChipTextCompact: { fontSize: 11 },
  rosterEditHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 12, fontWeight: '600' },
  rosterEditHintCompact: { fontSize: 11, marginTop: 10 },
  rosterCardDeleteBtn: { backgroundColor: COLORS.accentAlert, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }, 
  rosterCardDeleteBtnCompact: { width: 30, height: 30, borderRadius: 15 },
  rosterDeleteText: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 16 },
  rosterEmptyState: {
    minHeight: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.bgPanel2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  rosterEmptyTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  rosterEmptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20, maxWidth: 440 },

  clearMataBtn: { backgroundColor: COLORS.accentAlert, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  clearMataText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: 'bold' },
  clearMataBtnCompact: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  clearMataTextCompact: { fontSize: 11 },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6, gap: 10 },
  optionsRowCompact: { gap: 8, marginBottom: 4 },
  optionsRowStacked: { flexDirection: 'column' },
  vipButton: {
    flex: 1,
    minHeight: 58,
    backgroundColor: COLORS.bgPanel,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  vipButtonCompact: { minHeight: 46, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 15 },
  vipButtonActive: { backgroundColor: COLORS.accentMain, borderColor: COLORS.accentMain },
  vipButtonText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800', textAlign: 'center', letterSpacing: 0.25 },
  vipButtonTextCompact: { fontSize: 11.5 },
  
  startButton: {
    backgroundColor: COLORS.accentMain,
    paddingVertical: 17,
    borderRadius: 22,
    marginTop: 4,
    alignItems: 'center',
    shadowColor: COLORS.accentMain,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  }, 
  startButtonCompact: { paddingVertical: 12, borderRadius: 18, marginTop: 2 },
  startButtonText: { color: COLORS.bgMain, fontSize: 20, fontWeight: '900', letterSpacing: 0.6 }, 
  startButtonTextCompact: { fontSize: 16 },
  
  vipGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  vipPlayerBox: { backgroundColor: COLORS.bgPanel2, padding: 15, margin: 5, borderRadius: 10, borderWidth: 2, borderColor: COLORS.borderSoft },
  vipPlayerBoxActive: { backgroundColor: COLORS.accentMain, borderColor: COLORS.accentMain },
  vipPlayerText: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  
  timerContainerGigantic: { flex: 1, justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgMain, paddingVertical: 10 },
  roundInfoGigantic: { fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 10 },
  clockBoxGigantic: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
  hugeTimerTextGigantic: {
    width: '100%',
    fontWeight: '900',
    fontFamily: Platform.OS === 'android' ? undefined : 'monospace',
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: 0,
    maxWidth: '100%',
  },
  hugeTimerDigitsRow: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  hugeTimerDigitBlock: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  hugeTimerColonBlock: { width: '12%', minWidth: 28, alignItems: 'center', justifyContent: 'center' },
  hugeTimerDigitGroup: { textAlign: 'center', transform: [{ scaleY: 1.02 }] },
  hugeTimerColon: { textAlign: 'center', transform: [{ scaleY: 1.02 }] },
  timerButtonsRowGigantic: { flexDirection: 'row', width: '95%', justifyContent: 'space-between', marginBottom: 10, backgroundColor: COLORS.bgPanel, padding: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderSoft },
  controlButtonGigantic: { paddingVertical: 20, borderRadius: 15, flex: 1, marginHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  controlButtonTextGigantic: { fontSize: 30, fontWeight: '900' },
  workTimerScreen: { flex: 1, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8 },
  workTimerHeader: {
    backgroundColor: COLORS.bgPanel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 70,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  workTimerRoundTitle: { fontSize: 30, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center' },
  workTimerPhaseTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  workTimerHeroWrap: { flex: 1, paddingVertical: 6 },
  workTimerHeroCard: {
    flex: 1,
    backgroundColor: COLORS.bgPanel,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 0,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  workTimerHeroLabel: { color: COLORS.textMuted, fontSize: 14, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  workTimerHeroValue: { width: '100%', fontWeight: '900', fontFamily: 'monospace', textAlign: 'center', includeFontPadding: false, letterSpacing: 0, maxWidth: '100%' },
  workTimerDigitsRow: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  workTimerDigitBlock: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  workTimerColonBlock: { width: '12%', minWidth: 54, alignItems: 'center', justifyContent: 'center' },
  workTimerDigitGroup: { textAlign: 'center', transform: [{ scaleY: 1.02 }] },
  workTimerColon: { textAlign: 'center', transform: [{ scaleY: 1.04 }] },
  workTimerBottomBar: { marginHorizontal: 0, marginBottom: 0, borderRadius: 22 },
  workTimerActionButton: { minHeight: 74, justifyContent: 'center', alignItems: 'center' },
  workTimerActionText: { letterSpacing: 0.35, includeFontPadding: false, textAlignVertical: 'center', textAlign: 'center' },
  
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgPanel,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginHorizontal: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  topBarRound: { color: COLORS.textPrimary, fontWeight: '900', marginBottom: 4 },
  topBarPhase: { fontWeight: '900', letterSpacing: 1.5 },
  topBarStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  topBarTimerBoxStacked: { alignSelf: 'flex-end' },
  triadLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  triadLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.065)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  triadLegendRole: { fontSize: 16, fontWeight: '900', includeFontPadding: false, marginRight: 6 },
  triadLegendLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900', includeFontPadding: false, letterSpacing: 0.6 },
  topBarTimerBox: { backgroundColor: COLORS.bgMain, borderRadius: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  topBarTimer: { fontWeight: '900', fontFamily: 'monospace' },
  
  matchmakingMainContainer: { flex: 1, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 },
  splitMainArea: { flex: 1, flexDirection: 'row', width: '100%', gap: 12, minHeight: 0 },
  splitMainAreaStacked: { flex: 0, flexDirection: 'column' },
  sideSection: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'column',
    backgroundColor: COLORS.bgPanel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    overflow: 'hidden',
    minHeight: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sideSectionStacked: { width: '100%', flexGrow: 0, flexShrink: 0, flexBasis: 'auto' as any },
  pairMetaSection: { width: '100%', flexGrow: 0, flexShrink: 0, flexBasis: 'auto' as any },
  gridWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', marginTop: 0, minHeight: 0 },
  gridWrapNoScroll: { overflow: 'hidden' },
  timerPairPhoneList: { width: '100%', flexDirection: 'column', alignItems: 'stretch' },
  triadPrepSectionStack: { flex: 1, minHeight: 0 },
  triadPrepCenteredGrid: { justifyContent: 'center' },
  verticalDivider: { width: 4, backgroundColor: COLORS.borderStrong, borderRadius: 2, marginHorizontal: 5 },
  matchSectionAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  matchSectionHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 8 },
  matchSectionEyebrow: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 2, textTransform: 'uppercase' },
  matchSectionTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 0.4 },
  
  sectionTitleDZ: { color: COLORS.accentCool, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
  sectionTitleDO: { color: COLORS.accentCool, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 2 },

  matchCard: {
    width: '100%',
    height: '100%',
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: COLORS.bgPanel2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(215, 222, 232, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  matchCardAccentRail: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, flexDirection: 'row', opacity: 0.82 },
  matchCardAccentSegment: { flex: 1 },
  vsText: { color: COLORS.textMuted },
  responsiveCardInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-evenly' },
  responsiveCardInnerRow: { flexDirection: 'row', alignItems: 'center' },
  responsiveCardInnerStacked: { flexDirection: 'column' },
  responsiveNameSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  responsiveMatchNameSlot: { width: '100%', paddingHorizontal: 2, paddingVertical: 2 },
  responsiveNameSlotSurface: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  responsiveNameSlotStacked: { width: '100%', flex: 0 },
  matchNameIndicator: { width: 9, height: 9, borderRadius: 4.5, marginRight: 8, flexShrink: 0 },
  responsiveNameText: { flex: 1, width: '100%', fontWeight: '900', textAlign: 'center', includeFontPadding: false },
  responsiveMatchNameText: { letterSpacing: 0.15 },
  responsiveVsBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  responsiveVsText: { color: COLORS.textMuted, fontWeight: '900', textAlign: 'center', includeFontPadding: false, letterSpacing: 0.9 },
  mixedPairCardInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixedPairNameSlot: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixedPairNameText: {
    width: '100%',
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
  mixedPairVsBadge: {
    flexShrink: 0,
    alignSelf: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  mixedPairVsText: {
    letterSpacing: 0.7,
  },
  responsiveRoleCardInner: { width: '100%', flex: 1, alignItems: 'center', justifyContent: 'center' },
  responsiveRoleMain: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  responsiveRoleMainRow: { flexDirection: 'row', alignItems: 'center' },
  responsiveRoleMainStacked: { flexDirection: 'column' },
  responsiveRoleBlock: { alignItems: 'center', justifyContent: 'center' },
  responsiveRoleSurface: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  responsiveRoleBlockRow: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  responsiveRoleBlockStacked: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  responsiveRoleLabelPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 6,
  },
  responsiveRoleLabelPillRest: { marginBottom: 0, marginRight: 6 },
  responsiveRoleLabel: { fontWeight: '900', includeFontPadding: false, textAlign: 'center' },
  responsiveRoleName: { width: '100%', fontWeight: '900', textAlign: 'center', flexShrink: 1, includeFontPadding: false },
  responsiveRestRow: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  responsiveRestPrefix: { color: COLORS.textSecondary, fontWeight: '900', marginRight: 4 },
  responsiveRestName: { fontWeight: '900', includeFontPadding: false, flexShrink: 1 },
  triadPrepCardInner: { width: '100%', flex: 1, justifyContent: 'center', alignItems: 'stretch' },
  triadPrepFightBox: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.026)',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  triadPrepFightRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  triadPrepNameCluster: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  triadPrepRoleBlock: {
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 0,
    textAlign: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  triadPrepFightName: {
    alignSelf: 'center',
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
  triadPrepVsColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  triadPrepVsText: {
    color: COLORS.textMuted,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 0.7,
    textAlign: 'center',
    alignSelf: 'center',
    marginHorizontal: 7,
  },
  triadPrepVsDivider: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  triadPrepVsLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(245,247,250,0.26)',
  },
  triadPrepRestLine: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  triadPrepRestHeading: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  triadPrepRestHeadingLine: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(247, 183, 51, 0.92)',
  },
  triadPrepRestHeadingText: {
    color: COLORS.accentMainStrong,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  triadPrepRestBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  triadPrepRestText: {
    color: COLORS.accentAlert,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 0.8,
    marginRight: 6,
  },
  triadPrepRestRoleText: {
    fontWeight: '900',
    includeFontPadding: false,
    textAlign: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  triadPrepRestNameInline: {
    minWidth: 0,
    flexShrink: 1,
    fontWeight: '900',
    includeFontPadding: false,
    textAlign: 'center',
    alignSelf: 'center',
  },
  triadPrepRow: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  triadPrepRowRest: {
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
  },
  triadPrepRoleColumn: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  triadPrepRowLabel: {
    marginTop: 3,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 0.7,
    textAlign: 'center',
  },
  triadPrepRowName: {
    flex: 1,
    minWidth: 0,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
  triadPrepActiveSlot: {
    width: '100%',
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  triadPrepRolePill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 6,
  },
  triadPrepRestRolePill: { marginBottom: 0, marginRight: 6 },
  triadPrepRoleText: { fontWeight: '900', includeFontPadding: false, textAlign: 'center' },
  triadPrepActiveName: {
    width: '100%',
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
  triadPrepVsBadge: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 9 },
  triadPrepRestBar: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  triadPrepRestLabel: {
    color: COLORS.textMuted,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 0.7,
    marginRight: 6,
  },
  triadPrepRestName: {
    flexShrink: 1,
    fontWeight: '900',
    includeFontPadding: false,
  },
  
  mixedContainerMath: {
    width: '100%',
    backgroundColor: COLORS.bgPanel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(247, 183, 51, 0.36)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  mixedTitleMath: { color: COLORS.accentMain, fontSize: 16, fontWeight: '900', letterSpacing: 1, marginRight: 12 },
  mixedWrapMath: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'stretch' },
  mixedMatchCard: { width: '100%', minHeight: 92, backgroundColor: COLORS.bgPanel2, borderRadius: 18, paddingVertical: 4, paddingHorizontal: 4, margin: 0, borderWidth: 1, borderColor: COLORS.borderSoft, justifyContent: 'center' },
  
  restingContainerMath: {
    width: '100%',
    backgroundColor: COLORS.bgPanel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  restingTitleMath: { color: COLORS.accentAlert, fontSize: 16, fontWeight: '900', letterSpacing: 1, marginRight: 12 },
  restingWrapMath: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', alignContent: 'flex-start', gap: 8 },
  restingBadge: { backgroundColor: COLORS.bgPanel2, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 999, marginRight: 0, borderWidth: 1, borderColor: 'rgba(255, 77, 109, 0.42)' },
  restingPlayerTextMath: { fontSize: 20, fontWeight: '900', color: COLORS.accentAlert },
  timerScroll: { flex: 1 },
  timerScrollContent: { flexGrow: 1, alignItems: 'stretch' },
  
  bottomButtonsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgPanel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginHorizontal: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  
  btnStandard: { backgroundColor: COLORS.bgMain, borderColor: COLORS.borderSoft },
  btnImportant: { backgroundColor: COLORS.accentMain, borderColor: COLORS.accentMain },
  btnSecondary: { backgroundColor: COLORS.bgMain, borderColor: 'rgba(255, 77, 109, 0.45)' },
  btnStop: { backgroundColor: COLORS.accentAlert, borderColor: COLORS.accentAlert },
  
  controlButtonSmall: { borderRadius: 18, alignItems: 'center', borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  controlButtonTextSmall: { color: COLORS.textPrimary, fontWeight: '900' },
  
  aboutButtonFixed: { position: 'absolute', bottom: 12, left: 12, backgroundColor: COLORS.bgPanel2, borderRadius: 999, borderWidth: 1, borderColor: COLORS.borderSoft, width: 38, height: 38, justifyContent: 'center', alignItems: 'center', opacity: 0.7 },
  aboutButtonInline: { alignSelf: 'flex-start', backgroundColor: COLORS.bgPanel2, borderRadius: 999, borderWidth: 1, borderColor: COLORS.borderSoft, width: 38, height: 38, justifyContent: 'center', alignItems: 'center', opacity: 0.7, marginTop: 8 },
  aboutButtonFixedText: { fontSize: 17, includeFontPadding: false },
  aboutLinkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgPanel2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderSoft, paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  aboutLinkIcon: { fontSize: 18 },
  aboutLinkText: { color: COLORS.accentCool, fontSize: 15, fontWeight: '700', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(7,17,31,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxHeight: '80%', backgroundColor: COLORS.bgPanel, padding: 20, borderRadius: 20, borderWidth: 2, borderColor: COLORS.borderStrong, alignItems: 'center' },
  modalTitle: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  dropoutModalContent: { width: '76%', maxHeight: '82%', borderWidth: 1, borderColor: COLORS.borderSoft, borderRadius: 24, padding: 18 },
  dropoutModalSubtitle: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: -8, marginBottom: 18, maxWidth: 520 },
  dropoutList: { gap: 10, paddingBottom: 4 },
  dropoutRow: {
    width: '100%',
    backgroundColor: COLORS.bgPanel2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  dropoutRowActive: {
    backgroundColor: 'rgba(73, 198, 255, 0.12)',
    borderColor: 'rgba(73, 198, 255, 0.42)',
  },
  dropoutPlayerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dropoutDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.borderStrong, marginRight: 12 },
  dropoutDotActive: { backgroundColor: COLORS.accentCool },
  dropoutPlayerName: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '900', flexShrink: 1 },
  dropoutPlayerNameActive: { color: COLORS.accentCool },
  dropoutBadge: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dropoutBadgeActive: {
    backgroundColor: 'rgba(73, 198, 255, 0.14)',
    borderColor: 'rgba(73, 198, 255, 0.42)',
  },
  dropoutBadgeText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  dropoutBadgeTextActive: { color: COLORS.accentCool },
  dropoutActionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, width: '100%', marginTop: 18 },
  dropoutCancelButton: { marginTop: 0, minWidth: 180 },
  dropoutConfirmButton: { minWidth: 180, alignItems: 'center', justifyContent: 'center' },
  dropoutConfirmButtonDisabled: { opacity: 0.45 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', backgroundColor: COLORS.bgPanel2, padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.borderSoft },
  modalPlayerText: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '900' },
  removeButton: { backgroundColor: COLORS.accentAlert, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  removeButtonText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  closeModalButton: { backgroundColor: COLORS.borderSoft, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 15, marginTop: 20 },
  closeModalButtonText: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900' },
});
