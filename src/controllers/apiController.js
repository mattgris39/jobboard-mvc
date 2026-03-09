import { z } from "zod";
import {
  countActiveJobs,
  countAdminJobs,
  createJob,
  deleteJobById,
  getAdminJobsPaginated,
  getActiveJobsPaginated,
  getJobById,
  getPublicJobById,
  updateJobAdminById
} from "../models/jobModel.js";
import {
  countUsers,
  createUser,
  deleteUserById,
  getUserById,
  getUsersPaginated,
  updateUserAdminById
} from "../models/userModel.js";
import {
  countCompanies,
  createCompany,
  deleteCompanyById,
  getCompaniesPaginated,
  getCompanyById,
  updateCompanyById
} from "../models/companyModel.js";
import {
  countAdminApplications,
  countRecruiterApplications,
  createApplication,
  deleteApplicationById,
  getAdminApplicationsPaginated,
  getApplicationById,
  getApplicationsByRecruiterUserId,
  getRecruiterApplicationById,
  updateRecruiterApplicationStatus,
  updateApplicationAdminById
} from "../models/applicationModel.js";
import bcrypt from "bcrypt";

const jobPayloadSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  title: z.string().trim().min(3),
  location: z.string().trim().min(2),
  contract_type: z.string().trim().min(2),
  remote: z.coerce.number().int().min(0).max(1),
  salary_min: z.coerce.number().nullable().optional(),
  salary_max: z.coerce.number().nullable().optional(),
  description: z.string().trim().min(20),
  status: z.enum(["active", "archived"]).default("active")
});

const userPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["candidate", "recruiter", "admin"]),
  full_name: z.string().trim().min(2),
  phone: z.string().optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
  is_active: z.coerce.number().int().min(0).max(1).default(1)
});

const companyPayloadSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(2),
  website: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  logo_url: z.string().optional().or(z.literal("")),
  is_active: z.coerce.number().int().min(0).max(1).default(1)
});

const applicationPayloadSchema = z.object({
  job_id: z.coerce.number().int().positive(),
  candidate_user_id: z.coerce.number().int().positive().nullable().optional(),
  candidate_name: z.string().trim().min(2),
  email: z.string().email(),
  phone: z.string().optional().or(z.literal("")),
  message: z.string().optional().or(z.literal("")),
  cv_path: z.string().optional().or(z.literal("")),
  status: z.enum(["new", "reviewed", "accepted", "rejected"]).default("new"),
  recruiter_note: z.string().optional().or(z.literal(""))
});

export async function apiPublicJobs(req, res) {
  const q = (req.query.q || "").toString().trim();
  const location = (req.query.location || "").toString().trim();
  const contractType = (req.query.contract_type || "").toString().trim();
  const remote = (req.query.remote || "all").toString().trim();
  const sort = (req.query.sort || "recent").toString().trim();
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const pageSize = Number(req.query.page_size) > 0 ? Number(req.query.page_size) : 10;

  const total = await countActiveJobs({ q, location, contractType, remote });
  const jobs = await getActiveJobsPaginated({
    q,
    location,
    contractType,
    remote,
    sort,
    page,
    pageSize
  });

  return res.json({
    data: jobs,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  });
}

