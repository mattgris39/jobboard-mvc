import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  homePage,
  jobsPage,
  jobDetailPage,
  applyToJob
} from "../controllers/publicController.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "..", "uploads", "cvs");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf";
    if (!isPdf) {
      return cb(new Error("Seuls les fichiers PDF sont autorisés."));
    }
    cb(null, true);
  }
});

router.get("/", homePage);
router.get("/jobs", jobsPage);
router.get("/jobs/:id", jobDetailPage);
router.post("/jobs/:id/apply", upload.single("cv"), applyToJob);

router.use((err, req, res, next) => {
  if (err) {
    req.session.flash = {
      type: "danger",
      message: err.message || "Erreur lors de l'upload."
    };

    const jobId = req.params.id;
    if (jobId) {
      return res.redirect(`/jobs/${jobId}`);
    }

    return res.redirect("/");
  }

  next();
});

export default router;