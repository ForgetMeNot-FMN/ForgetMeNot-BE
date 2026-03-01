import { Request, Response, NextFunction } from "express";
import { envs } from "../utils/const";

export function internalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers["x-internal-token"];

  if (!token || token !== envs.INTERNAL_SERVICE_TOKEN) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized internal request",
    });
  }

  next();
}
