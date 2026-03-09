import { z } from "zod";
import {
  countRecruiterApplications,
  getApplicationsByRecruiterUserId,
  getRecruiterApplicationById,
  updateRecruiterApplicationStatus
} from "../models/applicationModel.js";

import {
  createJob,
  getJobsByRecruiterUserId,
  getJobStatsByRecruiterUserId,
  getRecruiterJobById,
  updateJobById,
  archiveJobById,
  reactivateJobById,
  countRecruiterJobs
} from "../models/jobModel.js";
import { createCompany, getCompanyByUserId, updateCompanyById } from "../models/companyModel.js";
import { buildPagination, toPositiveInt } from "../middleware/pagination.js";

const statusSchema = z.object({
  status: z.enum(["new", "reviewed", "accepted", "rejected"]),
  recruiter_note: z.string().max(1000).optional().or(z.literal(""))
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

const recruiterCompanySchema = z.object({
  name: z.string().trim().min(2).max(150),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  is_active: z.string().optional()
});

export async function dashboardPage(req, res) {
  const recruiterId = req.session.user?.id;
  const company = await getCompanyByUserId(recruiterId);

  const appStatus = (req.query.app_status || "all").toString();
  const appQ = (req.query.app_q || "").toString().trim();
  const appPage = toPositiveInt(req.query.app_page, 1);
  const appPageSize = 8;

  const jobsStatus = (req.query.jobs_status || "all").toString();
  const jobsQ = (req.query.jobs_q || "").toString().trim();
  const jobsPage = toPositiveInt(req.query.jobs_page, 1);
  const jobsPageSize = 8;

  const [totalApplications, totalJobs, stats, jobStats] = await Promise.all([
    countRecruiterApplications({ userId: recruiterId, status: appStatus, q: appQ }),
    countRecruiterJobs({ userId: recruiterId, status: jobsStatus, q: jobsQ }),
    getApplicationsByRecruiterUserId({ userId: recruiterId, status: "all", q: "", page: 1, pageSize: 10000 }),
    getJobStatsByRecruiterUserId(recruiterId)
  ]);

  const applicationsPagination = buildPagination({ total: totalApplications, page: appPage, pageSize: appPageSize });
  const jobsPagination = buildPagination({ total: totalJobs, page: jobsPage, pageSize: jobsPageSize });

  const [applications, jobs] = await Promise.all([
    getApplicationsByRecruiterUserId({
      userId: recruiterId,
      status: appStatus,
      q: appQ,
      page: applicationsPagination.page,
      pageSize: appPageSize
    }),
    getJobsByRecruiterUserId({
      userId: recruiterId,
      status: jobsStatus,
      q: jobsQ,
      page: jobsPagination.page,
      pageSize: jobsPageSize
    })
  ]);

  const statusStats = {
    total: stats.length,
    new: stats.filter((app) => app.status === "new").length,
    reviewed: stats.filter((app) => app.status === "reviewed").length,
    accepted: stats.filter((app) => app.status === "accepted").length,
    rejected: stats.filter((app) => app.status === "rejected").length
  };

  res.render("recruiter/dashboard", {
    company,
    applications,
    stats: statusStats,
    jobs,
    jobStats,
    filters: {
      appStatus,
      appQ,
      jobsStatus,
      jobsQ
    },
    paginations: {
      applications: applicationsPagination,
      jobs: jobsPagination
    }
  });
}

export async function recruiterCompanyPage(req, res) {
  const recruiterId = req.session.user?.id;
  const company = await getCompanyByUserId(recruiterId);

  return res.render("recruiter/company_form", {
    company,
    old: company || {}
  });
}

export async function recruiterCompanySaveAction(req, res) {
  const recruiterId = req.session.user?.id;
  const parsed = recruiterCompanySchema.safeParse(req.body);
  const company = await getCompanyByUserId(recruiterId);

  if (!parsed.success) {
    return res.status(400).render("recruiter/company_form", {
      company,
      old: req.body,
      flash: {
        type: "danger",
        message: "Merci de renseigner correctement les informations entreprise."
      }
    });
  }

  const payload = {
    userId: recruiterId,
    name: parsed.data.name,
    website: parsed.data.website || null,
    description: parsed.data.description || null,
    logoUrl: null,
    isActive: parsed.data.is_active === "0" ? 0 : 1
  };

  if (company) {
    await updateCompanyById(company.id, payload);
  } else {
    await createCompany(payload);
  }

  req.session.flash = {
    type: "success",
    message: "Entreprise enregistrée."
  };
  return res.redirect("/recruiter/dashboard");
}

export async function applicationDetailPage(req, res) {
  const applicationId = Number(req.params.id);
  const recruiterId = req.session.user?.id;

  const application = await getRecruiterApplicationById(applicationId, recruiterId);

  if (!application) {
    return res.status(404).send("Candidature introuvable");
  }

  res.render("recruiter/application_detail", {
    application
  });
}

export async function updateApplicationStatusAction(req, res) {
  const applicationId = Number(req.params.id);
  const recruiterId = req.session.user?.id;
  const parsed = statusSchema.safeParse(req.body);

  if (!parsed.success) {
    req.session.flash = {
      type: "danger",
      message: "Mise à jour impossible."
    };
    return res.redirect("/recruiter/dashboard");
  }

  await updateRecruiterApplicationStatus(
    applicationId,
    recruiterId,
    parsed.data.status,
    parsed.data.recruiter_note || null
  );

  req.session.flash = {
    type: "success",
    message: "Statut candidature mis à jour."
  };

  return res.redirect("/recruiter/dashboard");
}

export async function createJobPage(req, res) {
  const recruiterId = req.session.user?.id;
  const company = await getCompanyByUserId(recruiterId);

  if (!company) {
    req.session.flash = {
      type: "warning",
      message: "Créez d'abord votre entreprise avant de publier une offre."
    };
    return res.redirect("/recruiter/company");
  }

  if (company.is_active === 0) {
    req.session.flash = {
      type: "warning",
      message: "Votre entreprise est inactive. Activez-la pour publier des offres."
    };
    return res.redirect("/recruiter/company");
  }

  res.render("recruiter/create_job", {
    flash: null,
    old: {}
  });
}

export async function createJobAction(req, res) {
  const recruiterId = req.session.user?.id;
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

  const company = await getCompanyByUserId(recruiterId);

  if (!company) {
    req.session.flash = {
      type: "warning",
      message: "Créez votre entreprise pour pouvoir publier une offre."
    };
    return res.redirect("/recruiter/company");
  }

  if (company.is_active === 0) {
    req.session.flash = {
      type: "warning",
      message: "Activez votre entreprise avant de publier une offre."
    };
    return res.redirect("/recruiter/company");
  }

  const salaryMin = parsed.data.salary_min?.trim() ? Number(parsed.data.salary_min) : null;
  const salaryMax = parsed.data.salary_max?.trim() ? Number(parsed.data.salary_max) : null;

  await createJob({
    companyId: company.id,
    title: parsed.data.title,
    location: parsed.data.location,
    contractType: parsed.data.contract_type,
    remote: parsed.data.remote === "1" ? 1 : 0,
    salaryMin,
    salaryMax,
    description: parsed.data.description,
    status: "active"
  });

  req.session.flash = {
    type: "success",
    message: "Offre créée avec succès."
  };

  return res.redirect("/recruiter/dashboard");
}

export async function editJobPage(req, res) {
  const recruiterId = req.session.user?.id;
  const jobId = Number(req.params.id);

  const job = await getRecruiterJobById(jobId, recruiterId);

  if (!job) {
    return res.status(404).send("Offre introuvable");
  }

  res.render("recruiter/edit_job", {
    flash: null,
    old: job,
    job
  });
}

export async function updateJobAction(req, res) {
  const recruiterId = req.session.user?.id;
  const jobId = Number(req.params.id);
  const parsed = createJobSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).render("recruiter/edit_job", {
      flash: {
        type: "danger",
        message: "Merci de remplir correctement tous les champs obligatoires."
      },
      old: { ...req.body, id: jobId },
      job: { id: jobId }
    });
  }

  const salaryMin = parsed.data.salary_min?.trim() ? Number(parsed.data.salary_min) : null;
  const salaryMax = parsed.data.salary_max?.trim() ? Number(parsed.data.salary_max) : null;

  await updateJobById(jobId, recruiterId, {
    title: parsed.data.title,
    location: parsed.data.location,
    contractType: parsed.data.contract_type,
    remote: parsed.data.remote === "1" ? 1 : 0,
    salaryMin,
    salaryMax,
    description: parsed.data.description
  });

  req.session.flash = {
    type: "success",
    message: "Offre mise à jour."
  };

  return res.redirect("/recruiter/dashboard");
}

export async function archiveJobAction(req, res) {
  const recruiterId = req.session.user?.id;
  const jobId = Number(req.params.id);

  await archiveJobById(jobId, recruiterId);

  req.session.flash = {
    type: "success",
    message: "Offre archivée."
  };

  return res.redirect("/recruiter/dashboard");
}

export async function reactivateJobAction(req, res) {
  const recruiterId = req.session.user?.id;
  const jobId = Number(req.params.id);

  await reactivateJobById(jobId, recruiterId);

  req.session.flash = {
    type: "success",
    message: "Offre réactivée."
  };

  return res.redirect("/recruiter/dashboard");
}
