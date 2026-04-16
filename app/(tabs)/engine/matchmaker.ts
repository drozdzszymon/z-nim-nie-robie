import { RealPlayer, Match, HistoryRecord } from '../types';

type GroupType = 'KID' | 'ADULT';
type BucketType = 'A' | 'B' | 'C' | 'D';

type MatchingPlayer = {
    id: string;
    nickname: string;
    originalAgeGroup: GroupType;
    matchingAgeGroup: GroupType;
    outfit: string;
    weightKg: number;
    matchingSkillLevel: number;
    isPromotedKid: boolean;
    originalRef: RealPlayer;
    bucketCounts?: {
        A: number;
        B: number;
        C: number;
        D: number;
    };
};

type KidPairScore = {
    recentPenalty: number;
    repeatCount: number;
    totalTimesMet: number;
    mixedOutfitCount: number;
    totalLastMetRound: number;
    totalWeightDiff: number;
};

type AdultMatchingScore = {
    promotedKidOutfitMismatchTotal: number;
    promotedKidRecentPenalty: number;
    promotedKidRepeatCount: number;
    promotedKidTimesMetTotal: number;
    promotedKidSafeRankTotal: number;
    promotedKidAdultSkillTotal: number;
    promotedKidAdultWeightTotal: number;
    promotedKidWeightDiffTotal: number;
    bucketA: number;
    bucketB: number;
    bucketC: number;
    bucketD: number;
    recentPenalty: number;
    repeatCount: number;
    totalTimesMet: number;
    totalSkillDiff: number;
    totalWeightDiff: number;
    totalLastMetRound: number;
};

type AdultSearchState = {
    remaining: MatchingPlayer[];
    pairs: [MatchingPlayer, MatchingPlayer][];
    score: AdultMatchingScore;
    key: string;
};

type PromotionSafetyConfig = {
    promotedKidId: string | null;
    safeAdultIds: Set<string>;
    safeAdultRank: Map<string, number>;
};

const ADULT_EXACT_LIMIT = 10;
const ADULT_BEAM_WIDTH = 32;
const ADULT_CANDIDATE_LIMIT = 4;
const FREE_OUTFIT = 'FREE';

// --- FUNKCJE POMOCNICZE DO HISTORII ---

const getTimesMet = (
    p1: { id: string } | string,
    p2: { id: string } | string,
    history: Map<string, HistoryRecord>
) => {
    const p1Id = typeof p1 === 'string' ? p1 : p1.id;
    const p2Id = typeof p2 === 'string' ? p2 : p2.id;
    return history.get(p1Id)?.pairHistory[p2Id] || 0;
};

const getLastMetRound = (
    p1: { id: string } | string,
    p2: { id: string } | string,
    history: Map<string, HistoryRecord>
) => {
    const p1Id = typeof p1 === 'string' ? p1 : p1.id;
    const p2Id = typeof p2 === 'string' ? p2 : p2.id;
    return history.get(p1Id)?.lastRoundMet[p2Id] || 0;
};

const getRecentRepeatPenalty = (
    p1: { id: string },
    p2: { id: string },
    history: Map<string, HistoryRecord>,
    roundNumber: number
) => {
    const lastMet = getLastMetRound(p1, p2, history);
    if (lastMet === 0) return 0;
    if (lastMet === roundNumber - 1) return 100000;
    if (lastMet === roundNumber - 2) return 50000;
    return 0;
};

const getSkillDifference = (p1: MatchingPlayer, p2: MatchingPlayer) => {
    return Math.abs(p1.matchingSkillLevel - p2.matchingSkillLevel);
};

const getWeightDifference = (p1: MatchingPlayer, p2: MatchingPlayer) => {
    return Math.abs(p1.weightKg - p2.weightKg);
};

// Stabilny tie-break zamiast Math.random() w sort()
const createTieBreakerMap = (players: { id: string }[]) => {
    const ids = players.map(p => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const map = new Map<string, number>();
    ids.forEach((id, index) => map.set(id, index));
    return map;
};

const tieBreak = (aId: string, bId: string, tieMap: Map<string, number>) => {
    return (tieMap.get(aId) ?? 0) - (tieMap.get(bId) ?? 0);
};

const getBucketType = (
    p1: MatchingPlayer,
    p2: MatchingPlayer,
    history: Map<string, HistoryRecord>
): BucketType => {
    const sameOutfit = p1.outfit === p2.outfit;
    const isNewPair = getTimesMet(p1, p2, history) === 0;

    if (sameOutfit && isNewPair) return 'A';
    if (!sameOutfit && isNewPair) return 'B';
    if (sameOutfit && !isNewPair) return 'C';
    return 'D';
};

const hasCompletedSameOutfitRoundRobin = (
    players: RealPlayer[],
    history: Map<string, HistoryRecord>
) => {
    const byOutfit = new Map<string, RealPlayer[]>();

    for (const player of players) {
        const group = byOutfit.get(player.gear) ?? [];
        group.push(player);
        byOutfit.set(player.gear, group);
    }

    return [...byOutfit.values()].some(group => {
        if (group.length < 2) return false;

        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                if (getTimesMet(group[i], group[j], history) === 0) {
                    return false;
                }
            }
        }

        return true;
    });
};

