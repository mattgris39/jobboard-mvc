import { z } from "zod";
import { getAdminGlobalStats, getApplicationStatusStats } from "../models/adminModel.js";
import {
  countUsers,
  createUser,
  deleteUserById,
  getRecentUsers,
  getUserById,
  getUserRoleStats,
  getUsersPaginated,
  updateUserPasswordById,
  updateUserAdminById
} from "../models/userModel.js";
import {
  countCompanies,
  createCompany,
  deleteCompanyById,
  getCompaniesPaginated,
  getCompanyById,
  toggleCompanyActiveById,
  updateCompanyById
} from "../models/companyModel.js";
import {
  countAdminJobs,
  createJob,
  deleteJobById,
  getAdminJobsPaginated,
  getJobById,
  toggleJobStatusById,
  updateJobAdminById
} from "../models/jobModel.js";
import {
  countAdminApplications,
  deleteApplicationById,
  getAdminApplicationsPaginated,
  getApplicationById,
  updateApplicationAdminById
} from "../models/applicationModel.js";
import { buildPagination, toPositiveInt } from "../middleware/pagination.js";
import bcrypt from "bcrypt";

const userSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["candidate", "recruiter", "admin"]),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  is_active: z.string().optional(),
  password: z.string().optional().or(z.literal(""))
});

const companySchema = z.object({
  user_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(150),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  logo_url: z.string().trim().max(255).optional().or(z.literal("")),
  is_active: z.string().optional()
});

const jobSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(120),
  location: z.string().trim().min(2).max(120),
  contract_type: z.enum(["CDI", "CDD", "Freelance", "Stage", "Alternance"]),
  remote: z.string().optional(),
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
  description: z.string().trim().min(20).max(5000),
  status: z.enum(["active", "archived"]).default("active")
});

const applicationSchema = z.object({
  status: z.enum(["new", "reviewed", "accepted", "rejected"]),
  recruiter_note: z.string().max(1000).optional().or(z.literal(""))
});

export async function adminDashboardPage(req, res) {
  const [globalStats, applicationStatusStats, userRoleStats, recentUsers] = await Promise.all([
    getAdminGlobalStats(),
    getApplicationStatusStats(),
    getUserRoleStats(),
    getRecentUsers(8)
  ]);

  return res.render("admin/dashboard", {
    globalStats,
    applicationStatusStats,
    userRoleStats,
    recentUsers
  });
}

export async function adminUsersPage(req, res) {
  const q = (req.query.q || "").toString().trim();
  const role = (req.query.role || "all").toString();
  const page = toPositiveInt(req.query.page, 1);
  const pageSize = 10;

  const total = await countUsers({ q, role });
  const pagination = buildPagination({ total, page, pageSize });
  const users = await getUsersPaginated({ q, role, page: pagination.page, pageSize });

  return res.render("admin/users", {
    users,
    filters: { q, role },
    pagination
  });
}

export async function adminUserEditPage(req, res) {
  const user = await getUserById(Number(req.params.id));
  if (!user) return res.status(404).send("Utilisateur introuvable");

  return res.render("admin/user_edit", {
    user,
    old: user
  });
}

export async function adminUserCreateAction(req, res) {
  const parsed = userSchema.safeParse(req.body);

  if (!parsed.success || !parsed.data.password) {
    req.session.flash = { type: "danger", message: "Formulaire utilisateur invalide." };
    return res.redirect("/admin/users");
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);
  await createUser({
    email: parsed.data.email,
    passwordHash: hash,
    role: parsed.data.role,
    fullName: parsed.data.full_name,
    phone: parsed.data.phone || null,
    bio: parsed.data.bio || null
  });

  req.session.flash = { type: "success", message: "Utilisateur créé." };
  return res.redirect("/admin/users");
}

export async function adminUserUpdateAction(req, res) {
  const userId = Number(req.params.id);
  const parsed = userSchema.safeParse(req.body);

  if (!parsed.success) {
    req.session.flash = { type: "danger", message: "Formulaire utilisateur invalide." };
    return res.redirect(`/admin/users/${userId}/edit`);
  }

  await updateUserAdminById(userId, {
    email: parsed.data.email,
    role: parsed.data.role,
    fullName: parsed.data.full_name,
    phone: parsed.data.phone || null,
    bio: parsed.data.bio || null,
    isActive: parsed.data.is_active === "1" ? 1 : 0
  });

  if (parsed.data.password) {
    const hash = await bcrypt.hash(parsed.data.password, 10);
    await updateUserPasswordById(userId, hash);
  }

  req.session.flash = { type: "success", message: "Utilisateur mis à jour." };
  return res.redirect("/admin/users");
}

