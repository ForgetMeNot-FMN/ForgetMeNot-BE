import { notificationRepository } from "./notificationRepository"; 
import { logger } from "../utils/logger";
import { notificationDto, UpdateNotificationDto } from "../models/notificationDTO";
import { AppNotification } from "../models/notificationModel";
import { userClient } from "./userClient";

class NotificationService {
  
    // User Notifications with pagination
  async getUserNotifications(userId: string, limit?: number, cursor?: string, sourceType?: "HABIT" | "TASK" | "FLOWER" | "SYSTEM") {
    logger.debug("Get notifications request", { userId, limit, cursor });

    const result = await notificationRepository.getNotificationsByUserId(
      userId,
      limit,
      cursor,
      sourceType
    );

    logger.debug("Notifications fetched", { userId, count: result.notifications.length });

    return result;
  }

    // Single Notification
  async getNotification(notificationId: string) {
    logger.debug("Get notification request", { notificationId });

    const notification = await notificationRepository.getNotificationById(notificationId);

    if (!notification) {
      logger.warn("Notification not found", { notificationId });
      throw new Error("Notification not found");
    }

    return notification;
  }
  
    // Create için validation
  private validateCreateBody(body: notificationDto) {
    if (!body.title) throw new Error("title is required");
    if (!body.body) throw new Error("body is required");
    if (!body.type) throw new Error("type is required");
    if (!body.scheduleType) throw new Error("scheduleType is required");
    if (!body.timezone) throw new Error("timezone is required");

    switch (body.scheduleType) {
      case "IMMEDIATE":
        break;

      case "ONCE":
        if (!body.scheduledAt)
          throw new Error("scheduledAt is required when scheduleType is ONCE");
        break;

      case "RECURRING":
        if (!body.repeatRule)
          throw new Error("repeatRule is required when scheduleType is RECURRING");

        if (!body.repeatRule.interval)
          throw new Error("repeatRule.interval is required");

        if (body.repeatRule.interval === "weekly" && !body.repeatRule.daysOfWeek)
          throw new Error("repeatRule.daysOfWeek is required for weekly schedule");

        if (!body.repeatRule.timesOfDay)
          throw new Error("repeatRule.timesOfDay is required");

        break;

      case "CRON":
        if (!body.cronExpression)
          throw new Error("cronExpression is required when scheduleType is CRON");
        break;
    }
  }

    // Create
  async createNotification( userId: string, body: notificationDto ): Promise<AppNotification> {

    logger.info("Create notification request", { userId });

    // Body validation
     this.validateCreateBody(body);

    // User çek
    const user = await userClient.getUserById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    // Sadece allowNotification kontrolü
    const canReceive = await userClient.canReceiveNotifications(userId);

    if (!canReceive) {
        logger.warn("User disabled notifications", { userId });
        throw new Error("User has disabled notifications");
    }

    // Notification oluştur
    const notification = await notificationRepository.create(userId, {
        ...body,
        enabled: body.enabled ?? true,
    });

        logger.info("Notification created successfully", {
            userId,
            notificationId: notification.notificationId,
        });

        // TODO:
        // if (notification.scheduleType !== "IMMEDIATE") {
        //   cloudTasksClient.enqueueNotificationDispatch(notification.notificationId);
        // }
    return notification;
  }


    // Update 
  async updateNotification(notificationId: string, body: UpdateNotificationDto) {
    logger.info("Update notification request", { notificationId });

    const existing = await notificationRepository.getNotificationById(notificationId);

    if (!existing) throw new Error("Notification not found");

    await notificationRepository.update(notificationId, body);

    logger.info("Notification updated", { notificationId });

    return {
      ...existing,
      ...body,
    };
  }

  // Enable Notification
  async enableNotification(notificationId: string) {
    logger.info("Enable notification", { notificationId });

    await notificationRepository.enable(notificationId);

    logger.info("Notification enabled", { notificationId });

    return { message: "Notification enabled" };
  }

    //  Disable Notification
  async disableNotification(notificationId: string) {
    logger.info("Disable notification", { notificationId });

    await notificationRepository.disable(notificationId);

    logger.info("Notification disabled", { notificationId });

    return { message: "Notification disabled" };
  }

    // Soft Delete
  async softDeleteNotification(notificationId: string) {
    logger.warn("Soft delete notification request", { notificationId });

    await notificationRepository.softDelete(notificationId);

    logger.info("Notification soft deleted", { notificationId });

    return { message: "Notification soft deleted" };
  }

    // Delete
  async deleteNotification(notificationId: string) {
    logger.warn("Hard delete notification request", { notificationId });

    await notificationRepository.delete(notificationId);

    logger.info("Notification deleted", { notificationId });

    return { message: "Notification deleted" };
  }


  async getActiveNotifications(userId: string) {
    return notificationRepository.getActiveNotifications(userId);
  }

    // Scheduler ve cloud tasks için kullanılacak
  async getPendingScheduledNotifications() {
    return notificationRepository.getPendingScheduledNotifications();
  }

  canDispatch(notification: AppNotification): boolean {
    if (!notification.enabled) return false;
    if (notification.isDeleted) return false;

    if (
      notification.deliveryStatus === "SENT" ||
      notification.deliveryStatus === "CANCELLED" ||
      notification.deliveryStatus === "PROCESSING"
    ) {
      return false;
    }

    return true;
  }


  async dispatchNotification(notificationId: string) {
    const notification = await notificationRepository.getNotificationById(notificationId);

    if (!notification) {
      logger.warn("Dispatch failed: notification not found", { notificationId });
      return;
    }

    if (!this.canDispatch(notification)) {
      logger.info("Dispatch skipped", { notificationId });
      return;
    }

    // TODO: FCM send
  }



}

export const notificationService = new NotificationService();
