import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AnalysisPeriod } from "../models/userDataAnalysisModel";
import { userDataAnalysisService } from "../services/userDataAnalysisService";
import { logger } from "../utils/logger";

const VALID_PERIODS = new Set<AnalysisPeriod>(["weekly", "monthly", "yearly"]);

export async function getUserDataAnalysisHandler(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;
    const tokenUserId = req.user?.userId ?? (req.user as any)?.sub;

    if (tokenUserId !== userId) {
      logger.warn("User data analysis forbidden", { userId, tokenUserId });
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const period = req.query.period;
    if (typeof period !== "string" || !VALID_PERIODS.has(period as AnalysisPeriod)) {
      logger.warn("Invalid user data analysis period", { userId, period });
      return res.status(400).json({
        success: false,
        message: "period must be one of weekly, monthly, yearly",
      });
    }

    logger.info("User data analysis request", { userId, period });

    const data = await userDataAnalysisService.getUserDataAnalysis(userId, {
      period: period as AnalysisPeriod,
    });

    logger.info("User data analysis response ready", { userId, period, seriesPoints: data.series.length, tasksCompleted: data.summary.tasks.completed, habitsCompleted: data.summary.habits.completed, awardsEarned: data.summary.awards.earned });

    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error("User data analysis failed", { userId: req.params.userId, error: err.message });
    return res.status(400).json({ success: false, message: err.message });
  }
}
