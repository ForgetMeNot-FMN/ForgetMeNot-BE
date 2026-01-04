import { Request, Response } from "express";
import { notificationService } from "../services/notificationService";


// Get User Notifications with Pagination
export async function getUserNotificationsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { limit, cursor } = req.query;

    const result = await notificationService.getUserNotifications(
      userId,
      limit ? Number(limit) : undefined,
      cursor as string
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

    // TODO:
    // 1. Notification DB'den çekilecek
    // 2. enabled kontrolü
    // 3. deliveryStatus kontrolü
    // 4. FCM ile gönderim
    // 5. deliveryStatus update

    await notificationService.dispatchNotification(notificationId);

    return res.json({
      success: true,
      message: "Dispatch endpoint reached (FCM not implemented yet)",
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

