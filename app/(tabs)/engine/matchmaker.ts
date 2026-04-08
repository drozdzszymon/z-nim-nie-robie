import { Player, RealPlayer, Match, HistoryRecord } from '../types';

export const getPairKey = (id1: string, id2: string) => {
    return id1 < id2 ? `${id1}|${id2}` : `${id2}|${id1}`;
};

export const isRealPlayer = (p: Player): p is RealPlayer => p.type === 'KID' || p.type === 'ADULT';

// Ocenia parę na podstawie ścisłej hierarchii kar
export const evaluatePair = (
    rp1: RealPlayer, 
    rp2: RealPlayer, 
    history: Map<string, HistoryRecord>, 
    roundNum: number
): number => {
    let score = 0;

    // 1. ZASADA ABSOLUTNA: Wiek (Nigdy nie mieszamy dzieci z dorosłymi)
    if (rp1.type !== rp2.type) {
        score -= 1000000000; 
    }

    // 2. ZASADA PRIORYTETOWA: "Każdy z każdym" (Brak powtórek)
    const pairKey = getPairKey(rp1.id, rp2.id);
    const matchHistory = history.get(pairKey);
    if (matchHistory) {
        let roundsAgo = roundNum - matchHistory.lastRound;
        if (roundsAgo === 1) score -= 500000000; // Walka runda po rundzie
        score -= (matchHistory.repeatCount * 100000000); // 100 mln kary za KAŻDE powtórzenie
    }

    // 3. ZASADA UBIORU: (Wymuszamy własny sprzęt, chyba że trzeba uniknąć powtórki)
    if (rp1.gear !== rp2.gear) {
        score -= 10000000; // 10 mln kary. Mniejsze niż 100 mln za powtórkę!
    } else {
        score += 100000; // Bonus za ten sam sprzęt
    }

    // 4. ZASADA UMIEJĘTNOŚCI (Tylko dorośli)
    if (rp1.type === 'ADULT' && rp2.type === 'ADULT') {
        const skillDiff = Math.abs(rp1.skillLevel - rp2.skillLevel);
        score -= (skillDiff * 1000000);
    }

    // 5. ZASADA WAGI (Najmniej restrykcyjna, zginamy ją, byle nikt się nie powtarzał)
    const weightDiff = Math.abs(rp1.weight - rp2.weight);
    score -= (weightDiff * 10000);

    return score;
};

