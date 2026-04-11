export type AiNotificationType =
  | "ENCOURAGEMENT"
  | "WARNING"
  | "CELEBRATION";

export type NotificationDecisionTrigger =
  | "streak_break"
  | "severe_drop"
  | "no_activity_today"
  | "low_engagement"
  | "high_streak"
  | "high_performance"
  | "strong_daily_progress"
  | "daily_progress"
  | "steady_state";

export type NotificationDecisionIntensity =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type NotificationFocusArea =
  | "habit"
  | "task"
  | "both_low"
  | "balanced";

export type NotificationSourceType =
  | "HABIT"
  | "TASK"
  | "FLOWER"
  | "SYSTEM";

export interface NotificationDecisionResult {
  type: AiNotificationType;
  reason: string;
}

export interface NotificationReasonData {
  trigger: NotificationDecisionTrigger;
  intensity: NotificationDecisionIntensity;
  avgRate: number;
  habitRate: number;
  taskRate: number;
  streak: number;
  missedDays: number;
  focusArea: NotificationFocusArea;
  hasAnyPlannedToday: boolean;
  hadRecentActivity: boolean;
  today: {
    habitCompleted: number;
    taskCompleted: number;
  };
  motivationType: string | null;
}
