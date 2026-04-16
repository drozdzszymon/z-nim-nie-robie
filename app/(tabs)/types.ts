export type AdultSkillLevel = 1 | 2 | 3 | 4;
export type SkillLevel = 0 | AdultSkillLevel;

export const DEFAULT_ADULT_SKILL_LEVEL: AdultSkillLevel = 1;

export const ADULT_SKILL_LEVEL_OPTIONS: {
  value: AdultSkillLevel;
  shortLabel: string;
  fullLabel: string;
}[] = [
  { value: 1, shortLabel: 'POCZ.', fullLabel: 'POCZĄTKUJĄCY' },
  { value: 2, shortLabel: 'ŚR.ZAAW.', fullLabel: 'ŚREDNIOZAAW.' },
  { value: 3, shortLabel: 'ZAAW.', fullLabel: 'ZAAWANSOWANY' },
  { value: 4, shortLabel: 'PRO', fullLabel: 'PRO' },
];

export const getSkillLevelShortLabel = (skillLevel: SkillLevel) => {
  return ADULT_SKILL_LEVEL_OPTIONS.find(option => option.value === skillLevel)?.shortLabel || '';
};

export interface RealPlayer {
  id: string;
  type: 'KID' | 'ADULT';
  gear: 'GI' | 'NO';
  weight: number;
  skillLevel: SkillLevel;
  restDebt: number;        // Pozostawione dla spójności stanu App, choć silnik używa byeHistory
  lastRestRound: number;   // Pozostawione dla spójności
  consecutiveMatches: number; // Pozostawione dla spójności
  helpedKidCount: number;  // Pozostawione dla spójności
  mismatchDebt: number;    // Pozostawione dla spójności
}

export interface Match {
  p1: RealPlayer;
  p2: RealPlayer;
}

// Nowy, dokładny model historii z pseudokodu
export interface HistoryRecord {
  pairHistory: { [opponentId: string]: number };
  lastRoundMet: { [opponentId: string]: number };
  byeHistory: number;
  lastByeRound: number;
}
