export type AiNotificationType =
  | "ENCOURAGEMENT"
  | "WARNING"
  | "CELEBRATION";

export interface NotificationDecisionResult {
  type: AiNotificationType;
  reason: string;
}
