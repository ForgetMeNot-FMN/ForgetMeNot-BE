import { Request, Response } from "express";
import { googleAuthService } from "../services/googleAuthService";
import { localAuthService } from "../services/localAuthService";

export const authController = {
  async googleLogin(req: Request, res: Response) {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ success: false, message: "idToken is required" });
      }

      const data = await googleAuthService.loginWithGoogle(idToken);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async register(req: Request, res: Response) {
    try {
      const data = await localAuthService.register(req.body);
      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const data = await localAuthService.login(req.body);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },
};
