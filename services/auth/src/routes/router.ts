import { Router } from "express";
import { authController } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";
const router = Router();

router.post("/firebase", authController.firebaseLogin);
router.post("/google", authController.googleLogin);

router.get("/me", authMiddleware, (req: any, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});
export default router;
