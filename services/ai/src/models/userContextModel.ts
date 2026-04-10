export interface BuildUserContextOptions {
  days?: number;
}

export interface UserContextDTO {
  userId: string;
  profile: UserContextProfile;
  habitStats: UserContextHabitStats;
  taskStats: UserContextTaskStats;
  notificationFeedback: UserContextNotificationFeedback;
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

export interface UserContextNotificationFeedback {
  totalTracked: number;
  llmGeneratedCount: number;
  systemGeneratedCount: number;
  unknownGeneratedCount: number;
  clicks: number;
  completions: number;
  ignores: number;
  lastInteractionAt: string | null;
  recentLogs: NotificationLogRecord[];
  userPromptNotes: string[];
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

export interface NotificationRecord {
  notificationId: string;
  userId: string;
  sourceType?: "HABIT" | "TASK" | "FLOWER" | "SYSTEM";
  sourceId?: string;
  timezone?: string;
  sentAt?: Date | string | null;
  isDeleted?: boolean;
  deliveryStatus?: string;
}

export interface NotificationLogRecord {
  id: string;
  notification_id: string;
  user_id: string;
  // Domain of the notification content, not how the text was produced.
  source_type?: "HABIT" | "TASK" | "FLOWER" | "SYSTEM";
  source_id?: string;
  // Primary signal for prompt/history decisions:
  // SYSTEM = fixed/template copy, LLM = model-generated copy.
  generation_source?: "LLM" | "SYSTEM" | "UNKNOWN";
  was_clicked?: boolean;
  clicked_at?: string;
  was_completed?: boolean;
  completed_at?: string;
  was_ignored?: boolean;
  ignored_at?: string;
  last_feedback_event?: "CLICKED" | "COMPLETED" | "IGNORED";
  last_feedback_at?: string;
  created_at?: string;
  updated_at?: string;
}
