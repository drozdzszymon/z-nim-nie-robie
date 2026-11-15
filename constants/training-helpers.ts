import {
  DEFAULT_ADULT_SKILL_LEVEL,
  type AdultSkillLevel,
  type Gender,
  type Match,
  type RealPlayer,
  type SkillLevel,
  type TrainingMode,
  type TrainingSession,
  type TrainingSessionPair,
} from '../app/(tabs)/types';

export const MIN_PLAYER_WEIGHT_KG = 10;
export const MAX_PLAYER_WEIGHT_KG = 300;

export const sanitizeDecimalWeightInput = (raw: string): string => {
  const cleaned = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [first, ...rest] = cleaned.split('.');
  return rest.length > 0 ? `${first}.${rest.join('')}` : first;
};

export const parsePlayerWeight = (raw: string): number | null => {
  const normalized = raw.trim().replace(/,/g, '.');
  if (!normalized || !/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < MIN_PLAYER_WEIGHT_KG || value > MAX_PLAYER_WEIGHT_KG) {
    return null;
  }
  return Math.round(value * 10) / 10;
};

export const normalizeAdultSkillLevel = (skillLevel: number): AdultSkillLevel => {
  const parsedSkillLevel = Number.isFinite(skillLevel)
    ? Math.round(skillLevel)
    : DEFAULT_ADULT_SKILL_LEVEL;

  if (parsedSkillLevel <= 1) return 1;
  if (parsedSkillLevel === 2) return 2;
  if (parsedSkillLevel === 3) return 3;
  return 4;
};

export const getNormalizedPlayerSkillLevel = (
  player: Pick<RealPlayer, 'type' | 'skillLevel'>,
  migrateLegacyThreeLevelScale = false,
): SkillLevel => {
  if (player.type !== 'ADULT') return 0;

  const normalizedSkillLevel = normalizeAdultSkillLevel(Number(player.skillLevel));
  if (migrateLegacyThreeLevelScale && normalizedSkillLevel === 3) {
    return 4;
  }
  return normalizedSkillLevel;
};

export const normalizeStoredPlayer = (
  player: Partial<RealPlayer> & { id: string; type: 'KID' | 'ADULT'; gear: 'GI' | 'NO'; weight: number },
  migrateLegacyThreeLevelScale = false,
): RealPlayer => ({
  id: player.id.trim().toUpperCase(),
  type: player.type,
  gear: player.gear,
  gender: player.gender === 'F' ? 'F' : 'M',
  weight: Math.round(player.weight * 10) / 10,
  skillLevel: getNormalizedPlayerSkillLevel(
    { type: player.type, skillLevel: (player.skillLevel ?? 0) as SkillLevel },
    migrateLegacyThreeLevelScale,
  ),
  isGuest: false,
  restDebt: 0,
  lastRestRound: 0,
  consecutiveMatches: 0,
  helpedKidCount: 0,
  mismatchDebt: 0,
});

export const sanitizeStoredPlayers = (
  rawJson: string | null,
  migrateLegacyThreeLevelScale = false,
): RealPlayer[] => {
  if (!rawJson) return [];
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];

    const seenIds = new Set<string>();
    const result: RealPlayer[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      if (rec.type === 'DUMMY') continue;
      if (typeof rec.id !== 'string' || rec.id.trim().length === 0) continue;

      const normalizedId = rec.id.trim().toUpperCase();
      if (seenIds.has(normalizedId)) continue;

      const type: 'KID' | 'ADULT' = rec.type === 'KID' ? 'KID' : 'ADULT';
      const gear: 'GI' | 'NO' = rec.gear === 'GI' ? 'GI' : 'NO';
      const gender: Gender = rec.gender === 'F' ? 'F' : 'M';
      const weightNum = Number(rec.weight);
      if (!Number.isFinite(weightNum) || weightNum <= 0 || weightNum > MAX_PLAYER_WEIGHT_KG) continue;

      seenIds.add(normalizedId);
      result.push(
        normalizeStoredPlayer(
          {
            id: normalizedId,
            type,
            gear,
            gender,
            weight: weightNum,
            skillLevel: Number(rec.skillLevel ?? 0) as SkillLevel,
          },
          migrateLegacyThreeLevelScale,
        ),
      );
    }

    return result;
  } catch {
    return [];
  }
};

