import { Request, Response } from "express";
import { loginService } from "./src/services/loginService";
import { verifyService } from "./src/services/verifyService";

export async function loginHandler(req: Request, res: Response) {
  try {
    const { idToken } = req.body;
    const data = await loginService.login(idToken);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function verifyHandler(req: Request, res: Response) {
  try {
    const { token } = req.body;
    const data = await verifyService.verify(token);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
