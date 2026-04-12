import { Response } from "express";
import { z } from "zod";
import dayjs from "dayjs";
import { AuthRequest } from "../middlewares/authMiddleware";
import { chatRepository } from "../repositories/chatRepository";
import { geminiChatService } from "../services/geminiChatService";
import { userContextRepository } from "../repositories/userContextRepository";
import { chatStatsRepository } from "../repositories/chatStatsRepository";
import { buildOnboardingSummary, buildStatsSummary } from "../services/chatContextService";
import { ChatMessage } from "../models/chatModel";
import { logger } from "../utils/logger";

const sendMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message is too long (max 1000 characters)"),
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(_\d+)?$/, "sessionDate must be YYYY-MM-DD or YYYY-MM-DD_N format")
    .optional(),
});

const preferencesSchema = z.object({
  personalizedContext: z.boolean(),
});

export async function sendMessageHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      logger.warn("Chat message request rejected: missing user", {
        route: "POST /chat/message",
      });
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn("Chat message request validation failed", {
        userId,
        route: "POST /chat/message",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0].message,
      });
    }

    const { message, sessionDate } = parsed.data;
    const targetDate = sessionDate ?? dayjs().format("YYYY-MM-DD");

    logger.info("Chat message request received", {
      userId,
      sessionDate: targetDate,
      hasCustomSessionDate: Boolean(sessionDate),
      messageLength: message.length,
    });

    const [session, preferences, userRecord] = await Promise.all([
      chatRepository.getSession(userId, targetDate),
      chatRepository.getPreferences(userId),
      userContextRepository.getUserById(userId),
    ]);

    const history: ChatMessage[] = session?.messages ?? [];
    logger.debug("Chat dependencies loaded", {
      userId,
      sessionDate: targetDate,
      existingSession: Boolean(session),
      historyMessageCount: history.length,
      hasPreferences: Boolean(preferences),
      personalizedContextEnabled: Boolean(preferences?.personalizedContext),
      hasUserRecord: Boolean(userRecord),
    });

    const contextParts: string[] = [];

    if (userRecord) {
      const onboarding = buildOnboardingSummary(userRecord);
      if (onboarding) contextParts.push(onboarding);
    }

    if (preferences?.personalizedContext) {
      try {
        const chatStats = await chatStatsRepository.getUserStats(userId);
        const stats = buildStatsSummary(chatStats);
        if (stats) contextParts.push(stats);
      } catch (error: any) {
        logger.warn("Failed to fetch chat stats, continuing without them", {
          userId,
          error: error?.message,
        });
      }
    }

    const contextSummary = contextParts.length > 0 ? contextParts.join(" ") : undefined;
    logger.debug("Chat context prepared", {
      userId,
      sessionDate: targetDate,
      contextPartCount: contextParts.length,
      contextLength: contextSummary?.length ?? 0,
    });

    const reply = await geminiChatService.sendMessage(message, history, contextSummary);
    logger.info("Chat model response generated", {
      userId,
      sessionDate: targetDate,
      replyLength: reply.length,
    });

    const now = Date.now();
    const userMessage: ChatMessage = { role: "user", content: message, timestamp: now };
    const modelMessage: ChatMessage = { role: "model", content: reply, timestamp: now + 1 };

    await chatRepository.appendMessagePair(userId, targetDate, userMessage, modelMessage, session);
    logger.info("Chat message pair persisted", {
      userId,
      sessionDate: targetDate,
      previousMessageCount: history.length,
      newMessageCount: history.length + 2,
    });

    return res.json({
      success: true,
      data: { reply, sessionDate: targetDate },
    });
  } catch (error: any) {
    logger.error("sendMessage failed", { error: error?.message, stack: error?.stack });
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSessionsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      logger.warn("Get chat sessions request rejected: missing user", {
        route: "GET /chat/sessions",
      });
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const dates = await chatRepository.listSessionDates(userId);
    logger.info("Chat sessions listed", {
      userId,
      sessionCount: dates.length,
    });
    return res.json({ success: true, data: { sessions: dates } });
  } catch (error: any) {
    logger.error("getSessions failed", { error: error?.message });
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSessionByDateHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      logger.warn("Get chat session request rejected: missing user", {
        route: "GET /chat/sessions/:date",
      });
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const date = String(req.params.date);
    if (!/^\d{4}-\d{2}-\d{2}(_\d+)?$/.test(date)) {
      logger.warn("Get chat session request validation failed", {
        userId,
        date,
      });
      return res
        .status(400)
        .json({ success: false, message: "date must be YYYY-MM-DD format" });
    }

    const session = await chatRepository.getSession(userId, date);
    if (!session) {
      logger.warn("Chat session not found", {
        userId,
        sessionDate: date,
      });
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    logger.info("Chat session fetched", {
      userId,
      sessionDate: date,
      messageCount: session.messages.length,
    });
    return res.json({ success: true, data: session });
  } catch (error: any) {
    logger.error("getSessionByDate failed", { error: error?.message });
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteSessionHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      logger.warn("Delete chat session request rejected: missing user", {
        route: "DELETE /chat/sessions/:date",
      });
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const date = String(req.params.date);
    if (!/^\d{4}-\d{2}-\d{2}(_\d+)?$/.test(date)) {
      logger.warn("Delete chat session request validation failed", {
        userId,
        date,
      });
      return res
        .status(400)
        .json({ success: false, message: "date must be YYYY-MM-DD format" });
    }

    await chatRepository.deleteSession(userId, date);
    logger.info("Chat session deleted", {
      userId,
      sessionDate: date,
    });
    return res.json({ success: true });
  } catch (error: any) {
    logger.error("deleteSession failed", { error: error?.message });
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function setPreferencesHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      logger.warn("Set chat preferences request rejected: missing user", {
        route: "PATCH /chat/preferences",
      });
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const parsed = preferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn("Set chat preferences validation failed", {
        userId,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0].message,
      });
    }

    await chatRepository.setPreferences(userId, parsed.data);
    logger.info("Chat preferences updated", {
      userId,
      personalizedContext: parsed.data.personalizedContext,
    });
    return res.json({ success: true, data: parsed.data });
  } catch (error: any) {
    logger.error("setPreferences failed", { error: error?.message });
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getPreferencesHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      logger.warn("Get chat preferences request rejected: missing user", {
        route: "GET /chat/preferences",
      });
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const preferences = await chatRepository.getPreferences(userId);
    logger.info("Chat preferences fetched", {
      userId,
      hasPreferences: Boolean(preferences),
      personalizedContext: preferences?.personalizedContext ?? null,
    });
    return res.json({ success: true, data: preferences });
  } catch (error: any) {
    logger.error("getPreferences failed", { error: error?.message });
    return res.status(500).json({ success: false, message: error.message });
  }
}
