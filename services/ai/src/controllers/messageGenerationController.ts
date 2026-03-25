import { Request, Response } from "express";

export async function generateNotificationMessageHandler(req: Request, res: Response) {
  return res.status(501).json({
    success: false,
    message: "Message generation is not implemented yet",
    data: {
      received: Boolean(req.body),
    },
  });
}
