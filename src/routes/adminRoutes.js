import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  adminApplicationDeleteAction,
  adminApplicationEditPage,
  adminApplicationUpdateAction,
  adminApplicationsPage,
  adminCompaniesPage,
  adminCompanyCreateAction,
  adminCompanyDeleteAction,
  adminCompanyEditPage,
  adminCompanyToggleAction,
  adminCompanyUpdateAction,
  adminDashboardPage,
  adminJobCreateAction,
  adminJobDeleteAction,
  adminJobEditPage,
  adminJobToggleStatusAction,
  adminJobUpdateAction,
  adminJobsPage,
  adminUserCreateAction,
  adminUserDeleteAction,
  adminUserEditPage,
  adminUserUpdateAction,
  adminUsersPage
} from "../controllers/adminController.js";

const router = Router();

router.use(requireAdmin);

router.get("/dashboard", adminDashboardPage);

router.get("/users", adminUsersPage);
router.post("/users", adminUserCreateAction);
router.get("/users/:id/edit", adminUserEditPage);
router.post("/users/:id/update", adminUserUpdateAction);
router.post("/users/:id/delete", adminUserDeleteAction);

router.get("/companies", adminCompaniesPage);
router.post("/companies", adminCompanyCreateAction);
router.get("/companies/:id/edit", adminCompanyEditPage);
router.post("/companies/:id/update", adminCompanyUpdateAction);
router.post("/companies/:id/toggle", adminCompanyToggleAction);
router.post("/companies/:id/delete", adminCompanyDeleteAction);

router.get("/jobs", adminJobsPage);
router.post("/jobs", adminJobCreateAction);
router.get("/jobs/:id/edit", adminJobEditPage);
router.post("/jobs/:id/update", adminJobUpdateAction);
router.post("/jobs/:id/toggle-status", adminJobToggleStatusAction);
router.post("/jobs/:id/delete", adminJobDeleteAction);

router.get("/applications", adminApplicationsPage);
router.get("/applications/:id/edit", adminApplicationEditPage);
router.post("/applications/:id/update", adminApplicationUpdateAction);
router.post("/applications/:id/delete", adminApplicationDeleteAction);

export default router;
