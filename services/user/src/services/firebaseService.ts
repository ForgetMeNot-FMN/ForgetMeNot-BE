import { firestore } from "./firebaseAdmin";
import { User } from "../models/userModel";
import { FieldValue } from "firebase-admin/firestore";

const USERS_COLLECTION = "users";

export const userRepository = {
  async getById(userId: string): Promise<User | null> {
    const doc = await firestore.collection(USERS_COLLECTION).doc(userId).get();
    return doc.exists ? (doc.data() as User) : null;
  },

  async getByEmail(email: string): Promise<User | null> {
    const snapshot = await firestore
      .collection(USERS_COLLECTION)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    return snapshot.docs[0].data() as User;
  },

  async create(userId: string, data: Omit<User, "userId">): Promise<User> {
    const user: User = {
      userId,
      ...data,
    };

    await firestore.collection(USERS_COLLECTION).doc(userId).set(user);
    return user;
  },

  async update(userId: string, data: Partial<User>) {
    await firestore.collection(USERS_COLLECTION).doc(userId).update(data);
  },

  async delete(userId: string) {
    await firestore.collection(USERS_COLLECTION).doc(userId).delete();
  },

  async addFcmToken(userId: string, token: string) {
    await firestore.collection(USERS_COLLECTION).doc(userId).update({
      fcmTokens: FieldValue.arrayUnion(token),
    });
  }
};
