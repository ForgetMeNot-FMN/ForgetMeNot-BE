import { Request, Response } from "express";
import { contextBuilderService } from "../services/contextBuilderService";
import { notificationDecisionService } from "../services/notificationDecisionService";

export async function generateNotificationMessageHandler(
  req: Request,
  res: Response,
) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // Context çek
    const context = await contextBuilderService.buildUserContext(userId);

    // Decision ver
    const decision = notificationDecisionService.decide(context);

    // Basit message (LLM yerine fallback)
    let message = "";

    if (decision.type === "WARNING") {
      message = "You've been missing your tasks. Let's get back on track 💪";
    } else if (decision.type === "CELEBRATION") {
      message = "Amazing job! You're on fire 🔥 Keep it going!";
    } else {
      message = "You're doing good. Stay consistent and keep improving 🌱";
    }

    return res.json({
      success: true,
      data: {
        notificationType: decision.type,
        tone: context.profile.tonePreference ?? "neutral",
        message,
        fallbackUsed: true,
        reason: decision.reason,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}