export async function apiPublicJobById(req, res) {
  const job = await getPublicJobById(Number(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  return res.json({ data: job });
}

export async function apiListUsers(req, res) {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const pageSize = Number(req.query.page_size) > 0 ? Number(req.query.page_size) : 20;
  const role = (req.query.role || "all").toString();
  const q = (req.query.q || "").toString().trim();

  const total = await countUsers({ role, q });
  const data = await getUsersPaginated({ page, pageSize, role, q });
  return res.json({
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  });
}

export async function apiGetUser(req, res) {
  const data = await getUserById(Number(req.params.id));
  if (!data) return res.status(404).json({ error: "User not found" });
  return res.json({ data });
}

export async function apiCreateUser(req, res) {
  const parsed = userPayloadSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.password) return res.status(400).json({ error: "Invalid payload" });

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const created = await createUser({
    email: parsed.data.email,
    passwordHash: hash,
    role: parsed.data.role,
    fullName: parsed.data.full_name,
    phone: parsed.data.phone || null,
    bio: parsed.data.bio || null
  });

  return res.status(201).json({ id: created.lastID });
}

export async function apiUpdateUser(req, res) {
  const parsed = userPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  await updateUserAdminById(Number(req.params.id), {
    email: parsed.data.email,
    role: parsed.data.role,
    fullName: parsed.data.full_name,
    phone: parsed.data.phone || null,
    bio: parsed.data.bio || null,
    isActive: parsed.data.is_active
  });

  return res.json({ ok: true });
}

export async function apiDeleteUser(req, res) {
  await deleteUserById(Number(req.params.id));
  return res.status(204).send();
}

export async function apiListCompanies(req, res) {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const pageSize = Number(req.query.page_size) > 0 ? Number(req.query.page_size) : 20;
  const q = (req.query.q || "").toString().trim();
  const active = (req.query.active || "all").toString();

  const total = await countCompanies({ q, active });
  const data = await getCompaniesPaginated({ page, pageSize, q, active });
  return res.json({
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  });
}

export async function apiGetCompany(req, res) {
  const data = await getCompanyById(Number(req.params.id));
  if (!data) return res.status(404).json({ error: "Company not found" });
  return res.json({ data });
}

export async function apiCreateCompany(req, res) {
  const parsed = companyPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const created = await createCompany({
    userId: parsed.data.user_id,
    name: parsed.data.name,
    website: parsed.data.website || null,
    description: parsed.data.description || null,
    logoUrl: parsed.data.logo_url || null,
    isActive: parsed.data.is_active
  });

  return res.status(201).json({ id: created.lastID });
}

export async function apiUpdateCompany(req, res) {
  const parsed = companyPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  await updateCompanyById(Number(req.params.id), {
    userId: parsed.data.user_id,
    name: parsed.data.name,
    website: parsed.data.website || null,
    description: parsed.data.description || null,
    logoUrl: parsed.data.logo_url || null,
    isActive: parsed.data.is_active
  });

  return res.json({ ok: true });
}

export async function apiDeleteCompany(req, res) {
  await deleteCompanyById(Number(req.params.id));
  return res.status(204).send();
}

export async function apiListJobs(req, res) {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const pageSize = Number(req.query.page_size) > 0 ? Number(req.query.page_size) : 20;
  const q = (req.query.q || "").toString().trim();
  const status = (req.query.status || "all").toString();

  const total = await countAdminJobs({ q, status });
  const data = await getAdminJobsPaginated({ page, pageSize, q, status });
  return res.json({
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  });
}

export async function apiGetJob(req, res) {
  const data = await getJobById(Number(req.params.id));
  if (!data) return res.status(404).json({ error: "Job not found" });
  return res.json({ data });
}

export async function apiCreateJob(req, res) {
  const parsed = jobPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const created = await createJob({
    companyId: parsed.data.company_id,
    title: parsed.data.title,
    location: parsed.data.location,
    contractType: parsed.data.contract_type,
    remote: parsed.data.remote,
    salaryMin: parsed.data.salary_min || null,
    salaryMax: parsed.data.salary_max || null,
    description: parsed.data.description,
    status: parsed.data.status
  });

  return res.status(201).json({ id: created.lastID });
}

export async function apiUpdateJob(req, res) {
  const parsed = jobPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  await updateJobAdminById(Number(req.params.id), {
    companyId: parsed.data.company_id,
    title: parsed.data.title,
    location: parsed.data.location,
    contractType: parsed.data.contract_type,
    remote: parsed.data.remote,
    salaryMin: parsed.data.salary_min || null,
    salaryMax: parsed.data.salary_max || null,
    description: parsed.data.description,
    status: parsed.data.status
  });

  return res.json({ ok: true });
}

export async function apiDeleteJob(req, res) {
  await deleteJobById(Number(req.params.id));
  return res.status(204).send();
}

export async function apiListApplications(req, res) {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const pageSize = Number(req.query.page_size) > 0 ? Number(req.query.page_size) : 20;
  const q = (req.query.q || "").toString().trim();
  const status = (req.query.status || "all").toString();
  const userRole = req.session.user?.role;

  if (userRole === "recruiter") {
    const userId = req.session.user.id;
    const total = await countRecruiterApplications({ userId, status, q });
    const data = await getApplicationsByRecruiterUserId({ userId, status, q, page, pageSize });

    return res.json({
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  }

  const total = await countAdminApplications({ q, status });
  const data = await getAdminApplicationsPaginated({ page, pageSize, q, status });
  return res.json({
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  });
}

export async function apiGetApplication(req, res) {
  const appId = Number(req.params.id);
  const userRole = req.session.user?.role;
  const userId = req.session.user?.id;
  const data =
    userRole === "recruiter"
      ? await getRecruiterApplicationById(appId, userId)
      : await getApplicationById(appId);

  if (!data) return res.status(404).json({ error: "Application not found" });
  return res.json({ data });
}

export async function apiCreateApplication(req, res) {
  const parsed = applicationPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const created = await createApplication({
    jobId: parsed.data.job_id,
    candidateUserId: parsed.data.candidate_user_id || null,
    candidateName: parsed.data.candidate_name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    message: parsed.data.message || null,
    cvPath: parsed.data.cv_path || null
  });

  if (parsed.data.status !== "new" || parsed.data.recruiter_note) {
    await updateApplicationAdminById(created.lastID, {
      status: parsed.data.status,
      recruiterNote: parsed.data.recruiter_note || null
    });
  }

  return res.status(201).json({ id: created.lastID });
}

export async function apiUpdateApplication(req, res) {
  const appId = Number(req.params.id);
  const parsed = applicationPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  if (req.session.user?.role === "recruiter") {
    await updateRecruiterApplicationStatus(
      appId,
      req.session.user.id,
      parsed.data.status,
      parsed.data.recruiter_note || null
    );
  } else {
    await updateApplicationAdminById(appId, {
      status: parsed.data.status,
      recruiterNote: parsed.data.recruiter_note || null
    });
  }

  return res.json({ ok: true });
}

export async function apiDeleteApplication(req, res) {
  await deleteApplicationById(Number(req.params.id));
  return res.status(204).send();
}
