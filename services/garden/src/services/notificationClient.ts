import { logger } from "../utils/logger";

const baseURL = process.env.NOTIFICATION_SERVICE_URL;

type ActiveNotification = {
  notificationId: string;
  sourceId?: string;
  enabled?: boolean;
};

function requireBaseUrl(): string {
  if (!baseURL) {
    throw new Error("NOTIFICATION_SERVICE_URL is required");
  }
  return baseURL;
}

async function httpJson<T = any>(
  url: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown
): Promise<T> {
  const fetchFn = (globalThis as any).fetch;
  if (!fetchFn) {
    throw new Error("fetch is not available in current runtime");
  }

  const response = await fetchFn(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notification service ${method} ${url} failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

async function getActiveNotifications(userId: string): Promise<ActiveNotification[]> {
  const response = await httpJson<{ data?: ActiveNotification[] }>(
    `${requireBaseUrl()}/notifications/user/${userId}/active`,
    "GET"
  );
  return response.data ?? [];
}

async function getNotificationIdBySourceId(userId: string, sourceId: string): Promise<string | null> {
  try {
    const active = await getActiveNotifications(userId);
    const found = active.find((n) => n.sourceId === sourceId && n.enabled !== false);
    if (!found?.notificationId) {
      return null;
    }
    return found.notificationId;
  } catch (error) {
    logger.warn("Active notification lookup via service failed", {
      userId,
      sourceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function createNotificationIfNotExists(params: {
  userId: string;
  sourceId: string;
  title: string;
}): Promise<"created" | "skipped_existing"> {
  const existingNotificationId = await getNotificationIdBySourceId(params.userId, params.sourceId);
  if (existingNotificationId) {
    logger.info("Garden notification skipped (already exists)", {
      userId: params.userId,
      sourceId: params.sourceId,
      notificationId: existingNotificationId,
    });
    return "skipped_existing";
  }

  await httpJson(
    `${requireBaseUrl()}/notifications/${params.userId}`,
    "POST",
    {
      title: params.title,
      body: params.title,
      sourceType: "FLOWER",
      sourceId: params.sourceId,
      type: "REMINDER",
      priority: "normal",
      enabled: true,
      scheduleType: "IMMEDIATE",
      timezone: "UTC",
      createdBySystem: true,
    }
  );

  logger.info("Garden notification created", {
    userId: params.userId,
    sourceId: params.sourceId,
    title: params.title,
  });
  return "created";
}

// Şimdilik notification immediate olduğu için cancel etmek çok gerekli değil, ama ileride schedule eklenmesi gerekirse lazım olabilir diye ekledim
export async function cancelNotificationBySourceId(params: {
  userId: string;
  sourceId: string;
}) {
  const notificationId = await getNotificationIdBySourceId(params.userId, params.sourceId);
  if (!notificationId) {
    logger.info("Garden notification cancel skipped (not found)", {
      userId: params.userId,
      sourceId: params.sourceId,
    });
    return;
  }

  await httpJson(
    `${requireBaseUrl()}/notifications/${notificationId}`,
    "PATCH",
    {
      enabled: false,
      deliveryStatus: "CANCELLED",
    }
  );

  logger.info("Garden notification cancelled", {
    userId: params.userId,
    sourceId: params.sourceId,
    notificationId,
  });
}
