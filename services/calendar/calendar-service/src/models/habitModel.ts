export interface Habit {
  id: string;
  userId: string;
  title: string;
  notificationTime?: string | null;
  status: "active" | "paused" | "archived";
  schedule: HabitSchedule;
}

export type HabitSchedule = WeeklySchedule | IntervalSchedule | FixedSchedule;

export interface WeeklySchedule {
  type: "weekly";
  days: number[];
}

export interface IntervalSchedule {
  type: "interval";
  everyNDays: number;
  startDate: string;
}

export interface FixedSchedule {
  type: "fixed";
  dates: string[];
}