export async function adminUserDeleteAction(req, res) {
  await deleteUserById(Number(req.params.id));
  req.session.flash = { type: "success", message: "Utilisateur supprimé." };
  return res.redirect("/admin/users");
}

export async function adminCompaniesPage(req, res) {
  const q = (req.query.q || "").toString().trim();
  const active = (req.query.active || "all").toString();
  const page = toPositiveInt(req.query.page, 1);
  const pageSize = 10;

  const total = await countCompanies({ q, active });
  const pagination = buildPagination({ total, page, pageSize });
  const companies = await getCompaniesPaginated({ q, active, page: pagination.page, pageSize });

  const recruiters = await getUsersPaginated({ role: "recruiter", page: 1, pageSize: 1000 });

  return res.render("admin/companies", {
    companies,
    recruiters,
    filters: { q, active },
    pagination
  });
}

export async function adminCompanyEditPage(req, res) {
  const company = await getCompanyById(Number(req.params.id));
  if (!company) return res.status(404).send("Entreprise introuvable");

  const recruiters = await getUsersPaginated({ role: "recruiter", page: 1, pageSize: 1000 });

  return res.render("admin/company_edit", {
    company,
    recruiters,
    old: company
  });
}

export async function adminCompanyCreateAction(req, res) {
  const parsed = companySchema.safeParse(req.body);
  if (!parsed.success) {
    req.session.flash = { type: "danger", message: "Formulaire entreprise invalide." };
    return res.redirect("/admin/companies");
  }

  await createCompany({
    userId: parsed.data.user_id,
    name: parsed.data.name,
    website: parsed.data.website || null,
    description: parsed.data.description || null,
    logoUrl: parsed.data.logo_url || null,
    isActive: parsed.data.is_active === "1" ? 1 : 0
  });

  req.session.flash = { type: "success", message: "Entreprise créée." };
  return res.redirect("/admin/companies");
}

export async function adminCompanyUpdateAction(req, res) {
  const companyId = Number(req.params.id);
  const parsed = companySchema.safeParse(req.body);

  if (!parsed.success) {
    req.session.flash = { type: "danger", message: "Formulaire entreprise invalide." };
    return res.redirect(`/admin/companies/${companyId}/edit`);
  }

  await updateCompanyById(companyId, {
    userId: parsed.data.user_id,
    name: parsed.data.name,
    website: parsed.data.website || null,
    description: parsed.data.description || null,
    logoUrl: parsed.data.logo_url || null,
    isActive: parsed.data.is_active === "1" ? 1 : 0
  });

  req.session.flash = { type: "success", message: "Entreprise mise à jour." };
  return res.redirect("/admin/companies");
}

export async function adminCompanyToggleAction(req, res) {
  await toggleCompanyActiveById(Number(req.params.id));
  req.session.flash = { type: "success", message: "État entreprise mis à jour." };
  return res.redirect("/admin/companies");
}

export async function adminCompanyDeleteAction(req, res) {
  await deleteCompanyById(Number(req.params.id));
  req.session.flash = { type: "success", message: "Entreprise supprimée." };
  return res.redirect("/admin/companies");
}

export async function adminJobsPage(req, res) {
  const q = (req.query.q || "").toString().trim();
  const status = (req.query.status || "all").toString();
  const page = toPositiveInt(req.query.page, 1);
  const pageSize = 10;

  const total = await countAdminJobs({ q, status });
  const pagination = buildPagination({ total, page, pageSize });
  const jobs = await getAdminJobsPaginated({ q, status, page: pagination.page, pageSize });
  const companies = await getCompaniesPaginated({ page: 1, pageSize: 1000, q: "", active: "all" });

  return res.render("admin/jobs", {
    jobs,
    companies,
    filters: { q, status },
    pagination
  });
}

