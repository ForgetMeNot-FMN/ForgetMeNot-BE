import { Request, Response } from "express";
import { NotificationSourceType } from "../models/decisionModel";
import { contextBuilderService } from "../services/contextBuilderService";
import { notificationDecisionService } from "../services/notificationDecisionService";
import { notificationFallbackService } from "../services/notificationFallbackService";
import { notificationPromptContextService } from "../services/notificationPromptContextService";

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

    const fallbackMessage =
      notificationFallbackService.generateMessage(context, decision, {
        sourceType,
      });

    // Future LLM integration point:
    // Use `systemInstruction`, `userContextSummary`,
    // `context.notificationFeedback.userPromptNotes` and `decision.reason`
    // for the model request. If the LLM fails or returns empty/invalid text,
    // return `fallbackMessage.message` so notification delivery never goes blank.

    return res.json({
      success: true,
      data: {
        notificationType: decision.type,
        tone: context.profile.tonePreference ?? "neutral",
        title: fallbackMessage.title,
        body: fallbackMessage.body,
        message: fallbackMessage.message,
        fallbackUsed: true,
        reason: decision.reason,
        llmPromptContext: {
          systemInstruction,
          userContextSummary,
          userSpecificNotes:
            context.notificationFeedback.userPromptNotes,
        },
        fallbackMetadata: fallbackMessage.strategy,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
