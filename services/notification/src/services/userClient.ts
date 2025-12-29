import { firestore } from "./firebaseAdmin";

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
  }
};
