import { Request, Response } from "express";
import { contextBuilderService } from "../services/contextBuilderService";
import { notificationDecisionService } from "../services/notificationDecisionService";
import { notificationPromptContextService } from "../services/notificationPromptContextService";

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
    const systemInstruction =
      notificationPromptContextService.buildSystemInstruction();
    const userContextSummary =
      notificationPromptContextService.buildUserContextSummary(
        context,
        decision,
      );

    const reasonData = JSON.parse(decision.reason);

    // Basit message (LLM yerine fallback)
    let message = "";

    if (decision.type === "WARNING") {
      if (reasonData.focusArea === "habit") {
        message = "You've been missing your habits. Let's get back on track 💪";
      } else if (reasonData.focusArea === "task") {
        message = "You've been missing your tasks. Let's get back on track 💪";
      } else {
        message = "You've been missing your routines. Let's get back on track 💪";
      }

    } else if (decision.type === "CELEBRATION") {
      if (reasonData.trigger === "high_streak") {
        message = "Incredible consistency! Your streak is amazing 🔥";
      } else if (reasonData.trigger === "high_performance") {
        message = "Amazing job! You're performing at your best 🚀";
      } else if (reasonData.trigger === "strong_daily_progress") {
        message = "Great progress today! Keep the momentum going 💯";
      } else {
        message = "Nice work today! Keep it up 🌱";
      }

    } else {
      message = "You're doing good. Stay consistent and keep improving 🌱";
    }

    // Future LLM integration point:
    // Pass `systemInstruction`, `userContextSummary`,
    // `context.notificationFeedback.userPromptNotes` and `decision.reason`
    // into the model so the generated message can adapt to prior notification outcomes.

    return res.json({
      success: true,
      data: {
        notificationType: decision.type,
        tone: context.profile.tonePreference ?? "neutral",
        message,
        fallbackUsed: true,
        reason: decision.reason,
        llmPromptContext: {
          systemInstruction,
          userContextSummary,
          userSpecificNotes:
            context.notificationFeedback.userPromptNotes,
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
