import { Router } from "express";
import { authController } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";
const router = Router();

router.post("/google", authController.googleLogin);
router.post("/register", authController.register);
router.post("/login", authController.login);

router.get("/me", authMiddleware, (req: any, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});
export default router;
