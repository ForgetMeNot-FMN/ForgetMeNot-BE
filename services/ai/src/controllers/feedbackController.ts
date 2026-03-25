import { Request, Response } from "express";

export async function trackNotificationFeedbackHandler(req: Request, res: Response) {
  return res.status(501).json({
    success: false,
    message: "Feedback tracking is not implemented yet",
    data: {
      received: Boolean(req.body),
    },
  });
}
