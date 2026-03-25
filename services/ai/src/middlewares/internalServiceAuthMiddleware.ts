import { Request, Response, NextFunction } from "express";
import { envs } from "../utils/const";

const INTERNAL_SECRET_HEADER = "x-internal-service-secret";
const INTERNAL_NAME_HEADER = "x-internal-service-name";

export const internalServiceAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const serviceSecret = req.header(INTERNAL_SECRET_HEADER);
  const serviceName = req.header(INTERNAL_NAME_HEADER) ?? "unknown-service";

  if (!serviceSecret) {
    return res.status(401).json({
      success: false,
      message: "Internal service secret missing",
    });
  }

  if (serviceSecret !== envs.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({
      success: false,
      message: "Invalid internal service secret",
    });
  }

  req.headers["x-authenticated-service-name"] = serviceName;

  next();
};
