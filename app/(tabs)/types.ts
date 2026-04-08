export type RealPlayer = {
  id: string;
  type: 'KID' | 'ADULT';
  gear: 'GI' | 'NO';
  weight: number;
  skillLevel: number;
  restDebt: number;
  lastRestRound: number;
  consecutiveMatches: number;
  helpedKidCount: number;
  mismatchDebt: number;
};

export type DummyPlayer = {
  id: 'BENCH_DUMMY';
  type: 'DUMMY';
  restDebt: number;
  lastRestRound: number;
  consecutiveMatches: number;
  helpedKidCount: number;
  mismatchDebt: number;
};

export type Player = RealPlayer | DummyPlayer;

export interface Match {
  p1: RealPlayer;
  p2: RealPlayer;
  score?: number;
}

export interface HistoryRecord {
  lastRound: number;
  repeatCount: number;
}