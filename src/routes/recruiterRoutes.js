import { Router } from "express";
import {
  dashboardPage,
  applicationDetailPage,
  updateApplicationStatusAction,
  createJobPage,
  createJobAction
} from "../controllers/recruiterController.js";

const router = Router();

router.get("/dashboard", dashboardPage);
router.get("/applications/:id", applicationDetailPage);
router.post("/applications/:id/status", updateApplicationStatusAction);

router.get("/jobs/new", createJobPage);
router.post("/jobs", createJobAction);

export default router;