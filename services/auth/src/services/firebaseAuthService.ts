import admin from "firebase-admin";
import axios from "axios";
import { firestore } from "../services/firebaseAdmin";
import { tokenService } from "./tokenService";
import { AuthResponse, AuthUser } from "../models/authDtos";
import { logger } from "../utils/logger";
import { envs } from "../utils/const";

const USERS_COLLECTION = "users";
const GARDEN_SERVICE_URL = envs.GARDEN_SERVICE_URL;

export const firebaseAuthService = {
  async loginWithFirebase(idToken: string): Promise<AuthResponse> {
    //Token doğrula
    const decoded = await admin.auth().verifyIdToken(idToken);

    const userId = decoded.uid;
    const email = decoded.email!;
    const username = decoded.name || email.split("@")[0];

    const userRef = firestore.collection(USERS_COLLECTION).doc(userId);
    logger.info("Firebase ID Token verified", { userId, email });

    const snap = await userRef.get();

    if (!snap.exists) {
      //İlk kez loginle user oluştur
      await userRef.set({
        userId,
        email,
        username,
        authProvider: decoded.firebase.sign_in_provider,
        age: null,
        gender: null,
        allowNotification: false,
        permissions: {
          allowCalendar: false,
          allowKVKK: false,
          allowLocation: false,
        },
        created_at: new Date(),
      });
      logger.info("New user created in Firestore", { userId, email });
      try {
        logger.info("Creating garden for new user", { userId });
        const res = await axios.post(`${GARDEN_SERVICE_URL}/gardens/${userId}`);
        logger.info("Garden created:", res.status);
      } catch (err: any) {
        logger.error("Error creating garden for new user", { userId, error: err.message } );
      }
    }

    const authUser: AuthUser = {
      userId,
      email,
      username,
      authProvider: decoded.firebase.sign_in_provider,
    };
    const token = tokenService.sign(authUser);
    return {
      token,
      user: authUser,
    };
  },
};
