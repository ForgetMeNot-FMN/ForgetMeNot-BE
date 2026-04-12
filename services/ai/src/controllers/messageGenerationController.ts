import { Request, Response } from "express";
import { AiNotificationType, NotificationSourceType } from "../models/decisionModel";
import { NotificationType } from "../models/llmModels";
import { contextBuilderService } from "../services/contextBuilderService";
import { notificationDecisionService } from "../services/notificationDecisionService";
import { notificationFallbackService } from "../services/notificationFallbackService";
import { notificationPromptContextService } from "../services/notificationPromptContextService";
import { generateNotificationMessage } from "../services/messageGeneratorService";

function toNotificationType(type: AiNotificationType): NotificationType {
  if (type === "WARNING") return "REMINDER";
  if (type === "CELEBRATION") return "PROGRESS";
  return "MOTIVATION";
}

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

    const context = await contextBuilderService.buildUserContext(userId);
    const decision = notificationDecisionService.decide(context);
    const systemInstruction =
      notificationPromptContextService.buildSystemInstruction();
    const userContextSummary =
      notificationPromptContextService.buildUserContextSummary(
        context,
        decision,
        sourceType,
      );

    const llmResult = await generateNotificationMessage({
      userContext: context,
      weeklyData: context.recentNDays,
      notificationType: toNotificationType(decision.type),
    });

    const fallbackMessage = llmResult.fallbackUsed
      ? notificationFallbackService.generateMessage(context, decision, { sourceType })
      : null;

    const title = fallbackMessage ? fallbackMessage.title : llmResult.title;
    const body = fallbackMessage ? fallbackMessage.body : llmResult.body;
    const message = fallbackMessage ? fallbackMessage.message : llmResult.body;
    const tone = fallbackMessage
      ? (context.profile.tonePreference ?? "neutral")
      : llmResult.tone;

    return res.json({
      success: true,
      data: {
        notificationType: decision.type,
        tone,
        title,
        body,
        message,
        fallbackUsed: llmResult.fallbackUsed,
        generationSource: llmResult.generationSource,
        reason: decision.reason,
        llmPromptContext: {
          systemInstruction,
          userContextSummary,
          userSpecificNotes: context.notificationFeedback.userPromptNotes,
        },
        ...(fallbackMessage ? { fallbackMetadata: fallbackMessage.strategy } : {}),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
