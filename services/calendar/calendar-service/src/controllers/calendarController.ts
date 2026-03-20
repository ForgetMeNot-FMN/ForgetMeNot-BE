import { Response } from "express";
import {
  detectConflictsByDateRange,
  resolveConflict,
  validateDateRange,
} from "../services/calendarService";
import { calendarRepository } from "../repositories/calendarRepository";
import { logger } from "../utils/logger";
import { AuthRequest } from "../middlewares/authMiddleware";

export async function getEvents(req: AuthRequest, res: Response) {
  try {
    const userId = req.params.userId;

    const from =
      typeof req.query.from === "string"
        ? req.query.from
        : new Date().toISOString();
    const to =
      typeof req.query.to === "string"
        ? req.query.to
        : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

    await validateDateRange(from, to);

    logger.info("Fetching calendar events from Firestore", { userId, from, to });

    const events = await calendarRepository.getCalendarEventsByDateRange(userId, from, to);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    logger.error("Failed to fetch calendar events", error);

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch events",
    });
  }
}

export async function resolveConflictHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.params.userId;
    const { conflictId, action } = req.body as {
      conflictId?: string;
      action?: "continue" | "cancel";
    };

    if (!conflictId || !action) {
      return res.status(400).json({
        success: false,
        message: "conflictId and action are required",
      });
    }

    if (action !== "continue" && action !== "cancel") {
      return res.status(400).json({
        success: false,
        message: "action must be continue or cancel",
      });
    }

    const result = await resolveConflict(userId, conflictId, action);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to resolve conflict", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to resolve conflict",
    });
  }
}

export async function getConflicts(req: AuthRequest, res: Response) {
  try {
    const userId = req.params.userId;

    const from = req.query.from as string;
    const to = req.query.to as string;
    await validateDateRange(from, to);

    const conflicts = await detectConflictsByDateRange(userId, from, to);

    return res.json({
      success: true,
      data: {
        range: { from, to },
        conflicts,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch conflicts", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch conflicts",
    });
  }
}
