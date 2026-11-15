import {
    DEFAULT_SPARRING_OPTIONS,
    type HistoryRecord,
    type Match,
    type RealPlayer,
    type SparringOptions,
} from '../types';

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
    isGuest: boolean;
    originalRef: RealPlayer;
    bucketCounts?: {
        A: number;
        B: number;
        C: number;
        D: number;
    };
};

type KidPairScore = {
    guestPairCount: number;
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
    guestPairCount: number;
    recentPenalty: number;
    repeatCount: number;
    totalTimesMet: number;
    totalSkillDiff: number;
    totalWeightDiff: number;
    totalLastMetRound: number;
};

type PromotionSafetyConfig = {
    promotedKidId: string | null;
    safeAdultIds: Set<string>;
    safeAdultRank: Map<string, number>;
};

const EXACT_MATCHING_LIMIT = 12;
const BEAM_WIDTH = 32;
const BEAM_CANDIDATE_LIMIT = 4;

const BUCKET_A = 0;
const BUCKET_B = 1;
const BUCKET_C = 2;
const BUCKET_D = 3;
const BUCKET_INVALID = 255;

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

// Para GOŚĆ–GOŚĆ liczy się jako "miękko zakazana" — silnik unika takich par
// chyba że matematycznie nie ma innej możliwości. Goście przyjeżdżają sparować
// z domową ekipą, a nie ze sobą nawazajem.
const isGuestVsGuestPair = (p1: MatchingPlayer, p2: MatchingPlayer) => {
    return p1.isGuest && p2.isGuest;
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

const buildPromotionSafetyConfig = (
    adults: RealPlayer[],
    promotedKid: RealPlayer | null,
    history: Map<string, HistoryRecord>
): PromotionSafetyConfig => {
    if (!promotedKid || adults.length === 0) {
        return {
            promotedKidId: null,
            safeAdultIds: new Set<string>(),
            safeAdultRank: new Map<string, number>()
        };
    }

    const hasUnmetSameOutfitAdult = adults.some(
        adult => adult.gear === promotedKid.gear && getTimesMet(promotedKid, adult, history) === 0
    );

    const safestAdults = [...adults]
        .sort((a, b) => {
            if (hasUnmetSameOutfitAdult) {
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

// --- KID GLOBAL SCORE ---

const emptyKidPairScore = (): KidPairScore => ({
    guestPairCount: 0,
    recentPenalty: 0,
    repeatCount: 0,
    totalTimesMet: 0,
    mixedOutfitCount: 0,
    totalLastMetRound: 0,
    totalWeightDiff: 0
});

const addKidPairScore = (base: KidPairScore, add: KidPairScore): KidPairScore => ({
    guestPairCount: base.guestPairCount + add.guestPairCount,
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
    // Para GOŚĆ–GOŚĆ traktowana niemal jak powtórka — łamana tylko jeśli matematycznie konieczne.
    if (a.guestPairCount !== b.guestPairCount) return a.guestPairCount - b.guestPairCount;
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
        guestPairCount: isGuestVsGuestPair(p1, p2) ? 1 : 0,
        recentPenalty: getRecentRepeatPenalty(p1, p2, history, roundNumber),
        repeatCount: timesMet > 0 ? 1 : 0,
        totalTimesMet: timesMet,
        mixedOutfitCount: p1.outfit === p2.outfit ? 0 : 1,
        totalLastMetRound: lastMet,
        totalWeightDiff: getWeightDifference(p1, p2)
    };
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
    guestPairCount: 0,
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
    guestPairCount: base.guestPairCount + add.guestPairCount,
    recentPenalty: base.recentPenalty + add.recentPenalty,
    repeatCount: base.repeatCount + add.repeatCount,
    totalTimesMet: base.totalTimesMet + add.totalTimesMet,
    totalSkillDiff: base.totalSkillDiff + add.totalSkillDiff,
    totalWeightDiff: base.totalWeightDiff + add.totalWeightDiff,
    totalLastMetRound: base.totalLastMetRound + add.totalLastMetRound
});

const compareAdultMatchingScores = (
    a: AdultMatchingScore,
    b: AdultMatchingScore,
    sparringOptions: SparringOptions
) => {
    // Zero powtórek, jeśli tylko matematycznie da się je utrzymać.
    if (a.repeatCount !== b.repeatCount) return a.repeatCount - b.repeatCount;
    if (a.recentPenalty !== b.recentPenalty) return a.recentPenalty - b.recentPenalty;
    if (a.totalTimesMet !== b.totalTimesMet) return a.totalTimesMet - b.totalTimesMet;

    // Para GOŚĆ–GOŚĆ traktowana niemal jak powtórka — łamana tylko gdy nie ma alternatywy.
    // Priorytet PRZED outfit/wagą/poziomem, ale PO unikaniu powtórek.
    if (a.guestPairCount !== b.guestPairCount) {
        return a.guestPairCount - b.guestPairCount;
    }

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

    // Dynamiczny priorytet: 4 snap points
    // 0 = czyste umiejętności, 33 = umiejętności+waga, 67 = waga+umiejętności, 100 = czysta waga
    // Kolejność doboru: BEST_LAST odwraca kierunek, RANDOM pomija ten blok
    if (sparringOptions.intensityProfile !== 'RANDOM') {
        const direction = sparringOptions.intensityProfile === 'BEST_LAST' ? -1 : 1;
        const slider = sparringOptions.prioritySlider;

        if (slider <= 16) {
            if (a.totalSkillDiff !== b.totalSkillDiff) return (a.totalSkillDiff - b.totalSkillDiff) * direction;
            if (a.totalWeightDiff !== b.totalWeightDiff) return (a.totalWeightDiff - b.totalWeightDiff) * direction;
        } else if (slider <= 50) {
            const aScore = a.totalSkillDiff * 10 + a.totalWeightDiff * 2;
            const bScore = b.totalSkillDiff * 10 + b.totalWeightDiff * 2;
            if (aScore !== bScore) return (aScore - bScore) * direction;
        } else if (slider <= 83) {
            const aScore = a.totalWeightDiff * 10 + a.totalSkillDiff * 2;
            const bScore = b.totalWeightDiff * 10 + b.totalSkillDiff * 2;
            if (aScore !== bScore) return (aScore - bScore) * direction;
        } else {
            if (a.totalWeightDiff !== b.totalWeightDiff) return (a.totalWeightDiff - b.totalWeightDiff) * direction;
            if (a.totalSkillDiff !== b.totalSkillDiff) return (a.totalSkillDiff - b.totalSkillDiff) * direction;
        }
    }
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
        guestPairCount: isGuestVsGuestPair(p1, p2) ? 1 : 0,
        recentPenalty: getRecentRepeatPenalty(p1, p2, history, roundNumber),
        repeatCount: timesMet > 0 ? 1 : 0,
        totalTimesMet: timesMet,
        totalSkillDiff: getSkillDifference(p1, p2),
        totalWeightDiff: getWeightDifference(p1, p2),
        totalLastMetRound: lastMet
    };
};

// --- ZUNIFIKOWANY, PRE-INDEKSOWANY SOLVER (BITMASK DP + BEAM) ---

type IndexedMatchingContext<S> = {
    n: number;
    players: MatchingPlayer[];
    bits: bigint[];
    tieRanks: Int32Array;
    promotedIndex: number;
    pairBuckets: Uint8Array;
    pairScores: (S | null)[];
    orderedPartners: number[][];
    emptyScore: () => S;
    addScore: (base: S, add: S) => S;
    compareScores: (a: S, b: S) => number;
};

const bucketCharToCode = (bucket: BucketType): number => {
    if (bucket === 'A') return BUCKET_A;
    if (bucket === 'B') return BUCKET_B;
    if (bucket === 'C') return BUCKET_C;
    return BUCKET_D;
};

const buildIndexedMatchingContext = <S>({
    players,
    groupType,
    history,
    tieMap,
    promotionSafety,
    emptyScore,
    addScore,
    compareScores,
    computePairScore,
}: {
    players: MatchingPlayer[];
    groupType: GroupType;
    history: Map<string, HistoryRecord>;
    tieMap: Map<string, number>;
    promotionSafety: PromotionSafetyConfig;
    emptyScore: () => S;
    addScore: (base: S, add: S) => S;
    compareScores: (a: S, b: S) => number;
    computePairScore: (p1: MatchingPlayer, p2: MatchingPlayer) => S;
}): IndexedMatchingContext<S> => {
    const n = players.length;
    const bits: bigint[] = new Array(n);
    const tieRanks = new Int32Array(n);
    let promotedIndex = -1;

    for (let i = 0; i < n; i++) {
        bits[i] = 1n << BigInt(i);
        tieRanks[i] = tieMap.get(players[i].id) ?? i;
        if (groupType === 'ADULT' && players[i].isPromotedKid) {
            promotedIndex = i;
        }
    }

    const pairBuckets = new Uint8Array(n * n);
    pairBuckets.fill(BUCKET_INVALID);
    const pairScores: (S | null)[] = new Array(n * n).fill(null);

    for (let i = 0; i < n; i++) {
        const p1 = players[i];
        for (let j = i + 1; j < n; j++) {
            const p2 = players[j];
            if (p1.matchingAgeGroup !== p2.matchingAgeGroup) continue;

            const bucketCode = bucketCharToCode(getBucketType(p1, p2, history));
            pairBuckets[i * n + j] = bucketCode;
            pairBuckets[j * n + i] = bucketCode;

            if (groupType === 'ADULT' && !isAllowedPromotedKidAdultPair(p1, p2, promotionSafety)) {
                continue;
            }

            const score = computePairScore(p1, p2);
            pairScores[i * n + j] = score;
            pairScores[j * n + i] = score;
        }
    }

    const orderedPartners: number[][] = new Array(n);
    for (let i = 0; i < n; i++) {
        const candidates: number[] = [];
        const rowOffset = i * n;
        for (let j = 0; j < n; j++) {
            if (i !== j && pairScores[rowOffset + j] !== null) {
                candidates.push(j);
            }
        }
        candidates.sort((a, b) => {
            const scoreA = pairScores[rowOffset + a]!;
            const scoreB = pairScores[rowOffset + b]!;
            const cmp = compareScores(scoreA, scoreB);
            if (cmp !== 0) return cmp;
            return tieRanks[a] - tieRanks[b];
        });
        orderedPartners[i] = candidates;
    }

    return {
        n,
        players,
        bits,
        tieRanks,
        promotedIndex,
        pairBuckets,
        pairScores,
        orderedPartners,
        emptyScore,
        addScore,
        compareScores,
    };
};

const pickMostConstrainedIndexed = <S>(ctx: IndexedMatchingContext<S>, mask: bigint): number => {
    const { n, bits, tieRanks, promotedIndex, pairBuckets } = ctx;

    if (promotedIndex >= 0 && (mask & bits[promotedIndex]) !== 0n) {
        return promotedIndex;
    }

    let bestIdx = -1;
    let bestA = 999999;
    let bestB = 999999;
    let bestC = 999999;
    let bestD = 999999;
    let bestTie = 999999;

    for (let i = 0; i < n; i++) {
        if ((mask & bits[i]) === 0n) continue;

        let cA = 0;
        let cB = 0;
        let cC = 0;
        let cD = 0;
        const rowOffset = i * n;

        for (let j = 0; j < n; j++) {
            if (i === j || (mask & bits[j]) === 0n) continue;
            const bCode = pairBuckets[rowOffset + j];
            if (bCode === BUCKET_A) cA++;
            else if (bCode === BUCKET_B) cB++;
            else if (bCode === BUCKET_C) cC++;
            else if (bCode === BUCKET_D) cD++;
        }

        const tie = tieRanks[i];
        const isBetter =
            bestIdx === -1 ||
            cA < bestA ||
            (cA === bestA &&
                (cB < bestB ||
                    (cB === bestB &&
                        (cC < bestC ||
                            (cC === bestC && (cD < bestD || (cD === bestD && tie < bestTie)))))));

        if (isBetter) {
            bestIdx = i;
            bestA = cA;
            bestB = cB;
            bestC = cC;
            bestD = cD;
            bestTie = tie;
        }
    }

    return bestIdx;
};

const solveIndexedExact = <S>(
    ctx: IndexedMatchingContext<S>
): { pairs: [MatchingPlayer, MatchingPlayer][]; score: S } => {
    const { n, players, bits, tieRanks, pairScores, orderedPartners, emptyScore, addScore, compareScores } = ctx;
    if (n === 0) {
        return { pairs: [], score: emptyScore() };
    }

    const fullMask = (1n << BigInt(n)) - 1n;
    const memo = new Map<bigint, { pairs: [number, number][]; score: S }>();

    const dfs = (mask: bigint): { pairs: [number, number][]; score: S } => {
        if (mask === 0n) {
            return { pairs: [], score: emptyScore() };
        }

        const cached = memo.get(mask);
        if (cached) return cached;

        const p1 = pickMostConstrainedIndexed(ctx, mask);
        const maskWithoutP1 = mask & ~bits[p1];
        const rowOffset = p1 * n;
        const partners = orderedPartners[p1];

        let best: { pairs: [number, number][]; score: S } | null = null;

        for (let k = 0; k < partners.length; k++) {
            const p2 = partners[k];
            if ((maskWithoutP1 & bits[p2]) === 0n) continue;

            const child = dfs(maskWithoutP1 & ~bits[p2]);
            const pairScore = pairScores[rowOffset + p2]!;
            const totalScore = addScore(pairScore, child.score);

            if (!best) {
                best = { pairs: [[p1, p2], ...child.pairs], score: totalScore };
                continue;
            }

            const cmp = compareScores(totalScore, best.score);
            if (cmp < 0) {
                best = { pairs: [[p1, p2], ...child.pairs], score: totalScore };
            } else if (cmp === 0) {
                const bestSecondIdx = best.pairs[0]?.[1] ?? p2;
                if (tieRanks[p2] < tieRanks[bestSecondIdx]) {
                    best = { pairs: [[p1, p2], ...child.pairs], score: totalScore };
                }
            }
        }

        const resolved = best ?? { pairs: [], score: emptyScore() };
        memo.set(mask, resolved);
        return resolved;
    };

    const result = dfs(fullMask);
    return {
        pairs: result.pairs.map(([i, j]) => [players[i], players[j]]),
        score: result.score,
    };
};

type IndexedBeamState<S> = {
    mask: bigint;
    remainingCount: number;
    pairs: [number, number][];
    score: S;
};

const solveIndexedBeam = <S>(
    ctx: IndexedMatchingContext<S>
): { pairs: [MatchingPlayer, MatchingPlayer][]; score: S } => {
    const { n, players, bits, tieRanks, pairScores, orderedPartners, emptyScore, addScore, compareScores } = ctx;
    if (n === 0) {
        return { pairs: [], score: emptyScore() };
    }

    const fullMask = (1n << BigInt(n)) - 1n;
    let beam: IndexedBeamState<S>[] = [
        {
            mask: fullMask,
            remainingCount: n,
            pairs: [],
            score: emptyScore(),
        },
    ];

    while (beam.length > 0 && beam[0].remainingCount > 0) {
        const dedup = new Map<bigint, IndexedBeamState<S>>();

        for (let sIdx = 0; sIdx < beam.length; sIdx++) {
            const state = beam[sIdx];
            if (state.remainingCount === 0) {
                const prev = dedup.get(0n);
                if (!prev || compareScores(state.score, prev.score) < 0) {
                    dedup.set(0n, state);
                }
                continue;
            }

            const p1 = pickMostConstrainedIndexed(ctx, state.mask);
            const maskWithoutP1 = state.mask & ~bits[p1];
            const rowOffset = p1 * n;
            const partners = orderedPartners[p1];
            const maxBranch = state.remainingCount <= 8 ? partners.length : BEAM_CANDIDATE_LIMIT;

            let branched = 0;
            for (let k = 0; k < partners.length && branched < maxBranch; k++) {
                const p2 = partners[k];
                if ((maskWithoutP1 & bits[p2]) === 0n) continue;
                branched++;

                const nextMask = maskWithoutP1 & ~bits[p2];
                const nextScore = addScore(state.score, pairScores[rowOffset + p2]!);
                const existing = dedup.get(nextMask);

                if (!existing) {
                    dedup.set(nextMask, {
                        mask: nextMask,
                        remainingCount: state.remainingCount - 2,
                        pairs: [...state.pairs, [p1, p2]],
                        score: nextScore,
                    });
                    continue;
                }

                const cmp = compareScores(nextScore, existing.score);
                if (cmp < 0) {
                    dedup.set(nextMask, {
                        mask: nextMask,
                        remainingCount: state.remainingCount - 2,
                        pairs: [...state.pairs, [p1, p2]],
                        score: nextScore,
                    });
                }
            }
        }

        beam = [...dedup.values()].sort((a, b) => {
            const cmp = compareScores(a.score, b.score);
            if (cmp !== 0) return cmp;
            const aFirst = a.pairs[0]?.[1] ?? 0;
            const bFirst = b.pairs[0]?.[1] ?? 0;
            return tieRanks[aFirst] - tieRanks[bFirst];
        });

        if (beam.length > BEAM_WIDTH) {
            beam.length = BEAM_WIDTH;
        }
    }

    const best = beam.find(st => st.remainingCount === 0) ?? beam[0];
    return {
        pairs: (best?.pairs ?? []).map(([i, j]) => [players[i], players[j]]),
        score: best?.score ?? emptyScore(),
    };
};

const buildKidOptimizedMatching = (
    players: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>,
    promotionSafety: PromotionSafetyConfig
) => {
    const ctx = buildIndexedMatchingContext<KidPairScore>({
        players,
        groupType: 'KID',
        history,
        tieMap,
        promotionSafety,
        emptyScore: emptyKidPairScore,
        addScore: addKidPairScore,
        compareScores: compareKidScores,
        computePairScore: (p1, p2) => getSingleKidPairScore(p1, p2, history, roundNumber),
    });

    return players.length <= EXACT_MATCHING_LIMIT
        ? solveIndexedExact(ctx)
        : solveIndexedBeam(ctx);
};

const buildAdultOptimizedMatching = (
    players: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    roundNumber: number,
    tieMap: Map<string, number>,
    promotionSafety: PromotionSafetyConfig,
    sparringOptions: SparringOptions
) => {
    const ctx = buildIndexedMatchingContext<AdultMatchingScore>({
        players,
        groupType: 'ADULT',
        history,
        tieMap,
        promotionSafety,
        emptyScore: emptyAdultMatchingScore,
        addScore: addAdultMatchingScore,
        compareScores: (a, b) => compareAdultMatchingScores(a, b, sparringOptions),
        computePairScore: (p1, p2) =>
            getSingleAdultPairScore(p1, p2, history, roundNumber, promotionSafety),
    });

    return players.length <= EXACT_MATCHING_LIMIT
        ? solveIndexedExact(ctx)
        : solveIndexedBeam(ctx);
};

// --- PAUZY ---

const chooseByeCandidate = (
    unassigned: MatchingPlayer[],
    history: Map<string, HistoryRecord>,
    noRestSet: Set<string>,
    tieMap: Map<string, number>
) => {
    const eligibleForBye = unassigned.filter(p => !noRestSet.has(p.id));
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
    noRestSet: Set<string>,
    promotionSafety: PromotionSafetyConfig,
    sparringOptions: SparringOptions
) => {
    let unassigned = [...groupPlayers];
    const pairs: Match[] = [];
    let bye: RealPlayer | null = null;
    const tieMap = createTieBreakerMap(groupPlayers);

    if (unassigned.length % 2 !== 0) {
        for (const p of unassigned) {
            p.bucketCounts = getBucketCountsForPlayer(p, unassigned, history);
        }

        const chosenBye = chooseByeCandidate(unassigned, history, noRestSet, tieMap);
        bye = chosenBye.originalRef;
        unassigned = unassigned.filter(p => p.id !== chosenBye.id);
    }

    if (unassigned.length === 0) {
        return { pairs, bye };
    }

    if (groupType === 'KID') {
        const bestMatching = buildKidOptimizedMatching(
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

    const bestMatching = buildAdultOptimizedMatching(
        unassigned,
        history,
        roundNumber,
        tieMap,
        promotionSafety,
        sparringOptions
    );
    for (const [p1, p2] of bestMatching.pairs) {
        pairs.push({ p1: p1.originalRef, p2: p2.originalRef });
    }

    return { pairs, bye };
};

// --- GENDER PREFER HELPER (PER AGE GROUP) ---

const splitGenderPreferPool = (
    ageGroupPlayers: RealPlayer[],
    history: Map<string, HistoryRecord>,
    noRestSet: Set<string>,
    tieMap: Map<string, number>
): { separateFemales: RealPlayer[]; mainPool: RealPlayer[] } => {
    const females = ageGroupPlayers.filter(p => (p.gender || 'M') === 'F');
    const males = ageGroupPlayers.filter(p => (p.gender || 'M') === 'M');

    if (females.length < 2) {
        return { separateFemales: [], mainPool: ageGroupPlayers };
    }

    let femaleRoundRobinDone = true;
    for (let i = 0; i < females.length && femaleRoundRobinDone; i++) {
        for (let j = i + 1; j < females.length; j++) {
            if (getTimesMet(females[i], females[j], history) === 0) {
                femaleRoundRobinDone = false;
                break;
            }
        }
    }

    if (femaleRoundRobinDone) {
        return { separateFemales: [], mainPool: ageGroupPlayers };
    }

    const femalesToMatch = [...females];
    const malesPool = [...males];

    if (femalesToMatch.length % 2 !== 0 && malesPool.length > 0) {
        // Nieparzysta liczba kobiet przy obecności mężczyzn: ta, która walczyła już z największą
        // liczbą kobiet (najbliżej ukończenia round-robin), przechodzi do puli mieszanej.
        const metCounts = new Map<string, number>();
        for (const f of femalesToMatch) {
            let count = 0;
            for (const f2 of femalesToMatch) {
                if (f2.id !== f.id && getTimesMet(f, f2, history) > 0) count++;
            }
            metCounts.set(f.id, count);
        }

        femalesToMatch.sort((a, b) => {
            const diff = (metCounts.get(b.id) ?? 0) - (metCounts.get(a.id) ?? 0);
            if (diff !== 0) return diff;
            const vipDiff = Number(noRestSet.has(b.id)) - Number(noRestSet.has(a.id));
            if (vipDiff !== 0) return vipDiff;
            return tieBreak(a.id, b.id, tieMap);
        });

        const moved = femalesToMatch.shift()!;
        malesPool.push(moved);
    }

    return { separateFemales: femalesToMatch, mainPool: malesPool };
};

const toMatchingKid = (k: RealPlayer): MatchingPlayer => ({
    id: k.id,
    nickname: k.id,
    originalAgeGroup: 'KID',
    matchingAgeGroup: 'KID',
    outfit: k.gear,
    weightKg: k.weight,
    matchingSkillLevel: 0,
    isPromotedKid: false,
    isGuest: k.isGuest === true,
    originalRef: k,
});

const toMatchingAdult = (a: RealPlayer): MatchingPlayer => ({
    id: a.id,
    nickname: a.id,
    originalAgeGroup: 'ADULT',
    matchingAgeGroup: 'ADULT',
    outfit: a.gear,
    weightKg: a.weight,
    matchingSkillLevel: Number(a.skillLevel ?? 0),
    isPromotedKid: false,
    isGuest: a.isGuest === true,
    originalRef: a,
});

const emptyPromotionSafety = (): PromotionSafetyConfig => ({
    promotedKidId: null,
    safeAdultIds: new Set<string>(),
    safeAdultRank: new Map<string, number>(),
});

const generateAgeGroupRound = (
    players: RealPlayer[],
    history: Map<string, HistoryRecord>,
    roundNum: number,
    noRestSet: Set<string>,
    sparringOptions: SparringOptions
): { matches: Match[]; resting: RealPlayer[] } => {
    let kids = players.filter(p => p.type === 'KID');
    const adults = players.filter(p => p.type === 'ADULT');
    let promotedKid: RealPlayer | null = null;

    if (kids.length % 2 !== 0 && adults.length % 2 !== 0) {
        kids = [...kids].sort((a, b) => b.weight - a.weight);
        promotedKid = kids[0];
        kids = kids.slice(1);
    }

    const promotionSafety = buildPromotionSafetyConfig(adults, promotedKid, history);
    const kidsPool = kids.map(toMatchingKid);
    const adultsPool = adults.map(toMatchingAdult);

    if (promotedKid) {
        adultsPool.push({
            id: promotedKid.id,
            nickname: promotedKid.id,
            originalAgeGroup: 'KID',
            matchingAgeGroup: 'ADULT',
            outfit: promotedKid.gear,
            weightKg: promotedKid.weight,
            matchingSkillLevel: 0,
            isPromotedKid: true,
            isGuest: promotedKid.isGuest === true,
            originalRef: promotedKid,
        });
    }

    const { pairs: kidPairs, bye: kidBye } = buildPairsForGroup(
        kidsPool,
        'KID',
        history,
        roundNum,
        noRestSet,
        promotionSafety,
        sparringOptions
    );

    const { pairs: adultPairs, bye: adultBye } = buildPairsForGroup(
        adultsPool,
        'ADULT',
        history,
        roundNum,
        noRestSet,
        promotionSafety,
        sparringOptions
    );

    const resting: RealPlayer[] = [];
    if (kidBye) resting.push(kidBye);
    if (adultBye) resting.push(adultBye);

    return {
        matches: [...kidPairs, ...adultPairs],
        resting,
    };
};

const generateGenderAwareRound = (
    players: RealPlayer[],
    history: Map<string, HistoryRecord>,
    roundNum: number,
    noRestSet: Set<string>,
    sparringOptions: SparringOptions
): { matches: Match[]; resting: RealPlayer[] } => {
    if (sparringOptions.genderMatching === 'STRICT') {
        const males = players.filter(p => (p.gender || 'M') === 'M');
        const females = players.filter(p => (p.gender || 'M') === 'F');
        if (females.length >= 2) {
            const maleResult = generateAgeGroupRound(males, history, roundNum, noRestSet, sparringOptions);
            const femaleResult = generateAgeGroupRound(females, history, roundNum, noRestSet, sparringOptions);
            return {
                matches: [...maleResult.matches, ...femaleResult.matches],
                resting: [...maleResult.resting, ...femaleResult.resting],
            };
        }
        return generateAgeGroupRound(players, history, roundNum, noRestSet, sparringOptions);
    }

    if (sparringOptions.genderMatching === 'PREFER') {
        const tieMap = createTieBreakerMap(players);
        const kids = players.filter(p => p.type === 'KID');
        const adults = players.filter(p => p.type === 'ADULT');

        const kidSplit = splitGenderPreferPool(kids, history, noRestSet, tieMap);
        const adultSplit = splitGenderPreferPool(adults, history, noRestSet, tieMap);

        const mainCombined = [...kidSplit.mainPool, ...adultSplit.mainPool];
        const mainResult = generateAgeGroupRound(mainCombined, history, roundNum, noRestSet, sparringOptions);

        const matches = [...mainResult.matches];
        const resting = [...mainResult.resting];
        const noPromotion = emptyPromotionSafety();

        if (kidSplit.separateFemales.length > 0) {
            const kidFemResult = buildPairsForGroup(
                kidSplit.separateFemales.map(toMatchingKid),
                'KID',
                history,
                roundNum,
                noRestSet,
                noPromotion,
                sparringOptions
            );
            matches.push(...kidFemResult.pairs);
            if (kidFemResult.bye) resting.push(kidFemResult.bye);
        }

        if (adultSplit.separateFemales.length > 0) {
            const adultFemResult = buildPairsForGroup(
                adultSplit.separateFemales.map(toMatchingAdult),
                'ADULT',
                history,
                roundNum,
                noRestSet,
                noPromotion,
                sparringOptions
            );
            matches.push(...adultFemResult.pairs);
            if (adultFemResult.bye) resting.push(adultFemResult.bye);
        }

        return { matches, resting };
    }

    return generateAgeGroupRound(players, history, roundNum, noRestSet, sparringOptions);
};

// --- GŁÓWNA FUNKCJA MATCHMAKERA ---

export const generateRound = (
    players: RealPlayer[],
    history: Map<string, HistoryRecord>,
    roundNum: number,
    noRestPlayers: string[],
    sparringOptions: SparringOptions = DEFAULT_SPARRING_OPTIONS,
    _totalRounds: number = 1
): { matches: Match[]; resting: RealPlayer[] } => {
    const activePlayers = [...players];
    const noRestSet = new Set(noRestPlayers);

    if (sparringOptions.weightDivisionEnabled) {
        const threshold = sparringOptions.weightDivisionThreshold;
        const lightGroup = activePlayers.filter(p => p.weight <= threshold);
        const heavyGroup = activePlayers.filter(p => p.weight > threshold);

        if (lightGroup.length >= 2 && heavyGroup.length >= 2) {
            const lightResult = generateGenderAwareRound(lightGroup, history, roundNum, noRestSet, sparringOptions);
            const heavyResult = generateGenderAwareRound(heavyGroup, history, roundNum, noRestSet, sparringOptions);
            return {
                matches: [...lightResult.matches, ...heavyResult.matches],
                resting: [...lightResult.resting, ...heavyResult.resting],
            };
        }
    }

    return generateGenderAwareRound(activePlayers, history, roundNum, noRestSet, sparringOptions);
};

// --- ZAPISYWANIE HISTORII ---

const ensureHistoryRecord = (history: Map<string, HistoryRecord>, playerId: string): HistoryRecord => {
    let record = history.get(playerId);
    if (!record) {
        record = {
            pairHistory: {},
            lastRoundMet: {},
            byeHistory: 0,
            lastByeRound: 0,
        };
        history.set(playerId, record);
    }
    return record;
};

export const applyRoundResult = (
    matches: Match[],
    resting: RealPlayer[],
    roundNum: number,
    history: Map<string, HistoryRecord>,
    roster: RealPlayer[]
): RealPlayer[] => {
    const updatedRoster = roster.map(p => ({ ...p }));
    const rosterById = new Map<string, RealPlayer>();
    for (const player of updatedRoster) {
        rosterById.set(player.id, player);
    }

    const restBonus = Math.floor(updatedRoster.length / 2);

    for (const m of matches) {
        const h1 = ensureHistoryRecord(history, m.p1.id);
        const h2 = ensureHistoryRecord(history, m.p2.id);

        h1.pairHistory[m.p2.id] = (h1.pairHistory[m.p2.id] || 0) + 1;
        h2.pairHistory[m.p1.id] = (h2.pairHistory[m.p1.id] || 0) + 1;

        h1.lastRoundMet[m.p2.id] = roundNum;
        h2.lastRoundMet[m.p1.id] = roundNum;

        const r1 = rosterById.get(m.p1.id);
        if (r1) {
            r1.consecutiveMatches = (r1.consecutiveMatches ?? 0) + 1;
            r1.restDebt = (r1.restDebt ?? 0) - 1;
        }

        const r2 = rosterById.get(m.p2.id);
        if (r2) {
            r2.consecutiveMatches = (r2.consecutiveMatches ?? 0) + 1;
            r2.restDebt = (r2.restDebt ?? 0) - 1;
        }
    }

    for (const r of resting) {
        const h = ensureHistoryRecord(history, r.id);
        h.byeHistory += 1;
        h.lastByeRound = roundNum;

        const player = rosterById.get(r.id);
        if (player) {
            player.lastRestRound = roundNum;
            player.consecutiveMatches = 0;
            player.restDebt = (player.restDebt ?? 0) + restBonus;
        }
    }

    return updatedRoster;
};
