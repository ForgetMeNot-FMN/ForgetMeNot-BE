import bcrypt from "bcryptjs";
import axios from "axios";
import admin from "firebase-admin";
import { firestore } from "../services/firebaseAdmin";
import {
  AuthResponse,
  AuthUser,
  LocalLoginRequest,
  LocalRegisterRequest,
} from "../models/authDtos";
import { tokenService } from "./tokenService";

const USERS_COLLECTION = "users";
const GARDEN_SERVICE_URL = process.env.GARDEN_SERVICE_URL!;

export const localAuthService = {
  async register(payload: LocalRegisterRequest): Promise<AuthResponse> {
    const { email, username, password } = payload;

    const existingSnap = await firestore
      .collection(USERS_COLLECTION)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      throw new Error("Email already registered");
    }

    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
      });
    } catch (err: any) {
      throw new Error(`Firebase Auth create error: ${err.message}`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = firebaseUser.uid;

    const newUser = {
      userId,
      email,
      username,
      password: hashedPassword,
      authProvider: "local",
      age: null,
      gender: null,
      allowNotification: true,
      permissions: {
        allowCalendar: true,
        allowKVKK: true,
        allowLocation: true,
      },
      created_at: new Date(),
    };

    await firestore.collection(USERS_COLLECTION).doc(userId).set(newUser);

    await axios.post(`${GARDEN_SERVICE_URL}/gardens/${userId}`);

    const authUser: AuthUser = {
      userId,
      email,
      username,
      authProvider: "local",
    };

    const token = tokenService.sign(authUser);
    return {
      token,
      user: authUser,
    };
  },

  async login(payload: LocalLoginRequest): Promise<AuthResponse> {
    const { email, password } = payload;

    const snap = await firestore
      .collection(USERS_COLLECTION)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new Error("Invalid email or password");
    }

    const user = snap.docs[0].data();

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    const authUser: AuthUser = {
      userId: user.userId,
      email: user.email,
      username: user.username,
      authProvider: "local",
    };

    const token = tokenService.sign(authUser);

    return {
      token,
      user: authUser,
    };
  },
};
