import { firestore } from "../services/firebaseAdmin";
import { InternalCalendarEvent } from "../models/internalCalendarModel";

const CALENDAR_EVENTS_COLLECTION = "calendar_events";

export const calendarEventRepository = {
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

    return {
      insertedCount,
      updatedCount,
    };
  },
};
