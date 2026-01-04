import { AppNotification } from "../models/notificationModel";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone"
import { CronExpressionParser } from "cron-parser";


export function shouldSendNow(notification: AppNotification): boolean {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const now = dayjs();

  switch (notification.scheduleType) {
    case "ONCE":
      return shouldSendOnce(notification, now);

    case "IMMEDIATE":
      return true;

    case "CRON":
      return shouldSendCron(notification, now);

    case "RECURRING":
      return shouldSendRecurring(notification, now);
      
    default:
      return false;
  }
}

function shouldSendOnce(
  notification: AppNotification,
  now: dayjs.Dayjs
): boolean {
  if (!notification.scheduledAt) return false;

  const scheduledTime = dayjs(notification.scheduledAt).tz(
    notification.timezone
  );

  // zamanı geçtiyse ve daha önce gönderilmediyse
  return (
    now.isAfter(scheduledTime) &&
    notification.deliveryStatus !== "SENT"
  );
}

function shouldSendRecurring(
  notification: AppNotification,
  now: dayjs.Dayjs
): boolean {
  const rule = notification.repeatRule;
  if (!rule) return false;

  // WEEKLY ise gün kontrolü
  if (rule.interval === "weekly") {
    if (!rule.daysOfWeek?.includes(now.day())) {
      return false;
    }
  }

  // Saat kontrolü
  for (const time of rule.timesOfDay) {
    const [hour, minute] = time.split(":").map(Number);

    const scheduledTime = now
      .hour(hour)
      .minute(minute)
      .second(0);

    // +-1 dakika tolerans
    if (
      now.isAfter(scheduledTime) &&
      now.diff(scheduledTime, "minute") < 1
    ) {
      return true;
    }
  }

  return false;
}


function shouldSendCron(
  notification: AppNotification,
  now: dayjs.Dayjs
): boolean {
  if (!notification.cronExpression) return false;

  try {
    const interval = CronExpressionParser.parse(
      notification.cronExpression,
      {
        tz: notification.timezone,
      }
    );

    const prev = dayjs(interval.prev().toDate());
    const diff = now.diff(prev, "minute");

    // Son cron çalışması 1 dk içindeyse gönder
    return diff >= 0 && diff < 1;
  } catch (err) {
    return false;
  }
}

