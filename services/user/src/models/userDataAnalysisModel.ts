export type AnalysisPeriod = "weekly" | "monthly" | "yearly";

export interface AnalysisRange {
  start: string;
  end: string;
}

export interface AnalysisSeriesPoint {
  label: string;
  start: string;
  end: string;
  tasksCompleted: number;
  habitsCompleted: number;
  awardsEarned: number;
  earnedCoins: number;
  earnedWater: number;
}

export interface UserDataAnalysis {
  userId: string;
  period: AnalysisPeriod;
  timezone: string;
  range: AnalysisRange;
  summary: {
    awards: {
      earned: number;
      byType: Record<string, number>;
    };
    tasks: {
      completed: number;
    };
    habits: {
      completed: number;
      uniqueCompletedHabits: number;
    };
    gamification: {
      earnedCoins: number;
      earnedWater: number;
      bySource: {
        tasks: { coins: number; water: number };
        habits: { coins: number; water: number };
      };
      currentBalance: {
        coins: number;
        water: number;
      };
    };
    flowers: {
      purchasedSeeds: number;
      grownFlowers: number;
      deadFlowers: number;
      aliveFlowers: number;
    };
  };
  series: AnalysisSeriesPoint[];
}

export interface AnalysisTaskRecord {
  taskId: string;
  completedAt: Date | null;
  rewardGranted?: boolean;
}

export interface AnalysisHabitCompletionRecord {
  id: string;
  habitId: string;
  date: string;
  coins: number;
  water: number;
}

export interface AnalysisAwardRecord {
  awardId: string;
  awardType: string;
  unlockedAt: Date | null;
}

export interface GardenBalance {
  coins: number;
  water: number;
}

export interface FlowerSnapshot {
  purchasedSeeds: number;
  grownFlowers: number;
  deadFlowers: number;
  aliveFlowers: number;
}
