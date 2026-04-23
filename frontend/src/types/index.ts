export interface User {
  id: string;
  username: string;
  role: 'admin' | 'judge';
}

export interface Judge {
  id: string;
  userId: string;
  name: string;
  username: string;
  assignedCategories: string[];
}

export interface DanceEntry {
  id: string;
  categoryCode: string;
  entryNumber: number;
  participant1Name: string;
  participant2Name?: string;
  score?: {
    costumAndImpression?: number;
    movementsAndRhythm?: number;
    postureAndMudra?: number;
    totalScore?: number;
  };
}

export interface JudgeSlotScore {
  costumAndImpression: number;
  movementsAndRhythm: number;
  postureAndMudra: number;
  totalScore: number;
  judgeUsername?: string;
  judgeName?: string;
}

export interface ScoreData {
  entryId: string;
  categoryCode: string;
  entryNumber: number;
  participant1Name: string;
  participant2Name?: string;
  judge1Score?: JudgeSlotScore;
  judge2Score?: JudgeSlotScore;
  judge3Score?: JudgeSlotScore;
  averageScore?: number;
  rank?: number;
}