const buildPromotionSafetyConfig = (
    adults: RealPlayer[],
    promotedKid: RealPlayer | null,
    ignoreOutfitPriority: boolean
): PromotionSafetyConfig => {
    if (!promotedKid || adults.length === 0) {
        return {
            promotedKidId: null,
            safeAdultIds: new Set<string>(),
            safeAdultRank: new Map<string, number>()
        };
    }

    const safestAdults = [...adults]
        .sort((a, b) => {
            if (!ignoreOutfitPriority) {
                const outfitCmp = Number(a.gear !== promotedKid.gear) - Number(b.gear !== promotedKid.gear);
                if (outfitCmp !== 0) return outfitCmp;
            }

            const skillCmp = Number(a.skillLevel ?? 0) - Number(b.skillLevel ?? 0);
            if (skillCmp !== 0) return skillCmp;

            const weightCmp = a.weight - b.weight;
            if (weightCmp !== 0) return weightCmp;

            return a.id.localeCompare(b.id);
        });

    const safeAdultIds = new Set<string>(safestAdults.map(adult => adult.id));
    const safeAdultRank = new Map<string, number>();

    safestAdults.forEach((adult, index) => {
        safeAdultRank.set(adult.id, index);
    });

    return {
        promotedKidId: promotedKid.id,
        safeAdultIds,
        safeAdultRank
    };
};

const isPromotedKidPair = (p1: MatchingPlayer, p2: MatchingPlayer) => {
    return p1.isPromotedKid || p2.isPromotedKid;
};

const isAllowedPromotedKidAdultPair = (
    p1: MatchingPlayer,
    p2: MatchingPlayer,
    promotionSafety: PromotionSafetyConfig
) => {
    if (!isPromotedKidPair(p1, p2)) {
        return true;
    }

    if (!promotionSafety.promotedKidId) {
        return true;
    }

    const adult = p1.isPromotedKid ? p2 : p1;
    return promotionSafety.safeAdultIds.has(adult.id);
};

const getPromotedKidPairMetrics = (
    p1: MatchingPlayer,
    p2: MatchingPlayer,
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    promotionSafety: PromotionSafetyConfig
) => {
    if (!isPromotedKidPair(p1, p2)) {
        return {
            outfitMismatch: 0,
            recentPenalty: 0,
            repeatCount: 0,
            timesMet: 0,
            safeRank: 0,
            adultSkill: 0,
            adultWeight: 0,
            weightDiff: 0
        };
    }

    const promotedKid = p1.isPromotedKid ? p1 : p2;
    const adult = p1.isPromotedKid ? p2 : p1;
    const safeRank = promotionSafety.safeAdultRank.get(adult.id) ?? 999999;

    return {
        outfitMismatch: adult.outfit === promotedKid.outfit ? 0 : 1,
        recentPenalty: getRecentRepeatPenalty(promotedKid, adult, history, roundNumber),
        repeatCount: getTimesMet(promotedKid, adult, history) > 0 ? 1 : 0,
        timesMet: getTimesMet(promotedKid, adult, history),
        safeRank,
        adultSkill: adult.matchingSkillLevel,
        adultWeight: adult.weightKg,
        weightDiff: Math.abs(adult.weightKg - promotedKid.weightKg)
    };
};

// --- LOGIKA KOSZYKÓW A/B/C/D ---

const getBucketCountsForPlayer = (
    p1: MatchingPlayer,
    unassigned: MatchingPlayer[],
    history: Map<string, HistoryRecord>
) => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };

    for (const p2 of unassigned) {
        if (p2.id === p1.id) continue;
        if (p2.matchingAgeGroup !== p1.matchingAgeGroup) continue;

        const bucket = getBucketType(p1, p2, history);
        counts[bucket]++;
    }

    return counts;
};

const compareBucketCounts = (
    a: { A: number; B: number; C: number; D: number },
    b: { A: number; B: number; C: number; D: number }
) => {
    if (a.A !== b.A) return a.A - b.A;
    if (a.B !== b.B) return a.B - b.B;
    if (a.C !== b.C) return a.C - b.C;
    if (a.D !== b.D) return a.D - b.D;
    return 0;
};

// --- KID GLOBAL SCORE ---

const emptyKidPairScore = (): KidPairScore => ({
    recentPenalty: 0,
    repeatCount: 0,
    totalTimesMet: 0,
    mixedOutfitCount: 0,
    totalLastMetRound: 0,
    totalWeightDiff: 0
});

const addKidPairScore = (base: KidPairScore, add: KidPairScore): KidPairScore => ({
    recentPenalty: base.recentPenalty + add.recentPenalty,
    repeatCount: base.repeatCount + add.repeatCount,
    totalTimesMet: base.totalTimesMet + add.totalTimesMet,
    mixedOutfitCount: base.mixedOutfitCount + add.mixedOutfitCount,
    totalLastMetRound: base.totalLastMetRound + add.totalLastMetRound,
    totalWeightDiff: base.totalWeightDiff + add.totalWeightDiff
});

