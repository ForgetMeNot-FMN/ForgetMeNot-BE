import { Router } from "express";
import { loginHandler, verifyHandler } from "../../index";
const router = Router();

router.post("/login", loginHandler);
router.post("/verify", verifyHandler);
export default router;
