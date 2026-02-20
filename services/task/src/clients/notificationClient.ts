// clients/notificationClient.ts
import axios from "axios";
import { logger } from "../utils/logger";

const baseURL = process.env.NOTIFICATION_SERVICE_URL;

export const notificationClient = {
  async createNotification(params: {
    userId: string;
    title: string;
    scheduledAt: Date;
    timezone?: string;
    priority?: "normal" | "high";
    type?: "REMINDER" | "MOTIVATION";
  }) {
    try {
      const notification = await axios.post(
        `${baseURL}/notifications/${params.userId}`,
        {
          title: "Task Reminder",
          body: params.title,
          enabled: true,
          scheduleType: "ONCE",
          scheduledAt: params.scheduledAt.toISOString(),
          timezone: params.timezone ?? "UTC",
          priority: params.priority ?? "normal",
          type: params.type ?? "REMINDER",
          sourceType: "TASK",
        }
      );

      logger.info("Task notification created", {
        userId: params.userId,
        scheduledAt: params.scheduledAt.toISOString(),
        notificationId: notification.data.data.notificationId,
      });
    } catch (error) {
      logger.error("Create task notification failed", {
        userId: params.userId,
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        response: error instanceof Error && "response" in error ? (error as any).response?.data : undefined,
        responseData: error instanceof Error && "response" in error && (error as any).response ? (error as any).response.data : undefined,
      });
    }
  },

  async cancelTaskNotifications(taskId: string) {
    try {
      await axios.patch(
        `${baseURL}/notifications/${taskId}`,
        { enabled: false, deliveryStatus: "CANCELLED" },
      );
    } catch (error) {
      logger.error("Cancel task notifications failed", {
        taskId,
        error,
      });
    }
  },
};