const compareKidScores = (a: KidPairScore, b: KidPairScore) => {
    if (a.repeatCount !== b.repeatCount) return a.repeatCount - b.repeatCount;
    if (a.recentPenalty !== b.recentPenalty) return a.recentPenalty - b.recentPenalty;
    if (a.totalTimesMet !== b.totalTimesMet) return a.totalTimesMet - b.totalTimesMet;
    if (a.mixedOutfitCount !== b.mixedOutfitCount) return a.mixedOutfitCount - b.mixedOutfitCount;
    if (a.totalWeightDiff !== b.totalWeightDiff) return a.totalWeightDiff - b.totalWeightDiff;
    if (a.totalLastMetRound !== b.totalLastMetRound) return a.totalLastMetRound - b.totalLastMetRound;
    return 0;
};

const getSingleKidPairScore = (
    p1: MatchingPlayer,
    p2: MatchingPlayer,
    history: Map<string, HistoryRecord>,
    roundNumber: number
): KidPairScore => {
    const timesMet = getTimesMet(p1, p2, history);
    const lastMet = getLastMetRound(p1, p2, history);

    return {
        recentPenalty: getRecentRepeatPenalty(p1, p2, history, roundNumber),
        repeatCount: timesMet > 0 ? 1 : 0,
        totalTimesMet: timesMet,
        mixedOutfitCount: p1.outfit === p2.outfit ? 0 : 1,
        totalLastMetRound: lastMet,
        totalWeightDiff: getWeightDifference(p1, p2)
    };
};

const findBestKidMatching = (
    players: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>
): { pairs: [MatchingPlayer, MatchingPlayer][]; score: KidPairScore } => {
    if (players.length === 0) {
        return { pairs: [], score: emptyKidPairScore() };
    }

    const sortedPlayers = [...players].sort((a, b) => {
        const aCounts = getBucketCountsForPlayer(a, players, history);
        const bCounts = getBucketCountsForPlayer(b, players, history);
        const cmp = compareBucketCounts(aCounts, bCounts);
        if (cmp !== 0) return cmp;
        return tieBreak(a.id, b.id, tieMap);
    });

    const [p1, ...rest] = sortedPlayers;
    let best: { pairs: [MatchingPlayer, MatchingPlayer][]; score: KidPairScore } | null = null;

    const candidates = [...rest].sort((a, b) => {
        const scoreA = getSingleKidPairScore(p1, a, history, roundNumber);
        const scoreB = getSingleKidPairScore(p1, b, history, roundNumber);
        const cmp = compareKidScores(scoreA, scoreB);
        if (cmp !== 0) return cmp;
        return tieBreak(a.id, b.id, tieMap);
    });

    for (const p2 of candidates) {
        const remaining = rest.filter(p => p.id !== p2.id);
        const child = findBestKidMatching(remaining, history, roundNumber, tieMap);

        const pairScore = getSingleKidPairScore(p1, p2, history, roundNumber);
        const totalScore = addKidPairScore(pairScore, child.score);

        const candidateResult = {
            pairs: [[p1, p2] as [MatchingPlayer, MatchingPlayer], ...child.pairs],
            score: totalScore
        };

        if (!best) {
            best = candidateResult;
            continue;
        }

        const cmp = compareKidScores(candidateResult.score, best.score);
        if (cmp < 0) {
            best = candidateResult;
            continue;
        }

        if (cmp === 0) {
            const bestSecondId = best.pairs[0]?.[1]?.id ?? '';
            if (tieBreak(p2.id, bestSecondId, tieMap) < 0) {
                best = candidateResult;
            }
        }
    }

    return best!;
};

// --- ADULT GLOBAL SCORE ---

const emptyAdultMatchingScore = (): AdultMatchingScore => ({
    promotedKidOutfitMismatchTotal: 0,
    promotedKidRecentPenalty: 0,
    promotedKidRepeatCount: 0,
    promotedKidTimesMetTotal: 0,
    promotedKidSafeRankTotal: 0,
    promotedKidAdultSkillTotal: 0,
    promotedKidAdultWeightTotal: 0,
    promotedKidWeightDiffTotal: 0,
    bucketA: 0,
    bucketB: 0,
    bucketC: 0,
    bucketD: 0,
    recentPenalty: 0,
    repeatCount: 0,
    totalTimesMet: 0,
    totalSkillDiff: 0,
    totalWeightDiff: 0,
    totalLastMetRound: 0
});

const addAdultMatchingScore = (
    base: AdultMatchingScore,
    add: AdultMatchingScore
): AdultMatchingScore => ({
    promotedKidOutfitMismatchTotal:
        base.promotedKidOutfitMismatchTotal + add.promotedKidOutfitMismatchTotal,
    promotedKidRecentPenalty:
        base.promotedKidRecentPenalty + add.promotedKidRecentPenalty,
    promotedKidRepeatCount:
        base.promotedKidRepeatCount + add.promotedKidRepeatCount,
    promotedKidTimesMetTotal:
        base.promotedKidTimesMetTotal + add.promotedKidTimesMetTotal,
    promotedKidSafeRankTotal:
        base.promotedKidSafeRankTotal + add.promotedKidSafeRankTotal,
    promotedKidAdultSkillTotal:
        base.promotedKidAdultSkillTotal + add.promotedKidAdultSkillTotal,
    promotedKidAdultWeightTotal:
        base.promotedKidAdultWeightTotal + add.promotedKidAdultWeightTotal,
    promotedKidWeightDiffTotal:
        base.promotedKidWeightDiffTotal + add.promotedKidWeightDiffTotal,
    bucketA: base.bucketA + add.bucketA,
    bucketB: base.bucketB + add.bucketB,
    bucketC: base.bucketC + add.bucketC,
    bucketD: base.bucketD + add.bucketD,
    recentPenalty: base.recentPenalty + add.recentPenalty,
    repeatCount: base.repeatCount + add.repeatCount,
    totalTimesMet: base.totalTimesMet + add.totalTimesMet,
    totalSkillDiff: base.totalSkillDiff + add.totalSkillDiff,
    totalWeightDiff: base.totalWeightDiff + add.totalWeightDiff,
    totalLastMetRound: base.totalLastMetRound + add.totalLastMetRound
});

