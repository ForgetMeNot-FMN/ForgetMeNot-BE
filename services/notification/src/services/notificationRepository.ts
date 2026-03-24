import { firestore } from "./firebaseAdmin";
import { AppNotification } from "../models/notificationModel";
import {
  notificationDto,
  UpdateNotificationDto,
} from "../models/notificationDTO";

const NOTIFICATION_COLLECTION = "notifications";

export const notificationRepository = {

  // Kullanıcının tüm notificationları
  async getNotificationsByUserId(userId: string, limit: number = 10, lastNotificationId?: string, sourceType?: "HABIT" | "TASK" | "FLOWER" | "SYSTEM"): Promise<{
  notifications: AppNotification[];
  nextCursor?: string;}> {

  // Uygulama içi pagination için
  let query = firestore
    .collection(NOTIFICATION_COLLECTION)
    .where("userId", "==", userId)
    .where("isDeleted", "==", false);

  // Source type kontrolü
  if (sourceType) {
    query = query.where("sourceType", "==", sourceType);
  }

  query = query
    .orderBy("createdAt", "desc")
    .limit(limit);

  // Cursor varsa devamından başla
  if (lastNotificationId) {
    const lastDoc = await firestore
      .collection(NOTIFICATION_COLLECTION)
      .doc(lastNotificationId)
      .get();

    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.get();

  const notifications = snapshot.docs.map(doc => ({
    ...(doc.data() as AppNotification),
    notificationId: doc.id,
  }));

  // Sonraki sayfa için cursor
  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  return {
    notifications,
    nextCursor: lastVisible ? lastVisible.id : undefined,
  };
},


  // Tek notification
  async getNotificationById(notificationId: string): Promise<AppNotification> {
    const doc = await firestore
      .collection(NOTIFICATION_COLLECTION)
      .doc(notificationId)
      .get();

    if (!doc.exists) {
      throw new Error("Notification not found");
    }

    return {
      ...(doc.data() as AppNotification),
      notificationId: doc.id,
    };
  },

  // Create
  async create(
    userId: string,
    data: notificationDto
  ): Promise<AppNotification> {
    const doc = firestore.collection(NOTIFICATION_COLLECTION).doc();

    const notification: AppNotification = {
      notificationId: doc.id,
      userId,

      deliveryStatus: "SCHEDULED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
      createdBySystem: false,

      ...data,
    };

    await doc.set(notification);
    return notification;
  },

  // Update
  async update(notificationId: string, data: UpdateNotificationDto) {
    await firestore
      .collection(NOTIFICATION_COLLECTION)
      .doc(notificationId)
      .update({
        ...data,
        updatedAt: new Date().toISOString(),
      });
  },

  // Enable
  async enable(notificationId: string) {
    await firestore
      .collection(NOTIFICATION_COLLECTION)
      .doc(notificationId)
      .update({
        enabled: true,
        updatedAt: new Date().toISOString(),
      });
  },

  // Disable
  async disable(notificationId: string) {
    await firestore
      .collection(NOTIFICATION_COLLECTION)
      .doc(notificationId)
      .update({
        enabled: false,
        updatedAt: new Date().toISOString(),
      });
  },

  // Delete
  async delete(notificationId: string) {
    await firestore
      .collection(NOTIFICATION_COLLECTION)
      .doc(notificationId)
      .delete();
  },

  // Soft Delete, belki silmek istemeyebiliriz tamamen diye
  async softDelete(notificationId: string) {
  await firestore.collection(NOTIFICATION_COLLECTION)
    .doc(notificationId)
    .update({
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    });
  },


  // Pending Notifications
  async getPendingScheduledNotifications(): Promise<AppNotification[]> {
    const snapshot = await firestore
      .collection(NOTIFICATION_COLLECTION)
      .where("deliveryStatus", "==", "SCHEDULED")
      .where("enabled", "==", true)
      .where("isDeleted", "==", false)
      .get();

    return snapshot.docs.map(doc => ({
      ...(doc.data() as AppNotification),
      notificationId: doc.id,
    }));
  },

  // Sadece Enable = true olanlar
  async getActiveNotifications(userId: string): Promise<AppNotification[]> {
  const snapshot = await firestore
    .collection(NOTIFICATION_COLLECTION)
    .where("userId", "==", userId)
    .where("enabled", "==", true)
    .where("isDeleted", "==", false)
    .get();

  return snapshot.docs.map(doc => ({
    ...(doc.data() as AppNotification),
    notificationId: doc.id,
  }));
},

async markAsSent(notificationId: string) {
  await firestore
    .collection(NOTIFICATION_COLLECTION)
    .doc(notificationId)
    .update({
      deliveryStatus: "SENT",
      sentAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
},

async markAsFailed(notificationId: string) {
  await firestore
    .collection(NOTIFICATION_COLLECTION)
    .doc(notificationId)
    .update({
      deliveryStatus: "FAILED",
      sentAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
},

async markAsProcessing(notificationId: string) {
  await firestore
    .collection(NOTIFICATION_COLLECTION)
    .doc(notificationId)
    .update({
      deliveryStatus: "PROCESSING",
      lastAttemptAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
},

async markAsScheduled(notificationId: string) {
  await firestore
    .collection(NOTIFICATION_COLLECTION)
    .doc(notificationId)
    .update({
      deliveryStatus: "SCHEDULED",
      lastAttemptAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
},

async getNotificationsBySourceId(sourceId: string): Promise<AppNotification[]> {
  const snapshot = await firestore
    .collection(NOTIFICATION_COLLECTION)
    .where("sourceId", "==", sourceId)
    .where("isDeleted", "==", false)
    .get();

  return snapshot.docs.map(doc => ({
    ...(doc.data() as AppNotification),
    notificationId: doc.id,
  }));
},

// sourceId'ye göre tüm notificationları soft-delete + cancel eder (habit/task delete için)
async deleteBySourceId(sourceId: string): Promise<void> {
  const snapshot = await firestore
    .collection(NOTIFICATION_COLLECTION)
    .where("sourceId", "==", sourceId)
    .where("isDeleted", "==", false)
    .get();

  if (snapshot.empty) return;

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      isDeleted: true,
      enabled: false,
      deliveryStatus: "CANCELLED",
      updatedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
},

async logNotificationClick(
  notificationId: string,
  userId: string,
  sourceType: "HABIT" | "TASK" | "FLOWER" | "SYSTEM",
  sourceId: string
) {
  await firestore
    .collection("notification_logs")
    .doc(notificationId)
    .set({
      notification_id: notificationId,
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      was_clicked: true,
      clicked_at: new Date().toISOString(),
    });
},

};
