export interface Task {
  taskId: string;
  userId: string;
  title: string;
  description?: string;
  durationMinutes: number | null;
  startTime: Date | null;
  endTime?: Date | null; // duration eklenirse otomatik gelicek
  startDate?: string | null; // YYYY-MM-DD ! ekledim ama hiç kullanmıyorum kodda
  endDate?: string | null; // YYYY-MM-DD ! ekledim ama hiç kullanmıyorum kodda
  locationTrigger?: LocationTrigger;
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

