import { AppNotification } from "./notificationModel";

export type notificationDto = Omit<
  AppNotification,
  | "notificationId"
  | "deliveryStatus"
  | "taskId"
  | "schedulerJobName"
  | "createdAt"
  | "updatedAt"
  | "createdBySystem"
  | "sentAt"
  | "lastAttemptAt"
  | "failureReason"
  | "isDeleted"
>;

export type UpdateNotificationDto = Partial<notificationDto> & {
  enabled?: boolean;
};