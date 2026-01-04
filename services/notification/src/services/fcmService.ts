import admin from "firebase-admin";
import { logger } from "../utils/logger";

class FcmService {
  async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    if (!tokens.length) return;

    const message = {
      notification: { title, body },
      data,
      tokens,
    };
    logger.info("Sending FCM push", { message });
    const response = await admin.messaging().sendEachForMulticast(message);

    logger.info("FCM push sent", {
      success: response.successCount,
      failure: response.failureCount,
    });

    return response;
  }
}

export const fcmService = new FcmService();
