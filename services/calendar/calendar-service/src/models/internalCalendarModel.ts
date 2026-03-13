export interface InternalCalendarEvent {
  id: string;
  userId: string;
  provider: "google" | "fmn";
  externalEventId?: string;
  taskId?: string;
  habitId?: string;
  title?: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  status?: string;
  checkConflict: boolean;
  lastSyncedAt: Date;
}
