export interface TrackNotificationFeedbackRequest {
  notificationId: string;
  userId: string;
  outcome: "OPENED" | "COMPLETED" | "IGNORED";
  sourceType?: "HABIT" | "TASK" | "SYSTEM";
  sourceId?: string;
}
