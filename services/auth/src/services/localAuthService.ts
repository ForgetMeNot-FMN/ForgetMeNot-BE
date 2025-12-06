import bcrypt from "bcryptjs";
import axios from "axios";
import { firestore } from "../services/firebaseAdmin";
import { AuthResponse, AuthUser, LocalLoginRequest, LocalRegisterRequest } from "../models/authDtos";
import { tokenService } from "./tokenService";

const USERS_COLLECTION = "users";
const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRef = firestore.collection(USERS_COLLECTION).doc();
    const userId = userRef.id;

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

    await userRef.set(newUser);

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

//WE CAN ADD:
// await admin.auth().createUser({
//   email: payload.email,
//   password: payload.password,
// });
// This will create a user in Firebase Authentication as well for better integration with Firebase services.
// However, we need to handle synchronization between Firestore and Firebase Auth for updates and deletions.
// And it can also cause auth limit issues if we have too many users.