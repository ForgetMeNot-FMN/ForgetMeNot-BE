import axios from "axios";
import { PubSub } from "@google-cloud/pubsub";
import { google } from "googleapis";
import { firestore } from "./firebaseAdmin";
import { calendarAccountRepository } from "../repositories/calendarAccountRepository";
import { logger } from "../utils/logger";
import { envs } from "../utils/const";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERS_COLLECTION = "users";
const pubsub = new PubSub({ projectId: envs.GCP_PROJECT_ID });

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  expires_in?: number;
  token_type: string;
  scope: string;
}

interface LinkGoogleCalendarInput {
  userId: string;
  serverAuthCode: string;
  googleAccessToken?: string;
  scopes?: string[];
}

async function exchangeServerAuthCode(code: string): Promise<GoogleTokenResponse> {
  const params = new URLSearchParams({
    code,
    client_id: envs.GOOGLE_CLIENT_ID,
    client_secret: envs.GOOGLE_CLIENT_SECRET,
    redirect_uri: "",
    grant_type: "authorization_code",
  });

  try {
    const response = await axios.post<GoogleTokenResponse>(GOOGLE_TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  } catch (err: any) {
    const detail = err.response?.data ?? err.message;
    logger.error("Google token exchange failed", { detail });
    throw new Error(`Google token exchange failed: ${JSON.stringify(detail)}`);
  }
}

async function publishGoogleEventsInitialSync(userId: string, accessToken: string): Promise<void> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });
  const topic = pubsub.topic(envs.CALENDAR_EVENTS_TOPIC);

  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  const now = new Date();
  const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());

  do {
    const res = await calendar.events.list({
      calendarId: "primary",
      singleEvents: true,
      pageToken,
      maxResults: 250,
      timeMin: now.toISOString(),
      timeMax: threeMonthsLater.toISOString(),
    });

    const items = res.data.items ?? [];
    nextSyncToken = res.data.nextSyncToken ?? undefined;
    pageToken = res.data.nextPageToken ?? undefined;

    for (const event of items) {
      if (!event.start?.dateTime && !event.start?.date) continue;

      const startTime = event.start.dateTime ?? `${event.start.date}T00:00:00Z`;
      const endTime = event.end?.dateTime ?? `${event.end?.date}T00:00:00Z`;

      const message = {
        userId,
        provider: "google" as const,
        title: event.summary ?? "(No title)",
        startTime,
        endTime,
        externalEventId: event.id ?? undefined,
      };

      await topic.publishMessage({ json: message });
    }

    logger.info("Google Calendar initial sync batch published", {
      userId,
      count: items.length,
    });
  } while (pageToken);

  if (nextSyncToken) {
    await calendarAccountRepository.updateNextSyncToken(userId, nextSyncToken);
    logger.info("nextSyncToken saved", { userId });
  }
}

export const googleCalendarAuthService = {
  async linkGoogleCalendar(input: LinkGoogleCalendarInput): Promise<void> {
    const tokens = await exchangeServerAuthCode(input.serverAuthCode);

    const expiryDate = tokens.expiry_date
      ?? (tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null);

    await calendarAccountRepository.upsertCalendarAccount(input.userId, {
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiryDate,
      scopes: input.scopes ?? tokens.scope?.split(" ") ?? [],
    });

    await firestore.collection(USERS_COLLECTION).doc(input.userId).set(
      { permissions: { allowCalendar: true } },
      { merge: true },
    );

    logger.info("Google Calendar linked successfully", { userId: input.userId });

    publishGoogleEventsInitialSync(input.userId, tokens.access_token).catch((err) => {
      logger.error("Initial Google Calendar sync failed", { userId: input.userId, err });
    });
  },
};
