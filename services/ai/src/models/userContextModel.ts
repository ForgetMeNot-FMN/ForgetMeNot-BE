export interface BuildUserContextOptions {
  days?: number;
}

export interface UserContextDTO {
  userId: string;
  profile: UserContextProfile;
  habitStats: UserContextHabitStats;
  taskStats: UserContextTaskStats;
  recentNDays: DailyActivitySnapshot[];
  generatedAt: string;
  metadata: {
    daysConsidered: number;
    sourceCollections: string[];
    generatedForTimezone?: string;
  };
}

export interface UserContextProfile {
  username: string | null;
  age: number | null;
  gender: string | null;
  timezone?: string | null;
  allowNotification: boolean;
  onboardingCompleted: boolean;
  goals: string[];
  painPoints: string[];
  motivationType: string | null;
  tonePreference: string | null;
  dailyCommitment: number | null;
  preferredTime: string | null;
  selfDisciplineLevel: number | null;
}

export interface UserContextHabitStats {
  activeHabitCount: number;
  completedDaysLastNDays: number;
  expectedDaysLastNDays: number;
  missedDaysLastNDays: number;
  completionRateLastNDays: number;
  currentBestStreak: number;
  longestBestStreak: number;
  hasNoHabits: boolean;
}

export interface UserContextTaskStats {
  totalTasks: number;
  completedTasks: number;
  dueTasksLastNDays: number;
  completedDueTasksLastNDays: number;
  missedTasksLastNDays: number;
  completionRateLastNDays: number;
  completedToday: number;
  pendingToday: number;
}

export interface DailyActivitySnapshot {
  date: string;
  habitCompleted: number;
  habitExpected: number;
  taskCompleted: number;
  taskDue: number;
}

export interface UserRecord {
  userId: string;
  username?: string;
  age?: number | null;
  gender?: string | null;
  allowNotification?: boolean;
  onboarding?: {
    completed?: boolean;
    goals?: string[];
    painPoints?: string[];
    motivationType?: string;
    tonePreference?: string;
    dailyCommitment?: number;
    preferredTime?: string;
    selfDisciplineLevel?: number;
  };
}

export interface HabitRecord {
  id: string;
  userId: string;
  title?: string;
  status?: string;
  currentStreak?: number;
  longestStreak?: number;
  schedule?: {
    type?: string;
    days?: number[];
    startDate?: string;
    dates?: string[];
    everyNDays?: number;
  };
}

export interface HabitCompletionRecord {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  completed?: boolean;
}

export interface TaskRecord {
  taskId: string;
  userId: string;
  title?: string;
  isCompleted?: boolean;
  isActive?: boolean;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  completedAt?: Date | string | null;
}