export const sanitizeTrainingHistory = (rawJson: string | null): TrainingSession[] => {
  if (!rawJson) return [];
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];

    const validModes = new Set<TrainingMode>(['SPARING', 'ZADANIOWKI', 'DRILLE']);
    const result: TrainingSession[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      if (typeof rec.id !== 'string' || !rec.id) continue;
      if (typeof rec.date !== 'string' || Number.isNaN(new Date(rec.date).getTime())) continue;
      const mode: TrainingMode = validModes.has(rec.mode as TrainingMode)
        ? (rec.mode as TrainingMode)
        : 'SPARING';
      const rounds = Number.isFinite(Number(rec.rounds)) ? Math.max(0, Math.round(Number(rec.rounds))) : 0;
      const roundTimeMin = Number.isFinite(Number(rec.roundTimeMin))
        ? Math.max(0, Number(rec.roundTimeMin))
        : 0;
      const players = Array.isArray(rec.players)
        ? rec.players.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        : [];
      const pairs: TrainingSessionPair[][] = Array.isArray(rec.pairs)
        ? rec.pairs
            .filter(Array.isArray)
            .map((roundPairs) =>
              roundPairs
                .filter(
                  (pair): pair is TrainingSessionPair =>
                    Boolean(pair) &&
                    typeof pair === 'object' &&
                    typeof (pair as TrainingSessionPair).p1 === 'string' &&
                    typeof (pair as TrainingSessionPair).p2 === 'string',
                )
                .map((pair) => ({ p1: pair.p1, p2: pair.p2 })),
            )
        : [];

      result.push({
        id: rec.id,
        date: rec.date,
        mode,
        rounds,
        roundTimeMin,
        players,
        pairs,
      });
    }

    return result;
  } catch {
    return [];
  }
};

export const calcBestWeightThreshold = (players: RealPlayer[]): number => {
  const weights = players
    .map((p) => p.weight)
    .filter((w) => Number.isFinite(w) && w > 0)
    .sort((a, b) => a - b);

  if (weights.length < 4) return 80;

  let bestThreshold = Math.floor(weights[Math.floor(weights.length / 2)]);
  let bestDiff = Infinity;
  let bestCountGap = Infinity;

  for (let i = 0; i < weights.length - 1; i++) {
    if (weights[i] === weights[i + 1]) continue;

    const floored = Math.floor((weights[i] + weights[i + 1]) / 2);
    const threshold =
      floored >= weights[i] && floored < weights[i + 1]
        ? floored
        : Math.round(((weights[i] + weights[i + 1]) / 2) * 10) / 10;

    const countA = i + 1;
    const countB = weights.length - countA;
    if (countA < 2 || countB < 2) continue;

    const pairsA = Math.floor(countA / 2);
    const pairsB = Math.floor(countB / 2);
    const diff = Math.abs(pairsA - pairsB);
    const countGap = Math.abs(countA - countB);

    if (diff < bestDiff || (diff === bestDiff && countGap < bestCountGap)) {
      bestDiff = diff;
      bestCountGap = countGap;
      bestThreshold = threshold;
    }
  }

  return bestThreshold;
};