export const generateRound = (pool: RealPlayer[], history: Map<string, HistoryRecord>, roundNum: number, noRestList: string[]) => {
    let activeKids = pool.filter(p => p.type === 'KID');
    let activeAdults = pool.filter(p => p.type === 'ADULT');
    
    let resting: RealPlayer[] = [];

    // Funkcja wybierająca na ławkę: Ścisła sprawiedliwość rotacyjna
    const extractBencher = (group: RealPlayer[]): RealPlayer => {
        let candidates = group.filter(p => !noRestList.includes(p.id) && p.lastRestRound !== roundNum - 1);
        if (candidates.length === 0) candidates = group.filter(p => !noRestList.includes(p.id));
        if (candidates.length === 0) candidates = group;

        // Sortujemy rosnąco po ilości pauz. Remisy łamiemy tym, kto dawniej odpoczywał.
        candidates.sort((a, b) => {
            if (a.restDebt !== b.restDebt) return a.restDebt - b.restDebt;
            return a.lastRestRound - b.lastRestRound; 
        });
        return candidates[0];
    };

    // Zdejmujemy 1 dziecko, jeśli jest ich nieparzyście
    if (activeKids.length % 2 !== 0) {
        const b = extractBencher(activeKids);
        resting.push(b);
        activeKids = activeKids.filter(k => k.id !== b.id);
    }
    
    // Zdejmujemy 1 dorosłego, jeśli jest ich nieparzyście
    if (activeAdults.length % 2 !== 0) {
        const b = extractBencher(activeAdults);
        resting.push(b);
        activeAdults = activeAdults.filter(a => a.id !== b.id);
    }

    let fighters = [...activeKids, ...activeAdults];
    let edges: { p1: RealPlayer, p2: RealPlayer, score: number }[] = [];

    for (let i = 0; i < fighters.length; i++) {
        for (let j = i + 1; j < fighters.length; j++) {
            let score = evaluatePair(fighters[i], fighters[j], history, roundNum);
            edges.push({ p1: fighters[i], p2: fighters[j], score });
        }
    }

    edges.sort((a, b) => b.score - a.score); // Zachłannie od najlepszych

    let matchedIds = new Set<string>();
    let matches: Match[] = [];

    for (let edge of edges) {
        if (!matchedIds.has(edge.p1.id) && !matchedIds.has(edge.p2.id)) {
            matchedIds.add(edge.p1.id);
            matchedIds.add(edge.p2.id);
            matches.push({ p1: edge.p1, p2: edge.p2 });
        }
    }

    // WYGŁADZANIE PARY (Swap 2-Opt) - Rozbija powtórki i złe pary
    let improved = true;
    let maxIterations = 20; 
    let iterCount = 0;

    while (improved && iterCount < maxIterations) {
        improved = false;
        iterCount++;
        for (let i = 0; i < matches.length; i++) {
            for (let j = i + 1; j < matches.length; j++) {
                let m1 = matches[i];
                let m2 = matches[j];

                let currentScore = evaluatePair(m1.p1, m1.p2, history, roundNum) + evaluatePair(m2.p1, m2.p2, history, roundNum);

                let s1a = evaluatePair(m1.p1, m2.p1, history, roundNum);
                let s1b = evaluatePair(m1.p2, m2.p2, history, roundNum);
                let s2a = evaluatePair(m1.p1, m2.p2, history, roundNum);
                let s2b = evaluatePair(m1.p2, m2.p1, history, roundNum);
                
                let swap1Score = s1a + s1b;
                let swap2Score = s2a + s2b;

                let bestSwap = 0;
                let bestScore = currentScore; 

                if (swap1Score > bestScore && swap1Score >= swap2Score) {
                    bestSwap = 1; bestScore = swap1Score;
                } else if (swap2Score > bestScore && swap2Score > swap1Score) {
                    bestSwap = 2; bestScore = swap2Score;
                }

                if (bestSwap === 1) {
                    matches[i] = { p1: m1.p1, p2: m2.p1 };
                    matches[j] = { p1: m1.p2, p2: m2.p2 };
                    improved = true; break;
                } else if (bestSwap === 2) {
                    matches[i] = { p1: m1.p1, p2: m2.p2 };
                    matches[j] = { p1: m1.p2, p2: m2.p1 };
                    improved = true; break;
                }
            }
            if (improved) break;
        }
    }

    return { matches, resting };
};

export const applyRoundResult = (
    matches: Match[], 
    resting: RealPlayer[], 
    roundNum: number, 
    historyMap: Map<string, HistoryRecord>, 
    currentActive: RealPlayer[]
): RealPlayer[] => {
    
    matches.forEach(m => { 
      let key = getPairKey(m.p1.id, m.p2.id);
      let currentRecord = historyMap.get(key) || { lastRound: 0, repeatCount: 0 };
      historyMap.set(key, { lastRound: roundNum, repeatCount: currentRecord.repeatCount + 1 }); 
    });

    const updatedActive = currentActive.map(player => {
        let updatedPlayer = { ...player };
        let isResting = resting.find(r => r.id === player.id);
        let isFighting = matches.find(m => m.p1.id === player.id || m.p2.id === player.id);
        
        if (isResting) {
            updatedPlayer.restDebt += 1;
            updatedPlayer.consecutiveMatches = 0;
            updatedPlayer.lastRestRound = roundNum;
        } else if (isFighting) {
            updatedPlayer.consecutiveMatches += 1;
        }
        return updatedPlayer;
    });

    return updatedActive;
};