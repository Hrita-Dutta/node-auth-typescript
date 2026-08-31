import { Router } from "express";
import {
  loginHandler,
  refreshHandler,
  registerHandler,
  verifyEmailHandler,
} from "../controllers/auth/auth.controller";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.get("/verify-email", verifyEmailHandler);
router.post("/refresh", refreshHandler);

export default router;
