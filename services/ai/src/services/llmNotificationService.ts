import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { AiNotificationType, NotificationSourceType } from "../models/decisionModel";
import { NotificationType } from "../models/llmModels";
import { UserRecord } from "../models/userContextModel";
import { userContextRepository } from "../repositories/userContextRepository";
import { logger } from "../utils/logger";
import { contextBuilderService } from "./contextBuilderService";
import { generateNotificationMessage } from "./messageGeneratorService";
import { notificationDecisionService } from "./notificationDecisionService";
import { notificationFallbackService } from "./notificationFallbackService";
import { notificationPromptContextService } from "./notificationPromptContextService";
import { llmNotificationScheduleService } from "./llmNotificationScheduleService";
import { notificationClient } from "./notificationClient";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_USER_TIMEZONE = "Europe/Istanbul";

export interface GeneratedLlmNotification {
  appNotificationType: NotificationType;
  decisionType: AiNotificationType;
  title: string;
  body: string;
  message: string;
  tone: string;
  fallbackUsed: boolean;
  generationSource: "LLM" | "SYSTEM";
  reason: string;
  llmPromptContext: {
    systemInstruction: string;
    userContextSummary: string;
    userSpecificNotes: string[];
  };
  fallbackMetadata?: {
    branch: string;
    variantIndex: number;
    sourceType: NotificationSourceType;
    personaTone: string;
    intensity: string;
  };
}

export interface DispatchDailyLlmNotificationsResult {
  processedUsers: number;
  createdNotifications: number;
  skippedUsers: number;
  failures: number;
}

function toAppNotificationType(type: AiNotificationType): NotificationType {
  if (type === "WARNING") return "REMINDER";
  if (type === "CELEBRATION") return "PROGRESS";
  return "MOTIVATION";
}

function buildDailySourceId(dateKey: string): string {
  return `LLM_DAILY_${dateKey}`;
}

class LlmNotificationService {
  async generateUserNotification(
    userId: string,
    sourceType: NotificationSourceType = "SYSTEM",
  ): Promise<GeneratedLlmNotification> {
    const context = await contextBuilderService.buildUserContext(userId);
    const decision = notificationDecisionService.decide(context);
    const appNotificationType = toAppNotificationType(decision.type);
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
      notificationType: appNotificationType,
    });

    const fallbackMessage = llmResult.fallbackUsed
      ? notificationFallbackService.generateMessage(context, decision, { sourceType })
      : null;

    return {
      appNotificationType,
      decisionType: decision.type,
      title: fallbackMessage ? fallbackMessage.title : llmResult.title,
      body: fallbackMessage ? fallbackMessage.body : llmResult.body,
      message: fallbackMessage ? fallbackMessage.message : llmResult.body,
      tone: fallbackMessage
        ? (context.profile.tonePreference ?? "neutral")
        : llmResult.tone,
      fallbackUsed: llmResult.fallbackUsed,
      generationSource: llmResult.generationSource,
      reason: decision.reason,
      llmPromptContext: {
        systemInstruction,
        userContextSummary,
        userSpecificNotes: context.notificationFeedback.userPromptNotes,
      },
      ...(fallbackMessage
        ? { fallbackMetadata: fallbackMessage.strategy }
        : {}),
    };
  }

  async dispatchDailyNotifications(): Promise<DispatchDailyLlmNotificationsResult> {
    const users = await userContextRepository.listUsersEligibleForLlmNotifications();
    const result: DispatchDailyLlmNotificationsResult = {
      processedUsers: users.length,
      createdNotifications: 0,
      skippedUsers: 0,
      failures: 0,
    };

    for (const user of users) {
      try {
        const created = await this.dispatchDailyNotificationForUser(user);

        if (created) {
          result.createdNotifications += 1;
        } else {
          result.skippedUsers += 1;
        }
      } catch (error: any) {
        result.failures += 1;
        logger.error("Daily LLM notification dispatch failed for user", {
          userId: user.userId,
          error: error?.message,
        });
      }
    }

    return result;
  }

  private async dispatchDailyNotificationForUser(
    user: UserRecord,
  ): Promise<boolean> {
    if (!user.userId) {
      logger.info("Daily LLM notification skipped", {
        reason: "missing_user_id",
      });
      return false;
    }

    if (Array.isArray(user.fcmTokens) && user.fcmTokens.length === 0) {
      logger.info("Daily LLM notification skipped", {
        userId: user.userId,
        reason: "no_fcm_tokens",
      });
      return false;
    }

    const timezoneName = user.timezone ?? DEFAULT_USER_TIMEZONE;
    const now = dayjs().tz(timezoneName);
    const preferredSchedule =
      llmNotificationScheduleService.resolvePreferredTime(
        user.onboarding?.preferredTime,
      );

    if (!llmNotificationScheduleService.shouldDispatchAtHour(
      preferredSchedule.slot,
      now.hour(),
    )) {
      logger.info("Daily LLM notification skipped", {
        userId: user.userId,
        reason: "hour_mismatch",
        timezone: timezoneName,
        currentHour: now.hour(),
        preferredTime: preferredSchedule.slot,
        preferredHour: preferredSchedule.hour,
      });
      return false;
    }

    const sourceId = buildDailySourceId(now.format("YYYY-MM-DD"));
    const alreadyCreated =
      await userContextRepository.hasActiveNotificationBySourceId(
        user.userId,
        sourceId,
      );

    if (alreadyCreated) {
      logger.info("Daily LLM notification skipped", {
        userId: user.userId,
        reason: "already_created_for_today",
        sourceId,
        timezone: timezoneName,
      });
      return false;
    }

    const generated = await this.generateUserNotification(user.userId);
    const notificationId =
      await notificationClient.createImmediateLlmNotification({
        userId: user.userId,
        title: generated.title,
        body: generated.body,
        sourceId,
        timezone: timezoneName,
        type: generated.appNotificationType,
      });

    await notificationClient.setGenerationSource(
      notificationId,
      generated.generationSource,
    );

    logger.info("Daily LLM notification created", {
      userId: user.userId,
      notificationId,
      sourceId,
      timezone: timezoneName,
      preferredTime: preferredSchedule.slot,
      scheduledWindow: preferredSchedule.timeOfDay,
      generationSource: generated.generationSource,
    });

    return true;
  }
}

export const llmNotificationService = new LlmNotificationService();