const compareAdultMatchingScores = (
    a: AdultMatchingScore,
    b: AdultMatchingScore
) => {
    // Zero powtórek, jeśli tylko matematycznie da się je utrzymać.
    if (a.repeatCount !== b.repeatCount) return a.repeatCount - b.repeatCount;
    if (a.recentPenalty !== b.recentPenalty) return a.recentPenalty - b.recentPenalty;
    if (a.totalTimesMet !== b.totalTimesMet) return a.totalTimesMet - b.totalTimesMet;

    if (a.promotedKidRepeatCount !== b.promotedKidRepeatCount) {
        return a.promotedKidRepeatCount - b.promotedKidRepeatCount;
    }

    if (a.promotedKidRecentPenalty !== b.promotedKidRecentPenalty) {
        return a.promotedKidRecentPenalty - b.promotedKidRecentPenalty;
    }

    if (a.promotedKidTimesMetTotal !== b.promotedKidTimesMetTotal) {
        return a.promotedKidTimesMetTotal - b.promotedKidTimesMetTotal;
    }

    // Dopiero po wykluczeniu zbędnych powtórek patrzymy na strój.
    const aMixedOutfitPairs = a.bucketB + a.bucketD;
    const bMixedOutfitPairs = b.bucketB + b.bucketD;
    if (aMixedOutfitPairs !== bMixedOutfitPairs) {
        return aMixedOutfitPairs - bMixedOutfitPairs;
    }

    if (a.promotedKidOutfitMismatchTotal !== b.promotedKidOutfitMismatchTotal) {
        return a.promotedKidOutfitMismatchTotal - b.promotedKidOutfitMismatchTotal;
    }

    // Bezpieczeństwo promowanego dzieciaka.
    if (a.promotedKidSafeRankTotal !== b.promotedKidSafeRankTotal) {
        return a.promotedKidSafeRankTotal - b.promotedKidSafeRankTotal;
    }

    if (a.promotedKidAdultSkillTotal !== b.promotedKidAdultSkillTotal) {
        return a.promotedKidAdultSkillTotal - b.promotedKidAdultSkillTotal;
    }

    if (a.promotedKidWeightDiffTotal !== b.promotedKidWeightDiffTotal) {
        return a.promotedKidWeightDiffTotal - b.promotedKidWeightDiffTotal;
    }

    if (a.promotedKidAdultWeightTotal !== b.promotedKidAdultWeightTotal) {
        return a.promotedKidAdultWeightTotal - b.promotedKidAdultWeightTotal;
    }

    // Po stroju: umiejętności, potem waga.
    if (a.totalSkillDiff !== b.totalSkillDiff) return a.totalSkillDiff - b.totalSkillDiff;
    if (a.totalWeightDiff !== b.totalWeightDiff) return a.totalWeightDiff - b.totalWeightDiff;
    if (a.totalLastMetRound !== b.totalLastMetRound) return a.totalLastMetRound - b.totalLastMetRound;
    if (a.bucketA !== b.bucketA) return b.bucketA - a.bucketA;
    if (a.bucketC !== b.bucketC) return b.bucketC - a.bucketC;
    if (a.bucketD !== b.bucketD) return a.bucketD - b.bucketD;

    return 0;
};

const getSingleAdultPairScore = (
    p1: MatchingPlayer,
    p2: MatchingPlayer,
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    promotionSafety: PromotionSafetyConfig
): AdultMatchingScore => {
    const bucket = getBucketType(p1, p2, history);
    const timesMet = getTimesMet(p1, p2, history);
    const lastMet = getLastMetRound(p1, p2, history);
    const promotedMetrics = getPromotedKidPairMetrics(
        p1,
        p2,
        history,
        roundNumber,
        promotionSafety
    );

    return {
        promotedKidOutfitMismatchTotal: promotedMetrics.outfitMismatch,
        promotedKidRecentPenalty: promotedMetrics.recentPenalty,
        promotedKidRepeatCount: promotedMetrics.repeatCount,
        promotedKidTimesMetTotal: promotedMetrics.timesMet,
        promotedKidSafeRankTotal: promotedMetrics.safeRank,
        promotedKidAdultSkillTotal: promotedMetrics.adultSkill,
        promotedKidAdultWeightTotal: promotedMetrics.adultWeight,
        promotedKidWeightDiffTotal: promotedMetrics.weightDiff,
        bucketA: bucket === 'A' ? 1 : 0,
        bucketB: bucket === 'B' ? 1 : 0,
        bucketC: bucket === 'C' ? 1 : 0,
        bucketD: bucket === 'D' ? 1 : 0,
        recentPenalty: getRecentRepeatPenalty(p1, p2, history, roundNumber),
        repeatCount: timesMet > 0 ? 1 : 0,
        totalTimesMet: timesMet,
        totalSkillDiff: getSkillDifference(p1, p2),
        totalWeightDiff: getWeightDifference(p1, p2),
        totalLastMetRound: lastMet
    };
};

