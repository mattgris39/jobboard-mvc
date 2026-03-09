import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import SQLiteStoreFactory from "connect-sqlite3";
import expressLayouts from "express-ejs-layouts";
import helmet from "helmet";

import { initDb } from "./db/db.js";
import publicRoutes from "./routes/publicRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import recruiterRoutes from "./routes/recruiterRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import apiRoutes from "./routes/apiRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const SQLiteStore = SQLiteStoreFactory(session);

await initDb();

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/static", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    store: new SQLiteStore({
      db: "sessions.sqlite",
      dir: path.join(__dirname, "..")
    }),
    secret: process.env.SESSION_SECRET || "jobboard_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  req.session.flash = null;
  next();
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

app.use("/", publicRoutes);
app.use("/auth", authRoutes);
app.use("/candidate", candidateRoutes);
app.use("/recruiter", recruiterRoutes);
app.use("/admin", adminRoutes);
app.use("/api", apiRoutes);

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.status(404).render("public/404");
});

app.use((err, req, res, next) => {
  console.error(err);

  if (req.path.startsWith("/api")) {
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.status(500).render("public/500");
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
