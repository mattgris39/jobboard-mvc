import { z } from "zod";
import {
  getLatestJobs,
  getActiveJobs,
  getPublicJobById
} from "../models/jobModel.js";
import { createApplication } from "../models/applicationModel.js";

const applicationSchema = z.object({
  candidate_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().or(z.literal("")),
  message: z.string().optional().or(z.literal(""))
});

export async function homePage(req, res) {
  const latest = await getLatestJobs(6);
  res.render("public/home", { latest });
}

export async function jobsPage(req, res) {
  const q = (req.query.q || "").toString().trim();
  const location = (req.query.location || "").toString().trim();

  const jobs = await getActiveJobs({ q, location });

  res.render("public/jobs", {
    jobs,
    q,
    location
  });
}

export async function jobDetailPage(req, res) {
  const job = await getPublicJobById(Number(req.params.id));

  if (!job) {
    return res.status(404).send("Offre introuvable");
  }

  res.render("public/job_detail", { job });
}

export async function applyToJob(req, res) {
  const jobId = Number(req.params.id);

  const job = await getPublicJobById(jobId);
  if (!job) {
    return res.status(404).send("Offre introuvable");
  }

  const parsed = applicationSchema.safeParse(req.body);

  if (!parsed.success) {
    req.session.flash = {
      type: "danger",
      message: "Formulaire invalide."
    };
    return res.redirect(`/jobs/${jobId}`);
  }

  const cvPath = req.file ? `/uploads/cvs/${req.file.filename}` : null;

  await createApplication({
    jobId,
    candidateName: parsed.data.candidate_name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    message: parsed.data.message || null,
    cvPath
  });

  req.session.flash = {
    type: "success",
    message: "Candidature envoyée ✅"
  };

  return res.redirect(`/jobs/${jobId}`);
}