import { Router } from "express";
import {
  changePasswordAction,
  changePasswordPage,
  loginAction,
  loginPage,
  logoutAction,
  profilePage,
  profileUpdateAction,
  registerAction,
  registerPage
} from "../controllers/authController.js";
import { requireAuth, requireGuest } from "../middleware/auth.js";

const router = Router();

router.get("/login", requireGuest, loginPage);
router.post("/login", requireGuest, loginAction);
router.get("/register", requireGuest, registerPage);
router.post("/register", requireGuest, registerAction);

router.get("/profile", requireAuth, profilePage);
router.post("/profile", requireAuth, profileUpdateAction);
router.get("/change-password", requireAuth, changePasswordPage);
router.post("/change-password", requireAuth, changePasswordAction);
router.post("/logout", requireAuth, logoutAction);

export default router;
