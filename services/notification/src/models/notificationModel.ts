export type SourceType = "HABIT" | "TASK" | "FLOWER" | "SYSTEM";
export type NotificationType = "REMINDER" | "PROGRESS" | "MOTIVATION" | "SYSTEM";
export type ScheduleType = "IMMEDIATE" | "ONCE" | "RECURRING" | "CRON";
export type DeliveryStatus = "PENDING" | "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";

export interface AppNotification {
  notificationId: string;
  userId: string;

  sourceType: SourceType;
  sourceId?: string;

  title: string;
  body: string;
  type: NotificationType;
  priority: "normal" | "high";
  enabled: boolean;

  scheduleType: ScheduleType;
  scheduledAt?: string;
  timezone: string;

  repeatRule?: {
    interval: "daily" | "weekly";
    daysOfWeek?: number[]; // [1,3,5]
    timesOfDay?: string[]; // ["08:00", "21:30"]
  };

  cronExpression?: string;

  deliveryStatus: DeliveryStatus;
  sentAt?: string;
  lastAttemptAt?: string;
  failureReason?: string;

  taskId?: string;
  schedulerJobName?: string;

  platform?: "android" | "ios" | "web";
  fcmTokenSnapshot?: string;
  deepLink?: string;
  clickAction?: string;
  dataPayload?: any;

  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  createdBySystem: boolean;
}
