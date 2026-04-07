import { SourceType } from "./notificationModel";

export type NotificationFeedbackOutcome =
  | "CLICKED"
  | "COMPLETED"
  | "IGNORED";

export type NotificationGenerationSource =
  | "SYSTEM"
  | "LLM"
  | "UNKNOWN";

export interface NotificationLogEntry {
  notification_id: string;
  user_id: string;
  source_type: SourceType;
  source_id: string;
  generation_source: NotificationGenerationSource;
  was_clicked: boolean;
  clicked_at?: string;
  was_completed: boolean;
  completed_at?: string;
  was_ignored: boolean;
  ignored_at?: string;
  last_feedback_event?: NotificationFeedbackOutcome;
  last_feedback_at?: string;
  created_at: string;
  updated_at: string;
}
