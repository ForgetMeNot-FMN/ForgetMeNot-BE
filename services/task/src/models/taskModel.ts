export interface Task {
  taskId: string;
  userId: string;
  title: string;
  description?: string;
  durationMinutes: number | null;
  startTime: Date | null;
  endTime?: Date | null; // duration eklenirse otomatik gelicek
  locationTrigger?: LocationTrigger;
  notificationEnabled?: boolean;
  notificationTime?: Date | null;
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: Date | null;
  rewardGranted?: boolean;
  rewardGrantedAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}

export type GeoEvent = "enter" | "exit";

export interface LocationTrigger {
  enabled: boolean;
  name?: string; // "Office"
  latitude: number;
  longitude: number;
  event: GeoEvent;
}