const compareSingleAdultCandidates = (
    p1: MatchingPlayer,
    a: MatchingPlayer,
    b: MatchingPlayer,
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>,
    promotionSafety: PromotionSafetyConfig
) => {
    const scoreA = getSingleAdultPairScore(p1, a, history, roundNumber, promotionSafety);
    const scoreB = getSingleAdultPairScore(p1, b, history, roundNumber, promotionSafety);
    const cmp = compareAdultMatchingScores(scoreA, scoreB);
    if (cmp !== 0) return cmp;
    return tieBreak(a.id, b.id, tieMap);
};

const pickMostConstrainedPlayer = (
    players: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    tieMap: Map<string, number>
) => {
    const promotedKid = players.find(player => player.isPromotedKid);
    if (promotedKid) {
        return promotedKid;
    }

    return [...players].sort((a, b) => {
        const aCounts = getBucketCountsForPlayer(a, players, history);
        const bCounts = getBucketCountsForPlayer(b, players, history);
        const cmp = compareBucketCounts(aCounts, bCounts);
        if (cmp !== 0) return cmp;
        return tieBreak(a.id, b.id, tieMap);
    })[0];
};

const getAdultOrderedCandidates = (
    p1: MatchingPlayer,
    players: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>,
    promotionSafety: PromotionSafetyConfig
) => {
    return players
        .filter(
            p2 =>
                p2.id !== p1.id &&
                p2.matchingAgeGroup === p1.matchingAgeGroup &&
                isAllowedPromotedKidAdultPair(p1, p2, promotionSafety)
        )
        .sort((a, b) =>
            compareSingleAdultCandidates(
                p1,
                a,
                b,
                history,
                roundNumber,
                tieMap,
                promotionSafety
            )
        );
};

const makeAdultStateKey = (remaining: MatchingPlayer[]) => {
    return remaining.map(p => p.id).sort().join('|');
};

const findBestAdultMatchingExact = (
    players: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>,
    promotionSafety: PromotionSafetyConfig
): { pairs: [MatchingPlayer, MatchingPlayer][]; score: AdultMatchingScore } => {
    if (players.length === 0) {
        return { pairs: [], score: emptyAdultMatchingScore() };
    }

    const p1 = pickMostConstrainedPlayer(players, history, tieMap);
    const candidates = getAdultOrderedCandidates(
        p1,
        players,
        history,
        roundNumber,
        tieMap,
        promotionSafety
    );

    let best: { pairs: [MatchingPlayer, MatchingPlayer][]; score: AdultMatchingScore } | null = null;

    for (const p2 of candidates) {
        const remaining = players.filter(p => p.id !== p1.id && p.id !== p2.id);
        const child = findBestAdultMatchingExact(
            remaining,
            history,
            roundNumber,
            tieMap,
            promotionSafety
        );
        const pairScore = getSingleAdultPairScore(
            p1,
            p2,
            history,
            roundNumber,
            promotionSafety
        );
        const totalScore = addAdultMatchingScore(pairScore, child.score);

        const candidateResult = {
            pairs: [[p1, p2] as [MatchingPlayer, MatchingPlayer], ...child.pairs],
            score: totalScore
        };

        if (!best) {
            best = candidateResult;
            continue;
        }

        const cmp = compareAdultMatchingScores(candidateResult.score, best.score);
        if (cmp < 0) {
            best = candidateResult;
            continue;
        }

        if (cmp === 0) {
            const bestSecondId = best.pairs[0]?.[1]?.id ?? '';
            if (tieBreak(p2.id, bestSecondId, tieMap) < 0) {
                best = candidateResult;
            }
        }
    }

    return best!;
};

