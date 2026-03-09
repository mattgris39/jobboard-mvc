import { Router } from "express";
import {
  apiCreateApplication,
  apiCreateCompany,
  apiCreateJob,
  apiCreateUser,
  apiDeleteApplication,
  apiDeleteCompany,
  apiDeleteJob,
  apiDeleteUser,
  apiGetApplication,
  apiGetCompany,
  apiGetJob,
  apiGetUser,
  apiListApplications,
  apiListCompanies,
  apiListJobs,
  apiListUsers,
  apiPublicJobById,
  apiPublicJobs,
  apiUpdateApplication,
  apiUpdateCompany,
  apiUpdateJob,
  apiUpdateUser
} from "../controllers/apiController.js";
import { requireApiRole } from "../middleware/auth.js";

const router = Router();

router.get("/public/jobs", apiPublicJobs);
router.get("/public/jobs/:id", apiPublicJobById);

router.get("/users", requireApiRole("admin"), apiListUsers);
router.get("/users/:id", requireApiRole("admin"), apiGetUser);
router.post("/users", requireApiRole("admin"), apiCreateUser);
router.put("/users/:id", requireApiRole("admin"), apiUpdateUser);
router.delete("/users/:id", requireApiRole("admin"), apiDeleteUser);

router.get("/companies", requireApiRole("admin"), apiListCompanies);
router.get("/companies/:id", requireApiRole("admin"), apiGetCompany);
router.post("/companies", requireApiRole("admin"), apiCreateCompany);
router.put("/companies/:id", requireApiRole("admin"), apiUpdateCompany);
router.delete("/companies/:id", requireApiRole("admin"), apiDeleteCompany);

router.get("/jobs", requireApiRole("admin"), apiListJobs);
router.get("/jobs/:id", requireApiRole("admin"), apiGetJob);
router.post("/jobs", requireApiRole("admin"), apiCreateJob);
router.put("/jobs/:id", requireApiRole("admin"), apiUpdateJob);
router.delete("/jobs/:id", requireApiRole("admin"), apiDeleteJob);

router.get("/applications", requireApiRole("admin", "recruiter"), apiListApplications);
router.get("/applications/:id", requireApiRole("admin", "recruiter"), apiGetApplication);
router.post("/applications", requireApiRole("admin", "recruiter"), apiCreateApplication);
router.put("/applications/:id", requireApiRole("admin", "recruiter"), apiUpdateApplication);
router.delete("/applications/:id", requireApiRole("admin"), apiDeleteApplication);

export default router;
