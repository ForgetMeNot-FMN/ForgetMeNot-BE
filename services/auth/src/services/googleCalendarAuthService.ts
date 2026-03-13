import axios from "axios";
import { firestore } from "./firebaseAdmin";
import { calendarAccountRepository } from "../repositories/calendarAccountRepository";
import { logger } from "../utils/logger";
import { envs } from "../utils/const";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERS_COLLECTION = "users";

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
  },
};
