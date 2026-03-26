import dayjs from "dayjs";
import { calendarAccountRepository } from "../repositories/calendarAccountRepository";
import { calendarEventRepository } from "../repositories/calendarEventRepository";
import { googleCalendarService } from "./googleCalendarService";
import { googleTokenService } from "./googleTokenService";
import { logger } from "../utils/logger";

const DEFAULT_PAST_DAYS = 1;
const DEFAULT_FUTURE_DAYS = 30;

export const syncJobService = {
  async runAllUsersSync(from?: string, to?: string) {
    const rangeFrom =
      from ?? dayjs().subtract(DEFAULT_PAST_DAYS, "day").toISOString();
    const rangeTo =
      to ?? dayjs().add(DEFAULT_FUTURE_DAYS, "day").toISOString();

    const accounts = await calendarAccountRepository.getAllGoogleAccounts();
    let syncedAccounts = 0;
    let failedAccounts = 0;
    let totalEventsUpserted = 0;

    for (const account of accounts) {
      try {
        const accessToken = await googleTokenService.getValidAccessToken(account);
        const events = await googleCalendarService.getEventsByDateRange(
          accessToken,
          account.userId,
          rangeFrom,
          rangeTo,
        );
        const result = await calendarEventRepository.upsertCalendarEvents(events);

        syncedAccounts += 1;
        totalEventsUpserted += result.insertedCount + result.updatedCount;

        logger.info("Calendar account synced", {
          userId: account.userId,
          syncedEvents: events.length,
          insertedCount: result.insertedCount,
          updatedCount: result.updatedCount,
          from: rangeFrom,
          to: rangeTo,
        });
      } catch (error) {
        failedAccounts += 1;
        logger.error("Failed to sync calendar account", {
          userId: account.userId,
          error,
        });
      }
    }

    return {
      totalAccounts: accounts.length,
      syncedAccounts,
      failedAccounts,
      totalEventsUpserted,
      from: rangeFrom,
      to: rangeTo,
    };
  },
};
