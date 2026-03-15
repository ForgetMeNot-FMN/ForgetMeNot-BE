import { firestore } from "../services/firebaseAdmin";
import { ConflictRecord } from "../models/conflictModel";
import { InternalCalendarEvent } from "../models/internalCalendarModel";

const CALENDAR_EVENTS_COLLECTION = "calendar_events";
const CALENDAR_CONFLICTS_COLLECTION = "calendar_conflicts";

export const calendarRepository = {
  async upsertCalendarEvents(events: InternalCalendarEvent[]) {
    let insertedCount = 0;
    let updatedCount = 0;

    await Promise.all(
      events.map(async (event) => {
        const ref = firestore.collection(CALENDAR_EVENTS_COLLECTION).doc(event.id);
        const existing = await ref.get();

        if (existing.exists) {
          updatedCount += 1;
        } else {
          insertedCount += 1;
        }

        await ref.set(event, { merge: true });
      }),
    );

    return { insertedCount, updatedCount };
  },

  async getCalendarEventsByDateRange(userId: string, from: string, to: string) {
    const snapshot = await firestore
      .collection(CALENDAR_EVENTS_COLLECTION)
      .where("userId", "==", userId)
      .where("startTime", "<", to)
      .where("endTime", ">", from)
      .get();

    return snapshot.docs.map((doc) => doc.data() as InternalCalendarEvent);
  },

  async getConflictById(conflictId: string) {
    const doc = await firestore
      .collection(CALENDAR_CONFLICTS_COLLECTION)
      .doc(conflictId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as ConflictRecord;
  },

  async updateConflictStatus(
    conflictId: string,
    status: ConflictRecord["status"],
  ) {
    await firestore
      .collection(CALENDAR_CONFLICTS_COLLECTION)
      .doc(conflictId)
      .set(
        {
          status,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
  },

  async updateCheckConflict(eventId: string, checkConflict: boolean) {
    await firestore
      .collection(CALENDAR_EVENTS_COLLECTION)
      .doc(eventId)
      .set(
        {
          checkConflict,
          lastSyncedAt: new Date(),
        },
        { merge: true },
      );
  },

  async updateCheckConflictByTaskId(taskId: string, checkConflict: boolean) {
    const snapshot = await firestore
      .collection(CALENDAR_EVENTS_COLLECTION)
      .where("taskId", "==", taskId)
      .get();

    await Promise.all(
      snapshot.docs.map((doc) =>
        doc.ref.set(
          {
            checkConflict,
            lastSyncedAt: new Date(),
          },
          { merge: true },
        ),
      ),
    );

    return snapshot.size;
  },

  async updateCheckConflictByHabitId(habitId: string, checkConflict: boolean) {
    const snapshot = await firestore
      .collection(CALENDAR_EVENTS_COLLECTION)
      .where("habitId", "==", habitId)
      .get();

    await Promise.all(
      snapshot.docs.map((doc) =>
        doc.ref.set(
          {
            checkConflict,
            lastSyncedAt: new Date(),
          },
          { merge: true },
        ),
      ),
    );

    return snapshot.size;
  },

  async deleteCalendarEventsByTaskId(taskId: string) {
    const snapshot = await firestore
      .collection(CALENDAR_EVENTS_COLLECTION)
      .where("taskId", "==", taskId)
      .get();

    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    return snapshot.size;
  },

  async deleteCalendarEventsByHabitId(habitId: string) {
    const snapshot = await firestore
      .collection(CALENDAR_EVENTS_COLLECTION)
      .where("habitId", "==", habitId)
      .get();

    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    return snapshot.size;
  },

  async saveConflicts(conflicts: ConflictRecord[]) {
    await Promise.all(
      conflicts.map((conflict) =>
        firestore
          .collection(CALENDAR_CONFLICTS_COLLECTION)
          .doc(conflict.conflictId)
          .set(conflict),
      ),
    );
  },
};
