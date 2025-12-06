import axios from "axios";
import { firebaseAdmin } from "../services/firebaseAdmin";
import { AuthResponse, AuthUser } from "../models/authDtos";
import { tokenService } from "./tokenService";
import { logger } from "../utils/logger";

const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;
const GARDEN_SERVICE_URL = process.env.GARDEN_SERVICE_URL!;

export const googleAuthService = {
  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    const userId = decoded.uid;
    const email = decoded.email || "";
    const username = decoded.name || email.split("@")[0];

    logger.info("Google token verified", { userId, email });

    let user;
    try {
      const res = await axios.get(`${USER_SERVICE_URL}/users/${userId}`);
      user = res.data.data;
    } catch (err) {
      logger.info("User not found, creating new user", { userId });
      const createUserRes = await axios.post(`${USER_SERVICE_URL}/users`, {
        userId,
        email,
        username,
        authProvider: "google",
        age: null,
        gender: null,
        permissions: {
          allowCalendar: true,
          allowKVKK: true,
          allowLocation: true,
        },
      });
      user = createUserRes.data.data;
      await axios.post(`${GARDEN_SERVICE_URL}/gardens/${userId}`);
    }

    const authUser: AuthUser = {
      userId: user.userId,
      email: user.email,
      username: user.username,
      authProvider: "google",
    };
    const token = tokenService.sign(authUser);
    logger.info("Google login success", { userId });
    return {
      token,
      user: authUser,
    };
  },
};
