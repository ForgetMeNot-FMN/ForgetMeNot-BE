import { Router } from "express";
import {
  getUserNotificationsHandler,
  getNotificationHandler,
  createNotificationHandler,
  updateNotificationHandler,
  deleteNotificationHandler,
  softDeleteNotificationHandler,
  enableNotificationHandler,
  disableNotificationHandler,
  getActiveNotificationsHandler,
  getPendingScheduledNotificationsHandler,
  dispatchNotificationHandler
} from "../controllers/notificationController";

const router = Router();

// INTERNAL (Front end kullanmayacak!)- Cloud Tasks için 
router.post("/internal/notifications/dispatch", dispatchNotificationHandler);

// Get notifications of a user
router.get("/user/:userId", getUserNotificationsHandler);

// Get active notifications of a user
router.get("/user/:userId/active", getActiveNotificationsHandler);

// Get pending notifications (scheduler / cloud tasks için)
router.get("/pending/scheduled", getPendingScheduledNotificationsHandler);

// Get a single notification
router.get("/:notificationId", getNotificationHandler);

// Create 
router.post("/:userId", createNotificationHandler);

// Update 
router.patch("/:notificationId", updateNotificationHandler);

// Enable notification
router.patch("/:notificationId/enable", enableNotificationHandler);

// Disable notification
router.patch("/:notificationId/disable", disableNotificationHandler);

// Soft delete 
router.delete("/:notificationId/soft", softDeleteNotificationHandler);

// Delete 
router.delete("/:notificationId", deleteNotificationHandler);

export default router;
