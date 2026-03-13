import { Request, Response } from "express";
import { firebaseAuthService } from "../services/firebaseAuthService";
import { googleCalendarAuthService } from "../services/googleCalendarAuthService";
import { logger } from "../utils/logger";

export const authController = {
  async firebaseLogin(req: Request, res: Response) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "idToken is required",
        });
      }
      const data = await firebaseAuthService.loginWithFirebase(idToken);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        message: err.message,
      });
    }
  },

  async googleLogin(req: Request, res: Response) {
    try {
      const { idToken, serverAuthCode, googleAccessToken, scopes } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "idToken is required",
        });
      }

      const data = await firebaseAuthService.loginWithFirebase(idToken);

      // serverAuthCode varsa Google Calendar'ı bağla
      // Login başarısını etkilememesi için ayrı try/catch içinde
      if (serverAuthCode) {
        try {
          await googleCalendarAuthService.linkGoogleCalendar({
            userId: data.user.userId,
            serverAuthCode,
            googleAccessToken,
            scopes,
          });
        } catch (calendarErr: any) {
          logger.error("Google Calendar linking failed", {
            userId: data.user.userId,
            error: calendarErr.message,
          });
        }
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        message: err.message,
      });
    }
  },
};
