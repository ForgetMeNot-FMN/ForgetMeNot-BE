import { google } from "googleapis";
import { normalizeGoogleEvent } from "../utils/eventNormalizer";
import { logger } from "../utils/logger";

export const getGoogleEvents = async (accessToken: string, userId: string) => {
  try {

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.list({
      calendarId: "primary",
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: new Date().toISOString()
    });

    const events = response.data.items || [];

    logger.info("Fetched events from Google", {
        userId,
        count: events.length
    });

    return events.map((event) => normalizeGoogleEvent(event, userId));

  } catch (error) {

    logger.error("Google Calendar API error", error);

    throw new Error("Google Calendar fetch failed");
  }
};