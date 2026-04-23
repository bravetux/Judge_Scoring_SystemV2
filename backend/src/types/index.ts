export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'judge' | 'view';
  createdAt: string;
}

export interface Judge {
  id: string;
  userId: string;
  name: string;
  assignedCategories: string[];
}

export interface DanceCategory {
  id: string;
  code: string; // SA, SB, SC, SD, SE, SKG, DA, DB, DC, DD, DE, DKG
  name: string;
  type: 'solo' | 'duet';
  createdAt: string;
}

export interface DanceEntry {
  id: string;
  categoryId: string;
  categoryCode: string;
  entryNumber: number;
  participant1Name: string;
  participant2Name?: string;
  createdAt: string;
}

export interface Score {
  id: string;
  entryId: string;
  judgeId: string;
  costumAndImpression: number; // 1-10
  movementsAndRhythm: number; // 1-10
  postureAndMudra: number; // 1-10
  totalScore: number; // auto-calculated
  submittedAt: string;
}

export interface JudgeSlotScore {
  costumAndImpression: number;
  movementsAndRhythm: number;
  postureAndMudra: number;
  totalScore: number;
  judgeUsername?: string;
  judgeName?: string;
}

export interface DanceEntryScore {
  entryId: string;
  categoryCode: string;
  entryNumber: number;
  participant1Name: string;
  participant2Name?: string;
  judge1Score?: JudgeSlotScore;
  judge2Score?: JudgeSlotScore;
  judge3Score?: JudgeSlotScore;
  totalScore?: number;
  averageScore?: number;
  rank?: number;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'judge' | 'view';
}
