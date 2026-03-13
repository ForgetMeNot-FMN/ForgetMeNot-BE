export interface ConflictItem {
  sourceType: "calendar_event" | "task";
  sourceId: string;
  provider?: "google" | "fmn";
  title?: string;
  startTime: string;
  endTime: string;
  checkConflict?: boolean;
}

export interface ConflictRecord {
  conflictId: string;
  userId: string;
  type: "google_vs_fmn" | "fmn_vs_fmn";
  itemKeys: string[];
  detectedAt: string;
  startsAt: string;
  endsAt: string;
  items: ConflictItem[];
  status: "open";
  updatedAt: string;
}
