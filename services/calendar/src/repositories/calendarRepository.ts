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
