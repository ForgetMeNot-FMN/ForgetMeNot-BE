import axios from "axios";
import { logger } from "../utils/logger";
const baseURL = process.env.NOTIFICATION_SERVICE_URL!;

type NotificationParams = {
  userId: string;
  title: string;

  sourceType: "HABIT";
  sourceId?: string;

  scheduleType: "ONCE" | "RECURRING" | "CRON";
  scheduledAt?: Date;
  timezone?: string;

  repeatRule?: {
    interval: "weekly";
    daysOfWeek?: number[];
    timesOfDay?: string[];
  };

  cronExpression?: string;

  priority?: "normal" | "high";
  type?: "REMINDER" | "MOTIVATION";
};

export async function createHabitNotification(params: NotificationParams) {
    try {
  const notification = await axios.post(
    `${baseURL}/notifications/${params.userId}`,
    {
      title: "Habit Reminder",
      body: params.title,
      sourceId: params.sourceId,
      sourceType: "HABIT",

      type: params.type ?? "REMINDER",
      priority: params.priority ?? "normal",
      enabled: true,

      scheduleType: params.scheduleType,
      scheduledAt:   params.scheduleType === "ONCE" && params.scheduledAt instanceof Date
    ? params.scheduledAt.toISOString()
    : undefined,
      timezone: params.timezone ?? "UTC",

      repeatRule: params.repeatRule,
      cronExpression: params.cronExpression,
    }
  );
  logger.info("Habit notification created", {
    userId: params.userId,
    scheduledAt: params.scheduledAt instanceof Date ? params.scheduledAt.toISOString() : undefined,
    notificationId: notification.data.data.notificationId,
  });
    } catch (error) {
      console.error("Create habit notification failed", {
        userId: params.userId,
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        response: error instanceof Error && "response" in error ? (error as any).response?.data : undefined,
        responseData: error instanceof Error && "response" in error && (error as any).response ? (error as any).response.data : undefined,
      });
    }
}

export async function deleteHabitNotifications(userId: string, habitId: string) {
  await axios.delete(
    `${baseURL}/notifications/${userId}`,
    {
      data: {
        sourceType: "HABIT",
        sourceId: habitId,
      },
    }
  );
}

