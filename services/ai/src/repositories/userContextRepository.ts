import { firestore } from "../services/firebaseAdmin";
import {
  HabitCompletionRecord,
  HabitRecord,
  NotificationRecord,
  NotificationLogRecord,
  TaskRecord,
  UserRecord,
} from "../models/userContextModel";

const USERS_COLLECTION = "users";
const HABITS_COLLECTION = "habits";
const TASKS_COLLECTION = "tasks";
const HABIT_COMPLETIONS_COLLECTION = "habit_completions";
const NOTIFICATION_LOGS_COLLECTION = "notification_logs";
const NOTIFICATIONS_COLLECTION = "notifications";

export const userContextRepository = {
  async getUserById(userId: string): Promise<UserRecord | null> {
    const doc = await firestore.collection(USERS_COLLECTION).doc(userId).get();
    return doc.exists ? ({ userId: doc.id, ...doc.data() } as UserRecord) : null;
  },

  async getHabitsByUserId(userId: string): Promise<HabitRecord[]> {
    const snap = await firestore
      .collection(HABITS_COLLECTION)
      .where("userId", "==", userId)
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HabitRecord));
  },

  async getTasksByUserId(userId: string): Promise<TaskRecord[]> {
    const snap = await firestore
      .collection(TASKS_COLLECTION)
      .where("userId", "==", userId)
      .get();

    return snap.docs.map((doc) => ({ taskId: doc.id, ...doc.data() } as TaskRecord));
  },

  async getHabitCompletionsByUserId(
    userId: string,
    from: string,
    to: string,
  ): Promise<HabitCompletionRecord[]> {
    const snap = await firestore
      .collection(HABIT_COMPLETIONS_COLLECTION)
      .where("userId", "==", userId)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as HabitCompletionRecord));
  },

  async getNotificationLogsByUserId(
    userId: string,
  ): Promise<NotificationLogRecord[]> {
    const snap = await firestore
      .collection(NOTIFICATION_LOGS_COLLECTION)
      .where("user_id", "==", userId)
      .orderBy("last_feedback_at", "desc")
      .limit(20)
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as NotificationLogRecord));
  },

  async getRecentNotificationsByUserId(
    userId: string,
  ): Promise<NotificationRecord[]> {
    const snap = await firestore
      .collection(NOTIFICATIONS_COLLECTION)
      .where("userId", "==", userId)
      .where("isDeleted", "==", false)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    return snap.docs.map((doc) => ({
      notificationId: doc.id,
      ...doc.data(),
    } as NotificationRecord));
  },

  async upsertIgnoredNotificationLog(params: {
    notificationId: string;
    userId: string;
    sourceType: "HABIT" | "TASK";
    sourceId: string;
    generationSource: "LLM" | "SYSTEM" | "UNKNOWN";
  }) {
    const timestamp = new Date().toISOString();

    await firestore
      .collection(NOTIFICATION_LOGS_COLLECTION)
      .doc(params.notificationId)
      .set(
        {
          notification_id: params.notificationId,
          user_id: params.userId,
          source_type: params.sourceType,
          source_id: params.sourceId,
          generation_source: params.generationSource,
          was_clicked: false,
          was_completed: false,
          was_ignored: true,
          ignored_at: timestamp,
          last_feedback_event: "IGNORED",
          last_feedback_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
        },
        { merge: true },
      );
  },

  async upsertCompletedNotificationLog(params: {
    notificationId: string;
    userId: string;
    sourceType: "HABIT" | "TASK";
    sourceId: string;
    generationSource: "LLM" | "SYSTEM" | "UNKNOWN";
  }) {
    const timestamp = new Date().toISOString();

    await firestore
      .collection(NOTIFICATION_LOGS_COLLECTION)
      .doc(params.notificationId)
      .set(
        {
          notification_id: params.notificationId,
          user_id: params.userId,
          source_type: params.sourceType,
          source_id: params.sourceId,
          generation_source: params.generationSource,
          was_clicked: false,
          was_completed: true,
          completed_at: timestamp,
          was_ignored: false,
          last_feedback_event: "COMPLETED",
          last_feedback_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
        },
        { merge: true },
      );
  },
};
