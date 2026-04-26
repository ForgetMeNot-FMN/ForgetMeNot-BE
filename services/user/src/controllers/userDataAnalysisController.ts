import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AnalysisPeriod } from "../models/userDataAnalysisModel";
import { userDataAnalysisService } from "../services/userDataAnalysisService";

const VALID_PERIODS = new Set<AnalysisPeriod>(["weekly", "monthly", "yearly"]);

export async function getUserDataAnalysisHandler(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;
    const tokenUserId = req.user?.userId ?? (req.user as any)?.sub;

    if (tokenUserId !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const period = req.query.period;
    if (typeof period !== "string" || !VALID_PERIODS.has(period as AnalysisPeriod)) {
      return res.status(400).json({
        success: false,
        message: "period must be one of weekly, monthly, yearly",
      });
    }

    const data = await userDataAnalysisService.getUserDataAnalysis(userId, {
      period: period as AnalysisPeriod,
    });

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
