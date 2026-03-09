import bcrypt from "bcrypt";
import { z } from "zod";
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserPasswordById,
  updateUserProfileById
} from "../models/userModel.js";
import { getCompanyByUserId } from "../models/companyModel.js";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  role: z.enum(["candidate", "recruiter"]).default("candidate")
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal(""))
});

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
    confirm_password: z.string().min(8)
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "La confirmation du mot de passe est invalide.",
    path: ["confirm_password"]
  });

function redirectByRole(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "recruiter") return "/recruiter/dashboard";
  if (role === "candidate") return "/candidate/dashboard";
  return "/";
}

export function loginPage(req, res) {
  return res.render("auth/login", {
    old: {}
  });
}

export async function loginAction(req, res) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).render("auth/login", {
      flash: {
        type: "danger",
        message: "Email ou mot de passe invalide."
      },
      old: { email: req.body.email || "" }
    });
  }

  const user = await getUserByEmail(parsed.data.email);
  if (!user || user.is_active === 0) {
    return res.status(401).render("auth/login", {
      flash: {
        type: "danger",
        message: "Identifiants invalides ou compte désactivé."
      },
      old: { email: parsed.data.email }
    });
  }

  const isValidPassword = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).render("auth/login", {
      flash: {
        type: "danger",
        message: "Identifiants invalides ou compte désactivé."
      },
      old: { email: parsed.data.email }
    });
  }

  return req.session.regenerate((err) => {
    if (err) {
      return res.status(500).render("auth/login", {
        flash: {
          type: "danger",
          message: "Impossible d'ouvrir la session."
        },
        old: { email: parsed.data.email }
      });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      is_active: user.is_active
    };

    req.session.flash = {
      type: "success",
      message: `Connexion réussie (${user.role}).`
    };

    return res.redirect(redirectByRole(user.role));
  });
}

export function registerPage(req, res) {
  return res.render("auth/register", {
    old: {}
  });
}

export async function registerAction(req, res) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).render("auth/register", {
      flash: {
        type: "danger",
        message: "Formulaire invalide."
      },
      old: req.body
    });
  }

  const existing = await getUserByEmail(parsed.data.email);
  if (existing) {
    return res.status(409).render("auth/register", {
      flash: {
        type: "danger",
        message: "Cet email est déjà utilisé."
      },
      old: req.body
    });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await createUser({
    email: parsed.data.email,
    passwordHash,
    role: parsed.data.role,
    fullName: parsed.data.full_name,
    phone: parsed.data.phone || null
  });

  req.session.flash = {
    type: "success",
    message: "Compte créé. Vous pouvez vous connecter."
  };

  return res.redirect("/auth/login");
}

export async function profilePage(req, res) {
  const user = await getUserById(req.session.user.id);
  const recruiterCompany =
    req.session.user.role === "recruiter" ? await getCompanyByUserId(req.session.user.id) : null;

  return res.render("auth/profile", {
    recruiterCompany,
    old: {
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      bio: user?.bio || ""
    }
  });
}

export async function profileUpdateAction(req, res) {
  const parsed = profileSchema.safeParse(req.body);
  const recruiterCompany =
    req.session.user.role === "recruiter" ? await getCompanyByUserId(req.session.user.id) : null;

  if (!parsed.success) {
    return res.status(400).render("auth/profile", {
      recruiterCompany,
      flash: {
        type: "danger",
        message: "Formulaire invalide."
      },
      old: req.body
    });
  }

  await updateUserProfileById(req.session.user.id, {
    fullName: parsed.data.full_name,
    phone: parsed.data.phone || null,
    bio: parsed.data.bio || null
  });

  req.session.user.full_name = parsed.data.full_name;
  req.session.user.phone = parsed.data.phone || null;
  req.session.user.bio = parsed.data.bio || null;

  req.session.flash = {
    type: "success",
    message: "Profil mis à jour."
  };

  return res.redirect("/auth/profile");
}

export function changePasswordPage(req, res) {
  return res.render("auth/change_password", {
    old: {}
  });
}

export async function changePasswordAction(req, res) {
  const parsed = changePasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).render("auth/change_password", {
      flash: {
        type: "danger",
        message: parsed.error.issues[0]?.message || "Formulaire invalide."
      },
      old: {}
    });
  }

  const user = await getUserByEmail(req.session.user.email);
  if (!user) {
    req.session.destroy(() => {});
    return res.redirect("/auth/login");
  }

  const isCurrentValid = await bcrypt.compare(parsed.data.current_password, user.password_hash);
  if (!isCurrentValid) {
    return res.status(400).render("auth/change_password", {
      flash: {
        type: "danger",
        message: "Mot de passe actuel invalide."
      },
      old: {}
    });
  }

  const newHash = await bcrypt.hash(parsed.data.new_password, 10);
  await updateUserPasswordById(user.id, newHash);

  req.session.flash = {
    type: "success",
    message: "Mot de passe mis à jour."
  };

  return res.redirect("/auth/change-password");
}

export function logoutAction(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/");
    }

    res.clearCookie("connect.sid");
    return res.redirect("/auth/login");
  });
}