export async function adminJobEditPage(req, res) {
  const job = await getJobById(Number(req.params.id));
  if (!job) return res.status(404).send("Offre introuvable");

  const companies = await getCompaniesPaginated({ page: 1, pageSize: 1000, q: "", active: "all" });
  return res.render("admin/job_edit", {
    job,
    companies,
    old: {
      ...job,
      company_id: job.company_id
    }
  });
}

export async function adminJobCreateAction(req, res) {
  const parsed = jobSchema.safeParse(req.body);

  if (!parsed.success) {
    req.session.flash = { type: "danger", message: "Formulaire offre invalide." };
    return res.redirect("/admin/jobs");
  }

  await createJob({
    companyId: parsed.data.company_id,
    title: parsed.data.title,
    location: parsed.data.location,
    contractType: parsed.data.contract_type,
    remote: parsed.data.remote === "1" ? 1 : 0,
    salaryMin: parsed.data.salary_min ? Number(parsed.data.salary_min) : null,
    salaryMax: parsed.data.salary_max ? Number(parsed.data.salary_max) : null,
    description: parsed.data.description,
    status: parsed.data.status
  });

  req.session.flash = { type: "success", message: "Offre créée." };
  return res.redirect("/admin/jobs");
}

export async function adminJobUpdateAction(req, res) {
  const jobId = Number(req.params.id);
  const parsed = jobSchema.safeParse(req.body);

  if (!parsed.success) {
    req.session.flash = { type: "danger", message: "Formulaire offre invalide." };
    return res.redirect(`/admin/jobs/${jobId}/edit`);
  }

  await updateJobAdminById(jobId, {
    companyId: parsed.data.company_id,
    title: parsed.data.title,
    location: parsed.data.location,
    contractType: parsed.data.contract_type,
    remote: parsed.data.remote === "1" ? 1 : 0,
    salaryMin: parsed.data.salary_min ? Number(parsed.data.salary_min) : null,
    salaryMax: parsed.data.salary_max ? Number(parsed.data.salary_max) : null,
    description: parsed.data.description,
    status: parsed.data.status
  });

  req.session.flash = { type: "success", message: "Offre mise à jour." };
  return res.redirect("/admin/jobs");
}

export async function adminJobDeleteAction(req, res) {
  await deleteJobById(Number(req.params.id));
  req.session.flash = { type: "success", message: "Offre supprimée." };
  return res.redirect("/admin/jobs");
}

export async function adminJobToggleStatusAction(req, res) {
  await toggleJobStatusById(Number(req.params.id));
  req.session.flash = { type: "success", message: "Statut de l'offre mis à jour." };
  return res.redirect("/admin/jobs");
}

export async function adminApplicationsPage(req, res) {
  const q = (req.query.q || "").toString().trim();
  const status = (req.query.status || "all").toString();
  const page = toPositiveInt(req.query.page, 1);
  const pageSize = 10;

  const total = await countAdminApplications({ q, status });
  const pagination = buildPagination({ total, page, pageSize });
  const applications = await getAdminApplicationsPaginated({
    q,
    status,
    page: pagination.page,
    pageSize
  });

  return res.render("admin/applications", {
    applications,
    filters: { q, status },
    pagination
  });
}

export async function adminApplicationEditPage(req, res) {
  const application = await getApplicationById(Number(req.params.id));
  if (!application) return res.status(404).send("Candidature introuvable");

  return res.render("admin/application_edit", {
    application,
    old: application
  });
}

export async function adminApplicationUpdateAction(req, res) {
  const appId = Number(req.params.id);
  const parsed = applicationSchema.safeParse(req.body);

  if (!parsed.success) {
    req.session.flash = { type: "danger", message: "Formulaire candidature invalide." };
    return res.redirect(`/admin/applications/${appId}/edit`);
  }

  await updateApplicationAdminById(appId, {
    status: parsed.data.status,
    recruiterNote: parsed.data.recruiter_note || null
  });

  req.session.flash = { type: "success", message: "Candidature mise à jour." };
  return res.redirect("/admin/applications");
}

export async function adminApplicationDeleteAction(req, res) {
  await deleteApplicationById(Number(req.params.id));
  req.session.flash = { type: "success", message: "Candidature supprimée." };
  return res.redirect("/admin/applications");
}
