import { Request, Response } from "express";

export function healthHandler(_req: Request, res: Response) {
  return res.json({
    success: true,
    service: "awards-create-get",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
