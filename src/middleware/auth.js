function redirectByRole(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "recruiter") return "/recruiter/dashboard";
  if (role === "candidate") return "/candidate/dashboard";
  return "/";
}

function handleUnauthorized(req, res, message = "Veuillez vous connecter pour accéder à cette ressource.") {
  if (req.path.startsWith("/api") || req.originalUrl.startsWith("/api")) {
    return res.status(401).json({ error: message });
  }

  req.session.flash = {
    type: "warning",
    message
  };
  return res.redirect("/auth/login");
}

function handleForbidden(req, res, message = "Accès non autorisé.") {
  if (req.path.startsWith("/api") || req.originalUrl.startsWith("/api")) {
    return res.status(403).json({ error: message });
  }

  req.session.flash = {
    type: "danger",
    message
  };

  if (req.session.user?.role) {
    return res.redirect(redirectByRole(req.session.user.role));
  }

  return res.redirect("/auth/login");
}

export function requireAuth(req, res, next) {
  if (!req.session.user) {
    return handleUnauthorized(req, res);
  }

  if (req.session.user.is_active === 0) {
    req.session.destroy(() => {});
    return handleUnauthorized(req, res, "Votre compte est désactivé.");
  }

  return next();
}

export function requireGuest(req, res, next) {
  if (req.session.user) {
    return res.redirect(redirectByRole(req.session.user.role));
  }

  return next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return handleUnauthorized(req, res);
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return handleForbidden(req, res);
    }

    if (req.session.user.is_active === 0) {
      req.session.destroy(() => {});
      return handleUnauthorized(req, res, "Votre compte est désactivé.");
    }

    return next();
  };
}

export function requireApiRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (req.session.user.is_active === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Account disabled" });
    }

    return next();
  };
}

export const requireRecruiter = requireRole("recruiter");
export const requireAdmin = requireRole("admin");
export const requireCandidate = requireRole("candidate");
