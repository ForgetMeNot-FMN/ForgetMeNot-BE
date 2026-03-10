import { Response } from "express";
import { getGoogleEvents } from "../services/calendarService";
import { logger } from "../utils/logger";
import { AuthRequest } from "../middlewares/authMiddleware";

export const getEvents = async (req: AuthRequest, res: Response) => {
  try {

    const accessToken = req.headers["x-google-access-token"] as string;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Google access token missing"
      });
    }

    const userId = req.params.userId;

    logger.info("Fetching calendar events", { userId });

    const events = await getGoogleEvents(accessToken, userId);

    res.json({
      success: true,
      data: events
    });

  } catch (error) {

    logger.error("Failed to fetch calendar events", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch events"
    });
  }
};