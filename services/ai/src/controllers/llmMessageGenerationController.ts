import { Request, Response } from "express";
import { contextBuilderService } from "../services/contextBuilderService";
import { notificationDecisionService } from "../services/notificationDecisionService";
import { notificationPromptContextService } from "../services/notificationPromptContextService";
import { generateNotificationMessage } from "../services/messageGeneratorService";
import { NotificationDecisionResult } from "../models/decisionModel";
import { NotificationType } from "../models/llmModels";

const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  "REMINDER",
  "PROGRESS",
  "MOTIVATION",
  "SYSTEM",
];


function buildFallbackMessage(decision: NotificationDecisionResult): { title: string; body: string } {
  const reasonData = JSON.parse(decision.reason);

  if (decision.type === "WARNING") {
    if (reasonData.focusArea === "habit") {
      return { title: "Back on track", body: "You've been missing your habits. Let's get back on track 💪" };
    }
    if (reasonData.focusArea === "task") {
      return { title: "Back on track", body: "You've been missing your tasks. Let's get back on track 💪" };
    }
    return { title: "Back on track", body: "You've been missing your routines. Let's get back on track 💪" };
  }

  if (decision.type === "CELEBRATION") {
    if (reasonData.trigger === "high_streak") {
      return { title: "Streak on fire", body: "Incredible consistency! Your streak is amazing 🔥" };
    }
    if (reasonData.trigger === "high_performance") {
      return { title: "Peak performance", body: "Amazing job! You're performing at your best 🚀" };
    }
    if (reasonData.trigger === "strong_daily_progress") {
      return { title: "Great progress", body: "Great progress today! Keep the momentum going 💯" };
    }
    return { title: "Nice work", body: "Nice work today! Keep it up 🌱" };
  }

  return { title: "Stay consistent", body: "You're doing good. Stay consistent and keep improving 🌱" };
}


export async function llmGenerateNotificationMessageHandler(
  req: Request,
  res: Response,
) {
  try {
    const { userId, notificationType } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const resolvedType: NotificationType = VALID_NOTIFICATION_TYPES.includes(
      notificationType,
    )
      ? (notificationType as NotificationType)
      : "MOTIVATION";

    const context = await contextBuilderService.buildUserContext(userId);

    const decision = notificationDecisionService.decide(context);

    const systemInstruction =
      notificationPromptContextService.buildSystemInstruction();
    const userContextSummary =
      notificationPromptContextService.buildUserContextSummary(
        context,
        decision,
      );

    const llmResult = await generateNotificationMessage({
      userContext: context,
      weeklyData: context.recentNDays,
      notificationType: resolvedType,
    });

    const fallbackUsed = llmResult.fallbackUsed;
    const fallback = fallbackUsed ? buildFallbackMessage(decision) : null;
    const title = fallback ? fallback.title : llmResult.title;
    const body = fallback ? fallback.body : llmResult.body;
    const tone = fallbackUsed
      ? (context.profile.tonePreference ?? "neutral")
      : llmResult.tone;

    return res.json({
      success: true,
      data: {
        notificationType: decision.type,
        tone,
        title,
        body,
        message: body,
        fallbackUsed,
        generationSource: llmResult.generationSource,
        reason: decision.reason,
        llmPromptContext: {
          systemInstruction,
          userContextSummary,
          userSpecificNotes: context.notificationFeedback.userPromptNotes,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