const findBestAdultMatchingBeam = (
    players: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>,
    promotionSafety: PromotionSafetyConfig
): { pairs: [MatchingPlayer, MatchingPlayer][]; score: AdultMatchingScore } => {
    let beam: AdultSearchState[] = [
        {
            remaining: [...players],
            pairs: [],
            score: emptyAdultMatchingScore(),
            key: makeAdultStateKey(players)
        }
    ];

    while (beam.length > 0 && beam[0].remaining.length > 0) {
        const nextStates: AdultSearchState[] = [];

        for (const state of beam) {
            if (state.remaining.length === 0) {
                nextStates.push(state);
                continue;
            }

            const p1 = pickMostConstrainedPlayer(state.remaining, history, tieMap);
            const orderedCandidates = getAdultOrderedCandidates(
                p1,
                state.remaining,
                history,
                roundNumber,
                tieMap,
                promotionSafety
            );

            const candidateLimit =
                state.remaining.length <= 8
                    ? orderedCandidates.length
                    : Math.min(ADULT_CANDIDATE_LIMIT, orderedCandidates.length);

            const candidates = orderedCandidates.slice(0, candidateLimit);

            for (const p2 of candidates) {
                const remaining = state.remaining.filter(
                    p => p.id !== p1.id && p.id !== p2.id
                );

                const pairScore = getSingleAdultPairScore(
                    p1,
                    p2,
                    history,
                    roundNumber,
                    promotionSafety
                );

                nextStates.push({
                    remaining,
                    pairs: [...state.pairs, [p1, p2]],
                    score: addAdultMatchingScore(state.score, pairScore),
                    key: makeAdultStateKey(remaining)
                });
            }
        }

        const dedup = new Map<string, AdultSearchState>();

        for (const state of nextStates) {
            const existing = dedup.get(state.key);
            if (!existing) {
                dedup.set(state.key, state);
                continue;
            }

            const cmp = compareAdultMatchingScores(state.score, existing.score);
            if (cmp < 0) {
                dedup.set(state.key, state);
            }
        }

        beam = [...dedup.values()].sort((a, b) => {
            const cmp = compareAdultMatchingScores(a.score, b.score);
            if (cmp !== 0) return cmp;

            const aFirst = a.pairs[0]?.[1]?.id ?? '';
            const bFirst = b.pairs[0]?.[1]?.id ?? '';
            return tieBreak(aFirst, bFirst, tieMap);
        });

        beam = beam.slice(0, ADULT_BEAM_WIDTH);
    }

    const best = beam.find(state => state.remaining.length === 0) ?? beam[0];

    return {
        pairs: best?.pairs ?? [],
        score: best?.score ?? emptyAdultMatchingScore()
    };
};

const buildAdultOptimizedMatching = (
    players: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>,
    promotionSafety: PromotionSafetyConfig
) => {
    if (players.length === 0) {
        return { pairs: [], score: emptyAdultMatchingScore() };
    }

    if (players.length <= ADULT_EXACT_LIMIT) {
        return findBestAdultMatchingExact(
            players,
            history,
            roundNumber,
            tieMap,
            promotionSafety
        );
    }

    return findBestAdultMatchingBeam(
        players,
        history,
        roundNumber,
        tieMap,
        promotionSafety
    );
};

// --- GREEDY SORTOWANIE KANDYDATÓW (fallback) ---

const sortBucket = (
    bucket: MatchingPlayer[],
    p1: MatchingPlayer,
    groupType: GroupType,
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>,
    promotionSafety: PromotionSafetyConfig
) => {
    if (groupType === 'ADULT') {
        return [...bucket].sort((a, b) => {
            const cmp = compareSingleAdultCandidates(
                p1,
                a,
                b,
                history,
                roundNumber,
                tieMap,
                promotionSafety
            );
            if (cmp !== 0) return cmp;
            return tieBreak(a.id, b.id, tieMap);
        });
    }

    return [...bucket].sort((a, b) => {
        const scoreA = getSingleKidPairScore(p1, a, history, roundNumber);
        const scoreB = getSingleKidPairScore(p1, b, history, roundNumber);
        const cmp = compareKidScores(scoreA, scoreB);
        if (cmp !== 0) return cmp;
        return tieBreak(a.id, b.id, tieMap);
    });
};

const sortKidRepeatCandidates = (
    bucket: MatchingPlayer[],
    p1: MatchingPlayer,
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>
) => {
    return [...bucket].sort((a, b) => {
        const scoreA = getSingleKidPairScore(p1, a, history, roundNumber);
        const scoreB = getSingleKidPairScore(p1, b, history, roundNumber);
        const cmp = compareKidScores(scoreA, scoreB);
        if (cmp !== 0) return cmp;
        return tieBreak(a.id, b.id, tieMap);
    });
};

const getCandidatesByBuckets = (
    p1: MatchingPlayer,
    unassigned: MatchingPlayer[],
    groupType: GroupType,
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>,
    promotionSafety: PromotionSafetyConfig
) => {
    const rawCandidates = unassigned.filter(
        p2 =>
            p2.id !== p1.id &&
            p2.matchingAgeGroup === p1.matchingAgeGroup &&
            (groupType !== 'ADULT' || isAllowedPromotedKidAdultPair(p1, p2, promotionSafety))
    );

    const bucketA: MatchingPlayer[] = [];
    const bucketB: MatchingPlayer[] = [];
    const bucketC: MatchingPlayer[] = [];
    const bucketD: MatchingPlayer[] = [];

    for (const p2 of rawCandidates) {
        const bucket = getBucketType(p1, p2, history);

        if (bucket === 'A') bucketA.push(p2);
        else if (bucket === 'B') bucketB.push(p2);
        else if (bucket === 'C') bucketC.push(p2);
        else bucketD.push(p2);
    }

    if (bucketA.length > 0) {
        return sortBucket(bucketA, p1, groupType, history, roundNumber, tieMap, promotionSafety);
    }

    if (bucketB.length > 0) {
        return sortBucket(bucketB, p1, groupType, history, roundNumber, tieMap, promotionSafety);
    }

    if (groupType === 'KID') {
        const repeated = [...bucketC, ...bucketD];
        if (repeated.length > 0) {
            return sortKidRepeatCandidates(repeated, p1, history, roundNumber, tieMap);
        }
        return [];
    }

    if (bucketC.length > 0) {
        return sortBucket(bucketC, p1, groupType, history, roundNumber, tieMap, promotionSafety);
    }

    if (bucketD.length > 0) {
        return sortBucket(bucketD, p1, groupType, history, roundNumber, tieMap, promotionSafety);
    }

    return [];
};

