import { Router } from "express";
import { requireRecruiter } from "../middleware/auth.js";
import {
  dashboardPage,
  recruiterCompanyPage,
  recruiterCompanySaveAction,
  applicationDetailPage,
  updateApplicationStatusAction,
  createJobPage,
  createJobAction,
  editJobPage,
  updateJobAction,
  archiveJobAction,
  reactivateJobAction
} from "../controllers/recruiterController.js";

const router = Router();

router.use(requireRecruiter);

router.get("/dashboard", dashboardPage);
router.get("/company", recruiterCompanyPage);
router.post("/company", recruiterCompanySaveAction);
router.get("/applications/:id", applicationDetailPage);
router.post("/applications/:id/status", updateApplicationStatusAction);

router.get("/jobs/new", createJobPage);
router.post("/jobs", createJobAction);
router.get("/jobs/:id/edit", editJobPage);
router.post("/jobs/:id/update", updateJobAction);
router.post("/jobs/:id/archive", archiveJobAction);
router.post("/jobs/:id/reactivate", reactivateJobAction);

export default router;
