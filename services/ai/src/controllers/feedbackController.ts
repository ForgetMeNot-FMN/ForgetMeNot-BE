import { Request, Response } from "express";

export async function trackNotificationFeedbackHandler(req: Request, res: Response) {
  const { notificationId, userId, outcome } = req.body;

  if (!notificationId || !userId || !outcome) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  // şimdilik sadece log
  console.log("Notification feedback:", {
    notificationId,
    userId,
    outcome,
  });

  return res.json({
    success: true,
    message: "Feedback received",
  });
}
