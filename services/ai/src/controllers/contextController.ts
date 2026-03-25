import { Request, Response } from "express";
import { contextBuilderService } from "../services/contextBuilderService";
import { logger } from "../utils/logger";

export async function healthHandler(_req: Request, res: Response) {
  return res.json({
    success: true,
    data: {
      service: "ai",
      status: "ok",
    },
  });
}

export async function buildUserContextHandler(req: Request, res: Response) {
  try {
    const rawUserId = req.params.userId;
    const rawDays = req.query.days;
    let days: number | undefined;

    if (rawDays !== undefined) {
      const parsed = Number(rawDays);

      if (isNaN(parsed) || parsed <= 0 || parsed > 30) {
        return res.status(400).json({
          success: false,
          message: "days must be a number between 1 and 30",
        });
      }
      days = parsed;
    }
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    logger.info("Context request received", {
      userId,
      days,
    });

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const data = await contextBuilderService.buildUserContext(userId, { days });

    return res.json({
      success: true,
      data,
    });
    } 
    catch (error: any) {
    logger.error("Context build failed", {
      userId: req.params.userId,
      error: error?.message,
      stack: error?.stack,
    });

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