// --- PAUZY ---

const chooseByeCandidate = (
    unassigned: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    noRestPlayers: string[],
    tieMap: Map<string, number>
) => {
    const eligibleForBye = unassigned.filter(p => !noRestPlayers.includes(p.id));
    const targetPool = eligibleForBye.length > 0 ? eligibleForBye : unassigned;

    targetPool.sort((a, b) => {
        const byeA = history.get(a.id)?.byeHistory || 0;
        const byeB = history.get(b.id)?.byeHistory || 0;
        if (byeA !== byeB) return byeA - byeB;

        const lastByeA = history.get(a.id)?.lastByeRound || 0;
        const lastByeB = history.get(b.id)?.lastByeRound || 0;
        if (lastByeA !== lastByeB) return lastByeA - lastByeB;

        const aCounts = a.bucketCounts || { A: 0, B: 0, C: 0, D: 0 };
        const bCounts = b.bucketCounts || { A: 0, B: 0, C: 0, D: 0 };

        const totalA = aCounts.A + aCounts.B + aCounts.C + aCounts.D;
        const totalB = bCounts.A + bCounts.B + bCounts.C + bCounts.D;

        if (totalA !== totalB) return totalB - totalA;

        return tieBreak(a.id, b.id, tieMap);
    });

    return targetPool[0];
};

// --- BUDOWANIE PAR W JEDNEJ GRUPIE ---

const buildPairsForGroup = (
    groupPlayers: MatchingPlayer[],
    groupType: GroupType,
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    noRestPlayers: string[],
    promotionSafety: PromotionSafetyConfig
) => {
    let unassigned = [...groupPlayers];
    const pairs: Match[] = [];
    let bye: RealPlayer | null = null;
    const tieMap = createTieBreakerMap(groupPlayers);

    if (unassigned.length % 2 !== 0) {
        for (const p of unassigned) {
            p.bucketCounts = getBucketCountsForPlayer(p, unassigned, history);
        }

        const chosenBye = chooseByeCandidate(unassigned, history, noRestPlayers, tieMap);
        bye = chosenBye.originalRef;
        unassigned = unassigned.filter(p => p.id !== chosenBye.id);
    }

    if (
        groupType === 'KID' &&
        unassigned.length > 0 &&
        unassigned.length <= 10 &&
        unassigned.length % 2 === 0
    ) {
        const bestMatching = findBestKidMatching(unassigned, history, roundNumber, tieMap);
        for (const [p1, p2] of bestMatching.pairs) {
            pairs.push({ p1: p1.originalRef, p2: p2.originalRef });
        }
        return { pairs, bye };
    }

    if (groupType === 'ADULT' && unassigned.length > 0 && unassigned.length % 2 === 0) {
        const bestMatching = buildAdultOptimizedMatching(
            unassigned,
            history,
            roundNumber,
            tieMap,
            promotionSafety
        );
        for (const [p1, p2] of bestMatching.pairs) {
            pairs.push({ p1: p1.originalRef, p2: p2.originalRef });
        }
        return { pairs, bye };
    }

    while (unassigned.length > 1) {
        for (const p of unassigned) {
            p.bucketCounts = getBucketCountsForPlayer(p, unassigned, history);
        }

        unassigned.sort((a, b) => {
            const cmp = compareBucketCounts(
                a.bucketCounts || { A: 0, B: 0, C: 0, D: 0 },
                b.bucketCounts || { A: 0, B: 0, C: 0, D: 0 }
            );
            if (cmp !== 0) return cmp;
            return tieBreak(a.id, b.id, tieMap);
        });

        const p1 = unassigned[0];
        let candidates = getCandidatesByBuckets(
            p1,
            unassigned,
            groupType,
            history,
            roundNumber,
            tieMap,
            promotionSafety
        );

        if (candidates.length === 0) {
            candidates = unassigned
                .filter(
                    p =>
                        p.id !== p1.id &&
                        p.matchingAgeGroup === p1.matchingAgeGroup &&
                        (groupType !== 'ADULT' ||
                            isAllowedPromotedKidAdultPair(p1, p, promotionSafety))
                )
                .sort((a, b) => tieBreak(a.id, b.id, tieMap));
        }

        if (candidates.length === 0) {
            break;
        }

        const p2 = candidates[0];
        pairs.push({ p1: p1.originalRef, p2: p2.originalRef });

        unassigned = unassigned.filter(p => p.id !== p1.id && p.id !== p2.id);
    }

    if (unassigned.length === 1 && !bye) {
        bye = unassigned[0].originalRef;
    }

    return { pairs, bye };
};

// --- GŁÓWNA FUNKCJA MATCHMAKERA ---

