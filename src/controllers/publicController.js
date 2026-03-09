import { z } from "zod";
import {
  countActiveJobs,
  getActiveJobsPaginated,
  getLatestJobs,
  getPublicJobById
} from "../models/jobModel.js";
import { createApplication, hasExistingApplication } from "../models/applicationModel.js";
import { buildPagination, toPositiveInt } from "../middleware/pagination.js";

const applicationSchema = z.object({
  candidate_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(1500).optional().or(z.literal(""))
});

export async function homePage(req, res) {
  const latest = await getLatestJobs(6);
  res.render("public/home", { latest });
}

export async function jobsPage(req, res) {
  const filters = {
    q: (req.query.q || "").toString().trim(),
    location: (req.query.location || "").toString().trim(),
    contractType: (req.query.contract_type || "").toString().trim(),
    remote: (req.query.remote || "all").toString().trim(),
    sort: (req.query.sort || "recent").toString().trim()
  };

  const page = toPositiveInt(req.query.page, 1);
  const pageSize = 6;

  const total = await countActiveJobs(filters);
  const pagination = buildPagination({ total, page, pageSize });

  const jobs = await getActiveJobsPaginated({
    ...filters,
    page: pagination.page,
    pageSize
  });

  res.render("public/jobs", {
    jobs,
    filters,
    pagination
  });
}

export async function jobDetailPage(req, res) {
  const job = await getPublicJobById(Number(req.params.id));

  if (!job) {
    return res.status(404).send("Offre introuvable");
  }

  const prefill = {
    candidate_name: req.session.user?.full_name || "",
    email: req.session.user?.email || "",
    phone: req.session.user?.phone || "",
    message: ""
  };

  res.render("public/job_detail", { job, prefill });
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

  const alreadyApplied = await hasExistingApplication({
    jobId,
    email: parsed.data.email
  });

  if (alreadyApplied) {
    req.session.flash = {
      type: "warning",
      message: "Vous avez déjà postulé à cette offre avec cet email."
    };
    return res.redirect(`/jobs/${jobId}`);
  }

  const cvPath = req.file ? `/uploads/cvs/${req.file.filename}` : null;

  await createApplication({
    jobId,
    candidateUserId: req.session.user?.role === "candidate" ? req.session.user.id : null,
    candidateName: parsed.data.candidate_name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    message: parsed.data.message || null,
    cvPath
  });

  req.session.flash = {
    type: "success",
    message: "Candidature envoyée."
  };

  return res.redirect(`/jobs/${jobId}`);
}
