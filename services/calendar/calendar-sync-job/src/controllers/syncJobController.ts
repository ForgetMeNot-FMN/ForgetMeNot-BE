import { Request, Response } from "express";
import { syncJobService } from "../services/syncJobService";
import { logger } from "../utils/logger";

export async function runSyncJob(req: Request, res: Response) {
  try {
    const { from, to } = req.body as {
      from?: string;
      to?: string;
    };

    const result = await syncJobService.runAllUsersSync(from, to);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to run calendar sync job", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to run sync job",
    });
  }
}
