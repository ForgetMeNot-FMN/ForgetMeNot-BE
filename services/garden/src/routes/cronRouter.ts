import { Router } from "express";
import { runGardenNotificationJob } from "../services/gardenNotificationJob";

const cronRouter = Router();

cronRouter.post("/garden-notifications", async (_req, res) => {
  try {
    const result = await runGardenNotificationJob();
    return res.status(200).json({ ok: true, data: result });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default cronRouter;
