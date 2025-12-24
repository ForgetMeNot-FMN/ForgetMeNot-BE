export interface Garden {
  userId: string;
  coins: number;
  water: number;
  streak: number;
  totalFlowers: number;
  totalWateredCount: number;
  lastWateredDate: string;
  updatedAt: Date;
}
