import { firestore } from "../services/firebaseAdmin";
import { CalendarAccount } from "../models/calendarAccountModel";

const CALENDAR_ACCOUNTS_COLLECTION = "calendarAccounts";

export const calendarAccountRepository = {
  async upsertCalendarAccount(
    userId: string,
    data: Omit<CalendarAccount, "userId" | "createdAt" | "updatedAt" | "nextSyncToken">,
  ): Promise<void> {
    const docId = `google_${userId}`;
    const ref = firestore.collection(CALENDAR_ACCOUNTS_COLLECTION).doc(docId);
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data() as CalendarAccount) : null;

    // refreshToken ilk yetkilendirmede gelir, sonraki isteklerde gelmeyebilir
    // mevcut refreshToken'ı koruyoruz
    const refreshToken = data.refreshToken ?? existing?.refreshToken ?? null;

    await ref.set(
      {
        userId,
        provider: data.provider,
        accessToken: data.accessToken,
        refreshToken,
        expiryDate: data.expiryDate,
        nextSyncToken: existing?.nextSyncToken ?? null,
        scopes: data.scopes,
        updatedAt: new Date(),
        createdAt: existing?.createdAt ?? new Date(),
      },
      { merge: true },
    );
  },
};
