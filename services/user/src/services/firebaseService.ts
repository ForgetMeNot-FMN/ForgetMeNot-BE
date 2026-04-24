import { firestore } from "./firebaseAdmin";
import { User } from "../models/userModel";
import { FieldValue, DocumentReference } from "firebase-admin/firestore";

const USERS_COLLECTION = "users";
const GARDENS_COLLECTION = "gardens";
const HABITS_COLLECTION = "habits";
const HABIT_COMPLETIONS_COLLECTION = "habit_completions";
const TASKS_COLLECTION = "tasks";
const AWARDS_COLLECTION = "awards";
const CHAT_SESSIONS_COLLECTION = "chat_sessions";
const NOTIFICATIONS_COLLECTION = "notifications";
const NOTIFICATION_LOGS_COLLECTION = "notification_logs";
const CALENDAR_EVENTS_COLLECTION = "calendar_events";
const CALENDAR_CONFLICTS_COLLECTION = "calendar_conflicts";
const CALENDAR_ACCOUNTS_COLLECTION = "calendar_accounts";

const BATCH_SIZE = 100;

async function commitInBatches(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = firestore.batch();
    refs.slice(i, i + BATCH_SIZE).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

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

  async deleteAllUserData(userId: string): Promise<void> {
    const gardenRef = firestore.collection(GARDENS_COLLECTION).doc(userId);
    const chatRef = firestore.collection(CHAT_SESSIONS_COLLECTION).doc(userId);

    const [
      flowersSnap,
      characterItemsSnap,
      habitsSnap,
      habitCompletionsSnap,
      tasksSnap,
      awardsSnap,
      chatSessionsSnap,
      notificationsSnap,
      notificationLogsSnap,
      calendarEventsSnap,
      calendarConflictsSnap,
    ] = await Promise.all([
      gardenRef.collection("flowers").get(),
      gardenRef.collection("character_items").get(),
      firestore.collection(HABITS_COLLECTION).where("userId", "==", userId).get(),
      firestore.collection(HABIT_COMPLETIONS_COLLECTION).where("userId", "==", userId).get(),
      firestore.collection(TASKS_COLLECTION).where("userId", "==", userId).get(),
      firestore.collection(AWARDS_COLLECTION).where("userId", "==", userId).get(),
      chatRef.collection("sessions").get(),
      firestore.collection(NOTIFICATIONS_COLLECTION).where("userId", "==", userId).get(),
      firestore.collection(NOTIFICATION_LOGS_COLLECTION).where("user_id", "==", userId).get(),
      firestore.collection(CALENDAR_EVENTS_COLLECTION).where("userId", "==", userId).get(),
      firestore.collection(CALENDAR_CONFLICTS_COLLECTION).where("userId", "==", userId).get(),
    ]);

    const refs: DocumentReference[] = [
      firestore.collection(USERS_COLLECTION).doc(userId),
      gardenRef,
      chatRef,
      firestore.collection(CALENDAR_ACCOUNTS_COLLECTION).doc(`google_${userId}`),
      ...flowersSnap.docs.map((d) => d.ref),
      ...characterItemsSnap.docs.map((d) => d.ref),
      ...habitsSnap.docs.map((d) => d.ref),
      ...habitCompletionsSnap.docs.map((d) => d.ref),
      ...tasksSnap.docs.map((d) => d.ref),
      ...awardsSnap.docs.map((d) => d.ref),
      ...chatSessionsSnap.docs.map((d) => d.ref),
      ...notificationsSnap.docs.map((d) => d.ref),
      ...notificationLogsSnap.docs.map((d) => d.ref),
      ...calendarEventsSnap.docs.map((d) => d.ref),
      ...calendarConflictsSnap.docs.map((d) => d.ref),
    ];

    await commitInBatches(refs);
  },

  async addFcmToken(userId: string, token: string) {
    await firestore.collection(USERS_COLLECTION).doc(userId).update({
      fcmTokens: FieldValue.arrayUnion(token),
    });
  }
};
