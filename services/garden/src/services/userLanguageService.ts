import { firestore } from "./firebaseAdmin";
import { normalizeLocale, SupportedLocale } from "../utils/localization";

class UserLanguageService {
  async getLocale(userId?: string, requestedLocale?: unknown): Promise<SupportedLocale> {
    if (requestedLocale) return normalizeLocale(requestedLocale);
    if (!userId) return "en";

    const userDoc = await firestore.collection("users").doc(userId).get();
    return normalizeLocale(userDoc.data()?.userLanguage);
  }
}

export const userLanguageService = new UserLanguageService();
