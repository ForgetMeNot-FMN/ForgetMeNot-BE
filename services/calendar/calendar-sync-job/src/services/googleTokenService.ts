import axios from "axios";
import { CalendarAccount } from "../models/calendarAccountModel";
import { calendarAccountRepository } from "../repositories/calendarAccountRepository";
import { envs } from "../utils/const";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface GoogleRefreshTokenResponse {
  access_token: string;
  expires_in?: number;
  token_type: string;
}

export const googleTokenService = {
  async getValidAccessToken(account: CalendarAccount) {
    if (
      account.accessToken &&
      account.expiryDate &&
      account.expiryDate > Date.now() + 60 * 1000
    ) {
      return account.accessToken;
    }

    if (!account.refreshToken) {
      throw new Error(`Missing refresh token for user ${account.userId}`);
    }

    const params = new URLSearchParams({
      client_id: envs.GOOGLE_CLIENT_ID,
      client_secret: envs.GOOGLE_CLIENT_SECRET,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    });

    const response = await axios.post<GoogleRefreshTokenResponse>(
      GOOGLE_TOKEN_URL,
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    const accessToken = response.data.access_token;
    const expiryDate = response.data.expires_in
      ? Date.now() + response.data.expires_in * 1000
      : null;

    await calendarAccountRepository.updateTokens(
      account.userId,
      accessToken,
      expiryDate,
    );

    return accessToken;
  },
};
