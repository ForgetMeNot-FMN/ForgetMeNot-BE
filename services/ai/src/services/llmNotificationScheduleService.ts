export type PreferredTimeSlot = "morning" | "afternoon" | "evening";

export interface PreferredTimeSchedule {
  slot: PreferredTimeSlot;
  timeOfDay: string;
  hour: number;
}

const PREFERRED_TIME_TO_SCHEDULE: Record<PreferredTimeSlot, PreferredTimeSchedule> = {
  morning: {
    slot: "morning",
    timeOfDay: "09:00",
    hour: 9,
  },
  afternoon: {
    slot: "afternoon",
    timeOfDay: "14:00",
    hour: 14,
  },
  evening: {
    slot: "evening",
    timeOfDay: "20:00",
    hour: 20,
  },
};

class LlmNotificationScheduleService {
  normalizePreferredTime(value?: string | null): PreferredTimeSlot {
    const normalized = (value ?? "").trim().toLowerCase();

    if (normalized === "morning") return "morning";
    if (normalized === "afternoon") return "afternoon";
    return "evening";
  }

  resolvePreferredTime(value?: string | null): PreferredTimeSchedule {
    const slot = this.normalizePreferredTime(value);
    return PREFERRED_TIME_TO_SCHEDULE[slot];
  }

  shouldDispatchAtHour(
    value: string | null | undefined,
    hour: number,
  ): boolean {
    return this.resolvePreferredTime(value).hour === hour;
  }
}

export const llmNotificationScheduleService =
  new LlmNotificationScheduleService();
