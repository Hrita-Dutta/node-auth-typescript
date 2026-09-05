import { Router } from "express";
import {
  forgotPasswordHandler,
  googleAuthCallbackHandler,
  googleAuthStartHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
  twoFASetuphandler,
  twoFAVerifyHandler,
  verifyEmailHandler,
} from "../controllers/auth/auth.controller";
import requireAuth from "../middleware/requireAuth";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.get("/verify-email", verifyEmailHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);
router.get("/google", googleAuthStartHandler);
router.get("/google/callback", googleAuthCallbackHandler);
router.post("/2fa/setup", requireAuth, twoFASetuphandler);
router.post("/2fa/verify", requireAuth, twoFAVerifyHandler);

export default router;