export const generateRound = (
    players: RealPlayer[],
    history: Map<string, HistoryRecord>,
    roundNum: number,
    noRestPlayers: string[]
): { matches: Match[]; resting: RealPlayer[] } => {
    const activePlayers = [...players];

    let kids = activePlayers.filter(p => p.type === 'KID');
    const adults = activePlayers.filter(p => p.type === 'ADULT');
    let promotedKid: RealPlayer | null = null;

    if (kids.length % 2 !== 0 && adults.length % 2 !== 0) {
        kids.sort((a, b) => b.weight - a.weight);
        promotedKid = kids[0];
        kids = kids.slice(1);
    }

    const kidsIgnoreOutfit = hasCompletedSameOutfitRoundRobin(kids, history);
    const adultsIgnoreOutfit = hasCompletedSameOutfitRoundRobin(adults, history);

    const promotionSafety = buildPromotionSafetyConfig(
        adults,
        promotedKid,
        adultsIgnoreOutfit
    );

    const kidsPool: MatchingPlayer[] = kids.map(k => ({
        id: k.id,
        nickname: k.id,
        originalAgeGroup: 'KID',
        matchingAgeGroup: 'KID',
        outfit: kidsIgnoreOutfit ? FREE_OUTFIT : k.gear,
        weightKg: k.weight,
        matchingSkillLevel: 0,
        isPromotedKid: false,
        originalRef: k
    }));

    const adultsPool: MatchingPlayer[] = adults.map(a => ({
        id: a.id,
        nickname: a.id,
        originalAgeGroup: 'ADULT',
        matchingAgeGroup: 'ADULT',
        outfit: adultsIgnoreOutfit ? FREE_OUTFIT : a.gear,
        weightKg: a.weight,
        matchingSkillLevel: Number(a.skillLevel ?? 0),
        isPromotedKid: false,
        originalRef: a
    }));

    if (promotedKid) {
        adultsPool.push({
            id: promotedKid.id,
            nickname: promotedKid.id,
            originalAgeGroup: 'KID',
            matchingAgeGroup: 'ADULT',
            outfit: adultsIgnoreOutfit ? FREE_OUTFIT : promotedKid.gear,
            weightKg: promotedKid.weight,
            matchingSkillLevel: 0,
            isPromotedKid: true,
            originalRef: promotedKid
        });
    }

    const { pairs: kidPairs, bye: kidBye } = buildPairsForGroup(
        kidsPool,
        'KID',
        history,
        roundNum,
        noRestPlayers,
        promotionSafety
    );

    const { pairs: adultPairs, bye: adultBye } = buildPairsForGroup(
        adultsPool,
        'ADULT',
        history,
        roundNum,
        noRestPlayers,
        promotionSafety
    );

    const matches = [...kidPairs, ...adultPairs];
    const resting: RealPlayer[] = [];

    if (kidBye) resting.push(kidBye);
    if (adultBye) resting.push(adultBye);

    return { matches, resting };
};

// --- ZAPISYWANIE HISTORII ---

export const applyRoundResult = (
    matches: Match[],
    resting: RealPlayer[],
    roundNum: number,
    history: Map<string, HistoryRecord>,
    roster: RealPlayer[]
): RealPlayer[] => {
    const updatedRoster = [...roster];

    matches.forEach(m => {
        if (!history.has(m.p1.id)) {
            history.set(m.p1.id, {
                pairHistory: {},
                lastRoundMet: {},
                byeHistory: 0,
                lastByeRound: 0
            });
        }

        if (!history.has(m.p2.id)) {
            history.set(m.p2.id, {
                pairHistory: {},
                lastRoundMet: {},
                byeHistory: 0,
                lastByeRound: 0
            });
        }

        const h1 = history.get(m.p1.id)!;
        const h2 = history.get(m.p2.id)!;

        h1.pairHistory[m.p2.id] = (h1.pairHistory[m.p2.id] || 0) + 1;
        h2.pairHistory[m.p1.id] = (h2.pairHistory[m.p1.id] || 0) + 1;

        h1.lastRoundMet[m.p2.id] = roundNum;
        h2.lastRoundMet[m.p1.id] = roundNum;

        const i1 = updatedRoster.findIndex(p => p.id === m.p1.id);
        const i2 = updatedRoster.findIndex(p => p.id === m.p2.id);

        if (i1 >= 0) {
            updatedRoster[i1].consecutiveMatches = (updatedRoster[i1].consecutiveMatches ?? 0) + 1;
            updatedRoster[i1].restDebt = (updatedRoster[i1].restDebt ?? 0) - 1;
        }

        if (i2 >= 0) {
            updatedRoster[i2].consecutiveMatches = (updatedRoster[i2].consecutiveMatches ?? 0) + 1;
            updatedRoster[i2].restDebt = (updatedRoster[i2].restDebt ?? 0) - 1;
        }
    });

    resting.forEach(r => {
        if (!history.has(r.id)) {
            history.set(r.id, {
                pairHistory: {},
                lastRoundMet: {},
                byeHistory: 0,
                lastByeRound: 0
            });
        }

        const h = history.get(r.id)!;
        h.byeHistory += 1;
        h.lastByeRound = roundNum;

        const idx = updatedRoster.findIndex(p => p.id === r.id);
        if (idx >= 0) {
            updatedRoster[idx].lastRestRound = roundNum;
            updatedRoster[idx].consecutiveMatches = 0;
            updatedRoster[idx].restDebt =
                (updatedRoster[idx].restDebt ?? 0) + Math.floor(updatedRoster.length / 2);
        }
    });

    return updatedRoster;
};
