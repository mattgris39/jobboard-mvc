import { Router } from "express";
import {
  candidateApplicationDetailPage,
  candidateDashboardPage
} from "../controllers/candidateController.js";
import { requireCandidate } from "../middleware/auth.js";

const router = Router();

router.use(requireCandidate);
router.get("/dashboard", candidateDashboardPage);
router.get("/applications/:id", candidateApplicationDetailPage);

export default router;
