export interface InternalCalendarEvent {
  id: string;
  userId: string;
  provider: "google";
  externalEventId: string;
  title?: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  status?: string;
  checkConflict: boolean;
  lastSyncedAt: Date;
}
