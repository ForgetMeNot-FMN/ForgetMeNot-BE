import { Request, Response } from "express";
import { firebaseAuthService } from "../services/firebaseAuthService";

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
      const { idToken } = req.body;

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
};
