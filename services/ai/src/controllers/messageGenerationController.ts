import { Request, Response } from "express";
import { NotificationSourceType } from "../models/decisionModel";
import { llmNotificationService } from "../services/llmNotificationService";

export async function generateNotificationMessageHandler(
  req: Request,
  res: Response,
) {
  try {
    const { userId, sourceType = "SYSTEM" } = req.body as {
      userId?: string;
      sourceType?: NotificationSourceType;
    };

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const generated = await llmNotificationService.generateUserNotification(
      userId,
      sourceType,
    );

    return res.json({
      success: true,
      data: {
        notificationType: generated.decisionType,
        tone: generated.tone,
        title: generated.title,
        body: generated.body,
        message: generated.message,
        fallbackUsed: generated.fallbackUsed,
        generationSource: generated.generationSource,
        reason: generated.reason,
        llmPromptContext: generated.llmPromptContext,
        ...(generated.fallbackMetadata
          ? { fallbackMetadata: generated.fallbackMetadata }
          : {}),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function dispatchDailyLlmNotificationsHandler(
  _req: Request,
  res: Response,
) {
  try {
    const result = await llmNotificationService.dispatchDailyNotifications();

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
