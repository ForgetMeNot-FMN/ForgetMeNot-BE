import { notificationRepository } from "./notificationRepository";
import { userClient } from "./userClient";
import { fcmService } from "./fcmService";
import { logger } from "../utils/logger";
import { DeliveryStatus } from "../models/notificationModel";

class NotificationDispatcher {
  async dispatch(notificationId: string): Promise<void> {
    logger.info("Dispatcher service called...")
    const notification =
      await notificationRepository.getNotificationById(notificationId);

    if (!notification) return;
    if (!notification.enabled) return;
    if (notification.isDeleted) return;

    if (
      notification.deliveryStatus === "SENT" ||
      notification.deliveryStatus === "PROCESSING"
    ) {
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


    await notificationRepository.markAsProcessing(notificationId);

    const tokens =
      await userClient.getUserFcmTokens(notification.userId);
    logger.info(notificationId, tokens);
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

    /**
     * ✅ Success / Failure
     */
    if (response && response.successCount > 0) {
      await notificationRepository.markAsSent(notificationId);

      logger.info("Notification sent successfully", {
        notificationId,
        success: response.successCount,
        failure: response.failureCount,
      });
    } else {
      await notificationRepository.markAsFailed(notificationId);

      logger.error("Notification send failed", {
        notificationId,
      });
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher();
