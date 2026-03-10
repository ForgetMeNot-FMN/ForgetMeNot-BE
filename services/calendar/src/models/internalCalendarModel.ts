export interface InternalEvent {
  userId: string;
  provider: "google";
  externalEventId: string;
  taskId?: string;
  habitId?: string;
  startTime: string;
  endTime: string;
  checkConflict: boolean;
  lastSyncedAt: Date;
}