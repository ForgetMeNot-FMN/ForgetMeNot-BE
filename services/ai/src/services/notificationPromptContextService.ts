import {
  NotificationDecisionResult,
  NotificationSourceType,
} from "../models/decisionModel";
import { UserContextDTO } from "../models/userContextModel";

class NotificationPromptContextService {
  buildSystemInstruction(): string {
    return [
      "Generate a single mobile push notification message.",
      "Keep it concise, specific, and grounded in the user's real context.",
      "Treat generation source as the main history signal: compare LLM-generated versus fixed system notifications.",
      "Treat source type only as the domain context, such as task, habit, flower, or system.",
      "Interpret feedback events as follows: clicked means interest, completed means the intended action happened, ignored means no meaningful follow-through within the expected window.",
      "Prefer fresh phrasing over repeated templates.",
      "If prior notifications were ignored, reduce pressure and avoid guilt-heavy language.",
      "If prior notifications led to completion, keep the CTA clear and action-oriented.",
      "Use notification history to distinguish LLM-generated versus system-generated patterns.",
    ].join(" ");
  }

  buildUserContextSummary(
    context: UserContextDTO,
    decision: NotificationDecisionResult,
    sourceType?: NotificationSourceType,
  ): string {
    const feedback = context.notificationFeedback;

    return [
      `User timezone: ${context.profile.timezone ?? "UTC"}.`,
      `Decision type: ${decision.type}.`,
      `Notification source type: ${sourceType ?? "SYSTEM"}.`,
      `Username: ${context.profile.username ?? "unknown"}.`,
      `Tone preference: ${context.profile.tonePreference ?? "neutral"}.`,
      `Motivation type: ${context.profile.motivationType ?? "unknown"}.`,
      `Habit completion rate: ${context.habitStats.completionRateLastNDays}%.`,
      `Task completion rate: ${context.taskStats.completionRateLastNDays}%.`,
      `Current best streak: ${context.habitStats.currentBestStreak}.`,
      `Goals: ${context.profile.goals.join(", ") || "none"}.`,
      `Pain points: ${context.profile.painPoints.join(", ") || "none"}.`,
      `Tracked notification logs: ${feedback.totalTracked}.`,
      `LLM-generated notifications: ${feedback.llmGeneratedCount}.`,
      `System-generated notifications: ${feedback.systemGeneratedCount}.`,
      `Clicks: ${feedback.clicks}, completions: ${feedback.completions}, ignores: ${feedback.ignores}.`,
    ].join(" ");
  }
}

export const notificationPromptContextService =
  new NotificationPromptContextService();
