import { llmNotificationScheduleService } from "../../src/services/llmNotificationScheduleService";

describe("llmNotificationScheduleService", () => {
  it("maps morning to 09:00", () => {
    expect(
      llmNotificationScheduleService.resolvePreferredTime("morning"),
    ).toEqual({
      slot: "morning",
      timeOfDay: "09:00",
      hour: 9,
    });
  });

  it("maps afternoon to 14:00", () => {
    expect(
      llmNotificationScheduleService.resolvePreferredTime("afternoon"),
    ).toEqual({
      slot: "afternoon",
      timeOfDay: "14:00",
      hour: 14,
    });
  });

  it("falls back unknown values to evening", () => {
    expect(
      llmNotificationScheduleService.resolvePreferredTime("night"),
    ).toEqual({
      slot: "evening",
      timeOfDay: "20:00",
      hour: 20,
    });
  });

  it("matches only the preferred hour", () => {
    expect(
      llmNotificationScheduleService.shouldDispatchAtHour("morning", 9),
    ).toBe(true);
    expect(
      llmNotificationScheduleService.shouldDispatchAtHour("morning", 14),
    ).toBe(false);
  });
});
