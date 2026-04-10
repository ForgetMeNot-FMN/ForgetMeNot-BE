export interface TrackNotificationFeedbackRequest {
  notificationId: string;
  userId: string;
  outcome: "CLICKED" | "COMPLETED" | "IGNORED";
  sourceType?: "HABIT" | "TASK" | "SYSTEM";
  sourceId?: string;
}