export const sortForZadaniowki = (players: RealPlayer[]) => {
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
  const result = groups.filter((group) => group.length > 1).map((group) => [...group]);
  const singletons = groups
    .filter((group) => group.length === 1)
    .map((group) => group[0])
    .filter(Boolean);

  if (result.length === 0 && singletons.length === 2) {
    const first = singletons[0];
    const second = singletons[1];
    return first && second ? [[first, second]] : [];
  }

  for (const singleton of singletons) {
    const targetIndex = result.findIndex((group) => group.length === 2);

    if (singleton && targetIndex >= 0) {
      result[targetIndex] = [...result[targetIndex], singleton];
    } else if (singleton) {
      const sameGearTripleIndex = result.findIndex(
        (group) => group.length === 3 && group.every((player) => player.gear === singleton.gear),
      );
      const noGiTripleIndex = result.findIndex(
        (group) => group.length === 3 && group.every((player) => player.gear === 'NO'),
      );
      const oppositeTripleIndex = result.findIndex(
        (group) => group.length === 3 && group.every((player) => player.gear !== singleton.gear),
      );
      const anyTripleIndex = result.findIndex((group) => group.length === 3);
      const donorIndex =
        singleton.gear === 'GI'
          ? noGiTripleIndex >= 0
            ? noGiTripleIndex
            : anyTripleIndex
          : sameGearTripleIndex >= 0
            ? sameGearTripleIndex
            : oppositeTripleIndex;

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
  const result = groups.map((group) => [...group]);

  while (true) {
    const giPairIndex = result.findIndex(
      (group) => group.length === 2 && group.every((player) => player.gear === 'GI'),
    );
    const noGiTriadIndex = result.findIndex(
      (group) => group.length === 3 && group.every((player) => player.gear === 'NO'),
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

export const chunkZadaniowkiByGear = (players: RealPlayer[]) => {
  const giGroups = chunkSameGearForTriads(
    sortForZadaniowki(players.filter((player) => player.gear === 'GI')),
  );
  const noGiGroups = chunkSameGearForTriads(
    sortForZadaniowki(players.filter((player) => player.gear === 'NO')),
  );

  return completeGiPairsFromNoGiTriads(
    mergeSingletonZadaniowkiGroups([...giGroups, ...noGiGroups]),
  );
};

const countPlayersByGear = (players: RealPlayer[]) => {
  return players.reduce(
    (counts, player) => {
      counts[player.gear] += 1;
      return counts;
    },
    { GI: 0, NO: 0 } as Record<RealPlayer['gear'], number>,
  );
};

const countPairGroups = (groups: RealPlayer[][]) => {
  return groups.filter((group) => group.length === 2).length;
};

const getGearGroupingPenalty = (groups: RealPlayer[][]) => {
  return groups.reduce((penalty, group) => {
    const gearCount = new Set(group.map((player) => player.gear)).size;
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

const findSafestAdultPairForPromotedKid = (adults: RealPlayer[], promotedKid: RealPlayer) => {
  let bestPair: RealPlayer[] | null = null;
  let bestScore: number[] | null = null;

  for (let i = 0; i < adults.length; i++) {
    for (let j = i + 1; j < adults.length; j++) {
      const pair = [adults[i], adults[j]];
      const remainingAdults = adults.filter(
        (adult) => adult.id !== pair[0].id && adult.id !== pair[1].id,
      );
      const remainingGroups = chunkZadaniowkiByGear(remainingAdults);
      const score = [
        getGearGroupingPenalty([...remainingGroups, [...pair, promotedKid]]),
        pair.filter((adult) => adult.gear !== promotedKid.gear).length,
        Math.max(...pair.map((adult) => Number(adult.skillLevel) || 0)),
        pair.reduce((sum, adult) => sum + (Number(adult.skillLevel) || 0), 0),
        Math.max(...pair.map((adult) => adult.weight)),
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

const chooseKidToPromoteToAdults = (
  kids: RealPlayer[],
  adults: RealPlayer[],
  currentKidGearPenalty: number,
) => {
  const gearCounts = countPlayersByGear(kids);
  const movableKids = kids.filter((kid) => {
    const gearCount = gearCounts[kid.gear];
    return gearCount % 3 !== 0;
  });
  const stableCandidates = movableKids.filter((kid) => {
    const groupsWithoutKid = chunkZadaniowkiByGear(kids.filter((player) => player.id !== kid.id));
    return getGearGroupingPenalty(groupsWithoutKid) <= currentKidGearPenalty;
  });
  const candidates = stableCandidates.length > 0 ? stableCandidates : movableKids;

  const getCandidateScore = (kid: RealPlayer) => {
    const groupsWithoutKid = chunkZadaniowkiByGear(kids.filter((player) => player.id !== kid.id));
    const gearPenalty = getGearGroupingPenalty(groupsWithoutKid);
    const adultPair = findSafestAdultPairForPromotedKid(adults, kid);
    const adultGearPenalty = adultPair
      ? adultPair.filter((adult) => adult.gear !== kid.gear).length
      : 99;
    const gearCount = gearCounts[kid.gear];
    const gearRemainder = gearCount % 3;
    const remainderPriority = gearRemainder === 1 ? 0 : gearRemainder === 2 ? 1 : 2;
    const pairBreakPenalty = gearCount === 2 ? 1 : 0;

    return [gearPenalty, remainderPriority, pairBreakPenalty, adultGearPenalty, -kid.weight];
  };

  return (
    [...candidates].sort((a, b) => {
      const scoreCompare = compareScoreTuple(getCandidateScore(a), getCandidateScore(b));
      if (scoreCompare !== 0) return scoreCompare;
      return a.id.localeCompare(b.id, 'pl', { sensitivity: 'base' });
    })[0] ?? null
  );
};

export const buildTriadZadaniowkiGroupsWithResting = (
  players: RealPlayer[],
): { groups: RealPlayer[][]; resting: RealPlayer[] } => {
  if (players.length === 0) return { groups: [], resting: [] };
  if (players.length === 1) return { groups: [], resting: [players[0]] };

  let kids = sortForZadaniowki(players.filter((p) => p.type === 'KID'));
  let adults = sortForZadaniowki(players.filter((p) => p.type === 'ADULT'));
  const promotedAdultGroups: RealPlayer[][] = [];

  let kidsGroups = chunkZadaniowkiByGear(kids);
  let adultsGroups = chunkZadaniowkiByGear(adults);

  while (countPairGroups(kidsGroups) >= 2 && adultsGroups.some((group) => group.length === 2)) {
    const currentKidGearPenalty = getGearGroupingPenalty(kidsGroups);
    const promotedKid = chooseKidToPromoteToAdults(kids, adults, currentKidGearPenalty);
    const safestAdultPair = promotedKid
      ? findSafestAdultPairForPromotedKid(adults, promotedKid)
      : null;

    if (!promotedKid || !safestAdultPair) {
      break;
    }

    const safestAdultIds = new Set(safestAdultPair.map((player) => player.id));
    kids = kids.filter((player) => player.id !== promotedKid.id);
    adults = adults.filter((player) => !safestAdultIds.has(player.id));
    promotedAdultGroups.push([...safestAdultPair, promotedKid]);

    kidsGroups = chunkZadaniowkiByGear(kids);
    adultsGroups = chunkZadaniowkiByGear(adults);
  }

  // Singleton kids who can't form a pair/triad get merged into adult groups
  const singletonKids = kids.filter((kid) =>
    kidsGroups.some((g) => g.length === 1 && g[0].id === kid.id),
  );
  if (singletonKids.length > 0) {
    kids = kids.filter((k) => !singletonKids.some((sk) => sk.id === k.id));
    adults = [...adults, ...singletonKids];
    kidsGroups = chunkZadaniowkiByGear(kids);
    adultsGroups = chunkZadaniowkiByGear(adults);
  }

  // Resolve any remaining singleton (e.g. 1 lone ADULT with >=2 KIDS) so no player ever renders null
  const allRawGroups = [...kidsGroups, ...adultsGroups, ...promotedAdultGroups];
  const validGroups = allRawGroups.filter((g) => g.length >= 2).map((g) => [...g]);
  const singletons = allRawGroups
    .filter((g) => g.length === 1)
    .map((g) => g[0])
    .filter(Boolean);

  const leftoverResting: RealPlayer[] = [];

  while (singletons.length >= 2) {
    const first = singletons.shift()!;
    const second = singletons.shift()!;
    validGroups.push([first, second]);
  }

  if (singletons.length === 1) {
    const lone = singletons[0];
    // Prefer joining the heaviest 2-person group (and matching gear first) to form a 3-person triad
    let bestDuoIdx = -1;
    let bestDuoScore: number[] | null = null;

    for (let idx = 0; idx < validGroups.length; idx++) {
      const grp = validGroups[idx];
      if (grp.length !== 2) continue;
      const gearMismatch = grp.filter((p) => p.gear !== lone.gear).length;
      const avgWeightDiff =
        grp.reduce((sum, p) => sum + Math.abs(p.weight - lone.weight), 0) / grp.length;
      const score = [gearMismatch, avgWeightDiff];
      if (!bestDuoScore || compareScoreTuple(score, bestDuoScore) < 0) {
        bestDuoScore = score;
        bestDuoIdx = idx;
      }
    }

    if (bestDuoIdx >= 0) {
      validGroups[bestDuoIdx] = [...validGroups[bestDuoIdx], lone];
    } else {
      // Only 3-person triads exist: pull the closest-weight player from the closest triad to form a valid pair
      let bestTriadIdx = -1;
      let bestPartnerIdx = -1;
      let bestTriadScore: number[] | null = null;

      for (let idx = 0; idx < validGroups.length; idx++) {
        const grp = validGroups[idx];
        if (grp.length !== 3) continue;
        for (let pIdx = 0; pIdx < grp.length; pIdx++) {
          const candidate = grp[pIdx];
          const gearMismatch = candidate.gear === lone.gear ? 0 : 1;
          const weightDiff = Math.abs(candidate.weight - lone.weight);
          const score = [gearMismatch, weightDiff];
          if (!bestTriadScore || compareScoreTuple(score, bestTriadScore) < 0) {
            bestTriadScore = score;
            bestTriadIdx = idx;
            bestPartnerIdx = pIdx;
          }
        }
      }

      if (bestTriadIdx >= 0 && bestPartnerIdx >= 0) {
        const partner = validGroups[bestTriadIdx][bestPartnerIdx];
        validGroups[bestTriadIdx] = validGroups[bestTriadIdx].filter((_, i) => i !== bestPartnerIdx);
        validGroups.push([lone, partner]);
      } else {
        leftoverResting.push(lone);
      }
    }
  }

  return { groups: validGroups, resting: leftoverResting };
};

export const buildTriadZadaniowkiGroups = (players: RealPlayer[]): RealPlayer[][] => {
  return buildTriadZadaniowkiGroupsWithResting(players).groups;
};

export const getTriadStageRoles = (step: number): { btm: number; top: number; rest: number } => {
  const mod = (((step - 1) % 6) + 6) % 6;
  switch (mod) {
    case 0:
      return { btm: 0, top: 1, rest: 2 };
    case 1:
      return { btm: 0, top: 2, rest: 1 };
    case 2:
      return { btm: 2, top: 1, rest: 0 };
    case 3:
      return { btm: 2, top: 0, rest: 1 };
    case 4:
      return { btm: 1, top: 0, rest: 2 };
    default:
      return { btm: 1, top: 2, rest: 0 };
  }
};

export const extractActiveStagePairs = ({
  trainingMode,
  zadaniowkiType,
  step,
  matches,
  zadaniowkiGroups,
}: {
  trainingMode: TrainingMode;
  zadaniowkiType: 'TRÓJKI' | 'DWÓJKI';
  step: number;
  matches: Match[];
  zadaniowkiGroups: RealPlayer[][];
}): TrainingSessionPair[] => {
  if (trainingMode === 'ZADANIOWKI' && zadaniowkiType === 'TRÓJKI') {
    const roles = getTriadStageRoles(step);
    const pairs: TrainingSessionPair[] = [];
    for (const group of zadaniowkiGroups) {
      if (group.length === 3) {
        pairs.push({ p1: group[roles.btm].id, p2: group[roles.top].id });
      } else if (group.length === 2) {
        pairs.push(step % 2 === 1 ? { p1: group[0].id, p2: group[1].id } : { p1: group[1].id, p2: group[0].id });
      }
    }
    return pairs;
  }

  return matches.map((m) => ({ p1: m.p1.id, p2: m.p2.id }));
};
