export interface GenerateNotificationMessageRequest {
  userId: string;
  sourceType: "HABIT" | "TASK" | "SYSTEM";
  sourceId?: string;
  triggerReason?: string;
}

export interface GenerateNotificationMessageResponse {
  notificationType: string;
  tone: string;
  message: string;
  fallbackUsed: boolean;
}
