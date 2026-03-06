import { z } from "zod";
import {
  getAllApplications,
  getApplicationById,
  updateApplicationStatus
} from "../models/applicationModel.js";
import { createJob } from "../models/jobModel.js";
import { get } from "../db/db.js";

const statusSchema = z.object({
  status: z.enum(["new", "reviewed", "accepted", "rejected"])
});

const filterSchema = z.object({
  status: z.enum(["all", "new", "reviewed", "accepted", "rejected"]).optional()
});

const createJobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  location: z.string().trim().min(2).max(120),
  contract_type: z.enum(["CDI", "CDD", "Freelance", "Stage", "Alternance"]),
  remote: z.string().optional(),
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
  description: z.string().trim().min(20).max(5000)
});

async function getDefaultRecruiterCompanyId() {
  const company = await get(
    `SELECT companies.id
     FROM companies
     JOIN users ON users.id = companies.user_id
     WHERE users.role = 'recruiter'
     ORDER BY companies.id ASC
     LIMIT 1`
  );

  return company?.id || null;
}

export async function dashboardPage(req, res) {
  const parsedFilter = filterSchema.safeParse(req.query);
  const currentStatus = parsedFilter.success ? (parsedFilter.data.status || "all") : "all";

  const allApplications = await getAllApplications();

  const applications =
    currentStatus === "all"
      ? allApplications
      : allApplications.filter(app => app.status === currentStatus);

  const stats = {
    total: allApplications.length,
    new: allApplications.filter(app => app.status === "new").length,
    reviewed: allApplications.filter(app => app.status === "reviewed").length,
    accepted: allApplications.filter(app => app.status === "accepted").length,
    rejected: allApplications.filter(app => app.status === "rejected").length
  };

  res.render("recruiter/dashboard", {
    applications,
    stats,
    currentStatus
  });
}

export async function applicationDetailPage(req, res) {
  const applicationId = Number(req.params.id);
  const application = await getApplicationById(applicationId);

  if (!application) {
    return res.status(404).send("Candidature introuvable");
  }

  res.render("recruiter/application_detail", {
    application
  });
}

export async function updateApplicationStatusAction(req, res) {
  const applicationId = Number(req.params.id);
  const parsed = statusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.redirect("/recruiter/dashboard");
  }

  await updateApplicationStatus(applicationId, parsed.data.status);
  return res.redirect("/recruiter/dashboard");
}

export async function createJobPage(req, res) {
  res.render("recruiter/create_job", {
    flash: null,
    old: {}
  });
}

export async function createJobAction(req, res) {
  const parsed = createJobSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).render("recruiter/create_job", {
      flash: {
        type: "danger",
        message: "Merci de remplir correctement tous les champs obligatoires."
      },
      old: req.body
    });
  }

  const companyId = await getDefaultRecruiterCompanyId();

  if (!companyId) {
    return res.status(500).render("recruiter/create_job", {
      flash: {
        type: "danger",
        message: "Aucune entreprise recruteur n’a été trouvée."
      },
      old: req.body
    });
  }

  const salaryMin = parsed.data.salary_min?.trim() ? Number(parsed.data.salary_min) : null;
  const salaryMax = parsed.data.salary_max?.trim() ? Number(parsed.data.salary_max) : null;

  await createJob({
    companyId,
    title: parsed.data.title,
    location: parsed.data.location,
    contractType: parsed.data.contract_type,
    remote: parsed.data.remote === "1" ? 1 : 0,
    salaryMin,
    salaryMax,
    description: parsed.data.description,
    status: "active"
  });

  return res.render("recruiter/create_job", {
    flash: {
      type: "success",
      message: "Offre créée avec succès."
    },
    old: {}
  });
}