import { firestore } from "../services/firebaseAdmin";
import { CalendarAccount } from "../models/calendarAccountModel";

const CALENDAR_ACCOUNTS_COLLECTION = "calendar_accounts";

export const calendarAccountRepository = {
  async getAllGoogleAccounts(): Promise<CalendarAccount[]> {
    const snapshot = await firestore
      .collection(CALENDAR_ACCOUNTS_COLLECTION)
      .where("provider", "==", "google")
      .get();

    return snapshot.docs.map((doc) => doc.data() as CalendarAccount);
  },

  async updateTokens(
    userId: string,
    accessToken: string,
    expiryDate: number | null,
  ) {
    const docId = `google_${userId}`;
    await firestore.collection(CALENDAR_ACCOUNTS_COLLECTION).doc(docId).set(
      {
        accessToken,
        expiryDate,
        updatedAt: new Date(),
      },
      { merge: true },
    );
  },
};
