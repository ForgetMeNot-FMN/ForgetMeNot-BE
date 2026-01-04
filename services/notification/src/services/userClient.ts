import { firestore } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const USERS_COLLECTION = "users";

export const userClient = {

  // Get User
  async getUserById(userId: string) {
    const doc = await firestore
      .collection(USERS_COLLECTION)
      .doc(userId)
      .get();

    if (!doc.exists) {
      throw new Error("User not found");
    }

    return {
      userId: doc.id,
      ...doc.data(),
    };
  },

  // İzin kontrolü
  async canReceiveNotifications(userId: string): Promise<boolean> {
    const doc = await firestore
      .collection(USERS_COLLECTION)
      .doc(userId)
      .get();

    if (!doc.exists) return false;

    const data = doc.data() as any;

    return data.allowNotification === true;
  },

  async getUserFcmTokens(userId: string): Promise<string[]> {
  const doc = await firestore
    .collection(USERS_COLLECTION)
    .doc(userId)
    .get();

  if (!doc.exists) return [];
  const data = doc.data() as any;
  return data.fcmTokens ?? [];
},

async removeFcmTokens(
    userId: string,
    tokensToRemove: string[]
  ): Promise<void> {
    if (!tokensToRemove.length) return;

    await firestore
      .collection(USERS_COLLECTION)
      .doc(userId)
      .update({
        fcmTokens: FieldValue.arrayRemove(...tokensToRemove),
      });
    }

};
