import { Request, Response } from "express";
import { notificationService } from "../services/notificationService";
import { notificationDispatcher } from "../services/notificationDispatcher";
import { shouldSendNow } from "../services/notificationScheduleEvaluator";
import { logger } from "../utils/logger"


// Get User Notifications with Pagination
export async function getUserNotificationsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { limit, cursor, sourceType } = req.query;

    const result = await notificationService.getUserNotifications(
      userId,
      limit ? Number(limit) : undefined,
      cursor as string,
      sourceType as "HABIT" | "TASK" | "FLOWER" | "SYSTEM" | undefined
    );

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


// Get Single Notification
export async function getNotificationHandler(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;

    const notification = await notificationService.getNotification(notificationId);

    return res.json({ success: true, data: notification });

  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}


// Create Notification
export async function createNotificationHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const body = req.body;

    const notification = await notificationService.createNotification(userId, body);

    return res
      .status(201)
      .json({ success: true, data: notification });

  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


// Update Notification
export async function updateNotificationHandler(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;
    const body = req.body;

    const updated = await notificationService.updateNotification(notificationId, body);

    return res.json({ success: true, data: updated });

  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


// Enable Notification
export async function enableNotificationHandler(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;

    const result = await notificationService.enableNotification(notificationId);

    return res.json({ success: true, data: result });

  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


// Disable Notification
export async function disableNotificationHandler(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;

    const result = await notificationService.disableNotification(notificationId);

    return res.json({ success: true, data: result });

  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


// Soft Delete
export async function softDeleteNotificationHandler(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;

    const result = await notificationService.softDeleteNotification(notificationId);

    return res.json({ success: true, data: result });

  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


// Delete
export async function deleteNotificationHandler(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;

    const result = await notificationService.deleteNotification(notificationId);

    return res.json({ success: true, data: result });

  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


// Active Notifications
export async function getActiveNotificationsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const notifications = await notificationService.getActiveNotifications(userId);

    return res.json({ success: true, data: notifications });

  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


// Pending Scheduled (Scheduler ve Cloud Tasks için)
export async function getPendingScheduledNotificationsHandler(req: Request, res: Response) {
  try {
    const notifications = await notificationService.getPendingScheduledNotifications();

    return res.json({ success: true, data: notifications });

  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function dispatchNotificationHandler(req: Request, res: Response) {
  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "notificationId is required",
      });
    }

    await notificationService.dispatchNotification(notificationId);

    return res.json({
      success: true,
      message: "Notification dispatch task executed",
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

export async function dispatchScheduledNotificationsHandler(
  req: Request,
  res: Response
) {
  logger.info("Dispatch scheduled notifications triggered");

  const notifications =
    await notificationService.getPendingScheduledNotifications();

  let dispatchedCount = 0;
  for (const notification of notifications) {
    if (!notification.enabled) continue;
    if (notification.isDeleted) continue;
    if (notification.deliveryStatus === "SENT") continue;

    // zamanı geldiyse
    if (!shouldSendNow(notification)) continue;
    console.log("calling notification dispatcher");
    await notificationDispatcher.dispatch(notification.notificationId);
    dispatchedCount++;
  }

  res.status(200).json({
    processed: notifications.length,
    dispatched: dispatchedCount,
  });
}

export async function getTaskReminderTimesHandler(
  req: Request,
  res: Response
) {
  try {
    const { sourceId } = req.params;

    const reminders =
      await notificationService.getTaskReminderTimes(sourceId);

    return res.json({
      success: true,
      data: reminders,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function updateTaskReminderTimesHandler(
  req: Request,
  res: Response
) {
  try {
    const { sourceId } = req.params;
    const { reminderTimes } = req.body;

    const result =
      await notificationService.updateTaskReminderTimes(
        sourceId,
        reminderTimes
      );

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

// sourceId'ye göre tüm notificationları iptal et
export async function deleteBySourceIdHandler(req: Request, res: Response) {
  try {
    const { sourceId } = req.params;
    await notificationService.deleteNotificationsBySourceId(sourceId);
    return res.json({ success: true, message: "Notifications cancelled" });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function notificationClickedHandler(
  req: Request,
  res: Response
) {
  try {
    const { notificationId, generationSource } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "notificationId is required",
      });
    }

    await notificationService.markNotificationClicked(
      notificationId,
      generationSource
    );

    return res.json({
      success: true,
      message: "Notification click recorded",
    });

  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function notificationGenerationSourceHandler(
  req: Request,
  res: Response
) {
  try {
    const { notificationId, generationSource } = req.body;

    if (!notificationId || !generationSource) {
      return res.status(400).json({
        success: false,
        message: "notificationId and generationSource are required",
      });
    }

    await notificationService.setNotificationLogGenerationSource(
      notificationId,
      generationSource
    );

    return res.json({
      success: true,
      message: "Notification log generation source recorded",
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function notificationCompletedHandler(
  req: Request,
  res: Response
) {
  try {
    const { notificationId, sourceId, generationSource } = req.body;

    if (!notificationId && !sourceId) {
      return res.status(400).json({
        success: false,
        message: "notificationId or sourceId is required",
      });
    }

    if (notificationId) {
      await notificationService.markNotificationCompleted(
        notificationId,
        generationSource
      );
    } else {
      await notificationService.markNotificationsCompletedBySourceId(
        sourceId,
        generationSource
      );
    }

    return res.json({
      success: true,
      message: "Notification completion recorded",
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function notificationIgnoredHandler(
  req: Request,
  res: Response
) {
  try {
    const { notificationId, generationSource } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "notificationId is required",
      });
    }

    await notificationService.markNotificationIgnored(
      notificationId,
      generationSource
    );

    return res.json({
      success: true,
      message: "Notification ignore recorded",
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

