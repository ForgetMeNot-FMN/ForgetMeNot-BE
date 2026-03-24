import { notificationRepository } from "./notificationRepository";
import { userClient } from "./userClient";
import { fcmService } from "./fcmService";
import { logger } from "../utils/logger";
import { DeliveryStatus } from "../models/notificationModel";

class NotificationDispatcher {
  async dispatch(notificationId: string): Promise<void> {
    logger.info("Starting notification dispatch", { notificationId});
    const notification =
      await notificationRepository.getNotificationById(notificationId);

    if (!notification) return;
    if (!notification.enabled) return;
    if (notification.isDeleted) return;

    if (notification.deliveryStatus !== "SCHEDULED") {
      logger.debug("Notification already processed", {
        notificationId,
        status: notification.deliveryStatus,
      });
      return;
    }

    const canReceive =
      await userClient.canReceiveNotifications(notification.userId);

    if (!canReceive) {
      logger.info("User cannot receive notifications", {
        userId: notification.userId,
      });
      return;
    }

    if (notification.deliveryStatus !== "SCHEDULED") {
      logger.warn("Notification already handled", {
        notificationId,
        status: notification.deliveryStatus
      });
      return;
    }

    await notificationRepository.markAsProcessing(notificationId);

    const tokens =
      await userClient.getUserFcmTokens(notification.userId);
    logger.info("User tokens fetched", {
      notificationId,
      tokenCount: tokens.length
    });
    if (!tokens.length) {
      logger.warn("User has no FCM tokens", {
        userId: notification.userId,
      });

      await notificationRepository.markAsFailed(notificationId);
      return;
    }


    const response = await fcmService.sendPushNotification(
      tokens,
      notification.title,
      notification.body,
      {
        notificationId: String(notification.notificationId),
        type: String(notification.type),
      }
    );

    logger.info("FCM response", {
      notificationId: notification.notificationId,
      successCount: response.successCount,
      failureCount: response.failureCount,
      tokenResults: tokens.map((token, index) => ({
        tokenSuffix: token.slice(-8),
        success: response.responses[index]?.success ?? false,
        error: response.responses[index]?.error?.code,
        message: response.responses[index]?.error?.message,
      })),
      responses: response.responses.map(r => ({
      success: r.success,
      error: r.error?.code,
      message: r.error?.message,
      })),
    });

    const invalidTokens: string[] = [];

    response?.responses.forEach((r, index) => {
      if (
        !r.success &&
        (
          r.error?.code === "messaging/registration-token-not-registered" ||
          r.error?.code === "messaging/invalid-registration-token"
        )
      ) {
        invalidTokens.push(tokens[index]);
      }
    });

    if (invalidTokens.length) {
      await userClient.removeFcmTokens(
        notification.userId,
        invalidTokens
      );

      logger.warn("Invalid FCM tokens removed", {
        userId: notification.userId,
        count: invalidTokens.length,
      });
    }

    if (response && response.successCount > 0) {
      // RECURRING ve CRON notification'lar tekrar çalışabilmesi için SCHEDULED'a döndür
      if (
        notification.scheduleType === "RECURRING" ||
        notification.scheduleType === "CRON"
      ) {
        await notificationRepository.markAsScheduled(notificationId);
      } else {
        await notificationRepository.markAsSent(notificationId);
      }

      logger.info("Notification sent successfully", {
        notificationId,
        success: response.successCount,
        failure: response.failureCount,
        scheduleType: notification.scheduleType,
      });
    } else {
      await notificationRepository.markAsFailed(notificationId);

      logger.error("Notification failed", {
        notificationId,
        responses: response.responses
      });
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher();
