export interface TrackNotificationFeedbackRequest {
  notificationId: string;
  userId: string;
  outcome: "COMPLETED" | "IGNORED";
  sourceType?: "HABIT" | "TASK" | "SYSTEM";
  sourceId?: string;
}
