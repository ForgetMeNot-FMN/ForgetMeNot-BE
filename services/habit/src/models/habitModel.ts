export interface Habit {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate: Date;
  schedule: HabitSchedule;
  status: "active" | "paused" | "archived";
  locationTrigger?: LocationTrigger;
  type: "count" | "duration" | "boolean";
  targetValue?: number; // count veya duration için
  currentStreak: number;
  longestStreak: number;
  createdAt: Date;
  updatedAt: Date;
}

export type HabitSchedule = WeeklySchedule | IntervalSchedule | FixedSchedule;

export interface WeeklySchedule {
  type: "weekly";
  days: number[]; // dayjs format: 0 (Pazar) - 6 (Cumartesi)
}

export interface IntervalSchedule {
  type: "interval";
  everyNDays: number; // 1, 2, 14, 30...
  startDate: string; // YYYY-MM-DD
}

export interface FixedSchedule {
  type: "fixed";
  dates: string[]; // YYYY-MM-DD
}

export interface HabitCompletion {
  id: string;
  userId: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  createdAt: Date;
  value?: number; // count veya duration için
}

export type GeoEvent = "enter" | "exit";

export interface LocationTrigger {
  enabled: boolean;
  name?: string; // "Office"
  latitude: number;
  longitude: number;
  event: GeoEvent;
}

export interface habitDTO {
  id?: string;
  title: string;
  description?: string;
  startDate: Date;
  schedule?: HabitSchedule;
  type: "count" | "duration" | "boolean";
  targetValue?: number;
  locationTrigger?: LocationTrigger;
  status: "active" | "paused" | "archived";
}

// Example Task model for future reference
// export interface Task {
//   id: string;
//   userId: string;

//   title: string;
//   description?: string;

//   dueDate?: Date; // deadline
//   remindAt?: Date; // hatırlatma bildirimi zamanı

//   locationTrigger?: LocationTrigger;

//   status: "pending" | "completed" | "cancelled";

//   completedAt?: Date;

//   createdAt: Date;
//   updatedAt: Date;
// }
