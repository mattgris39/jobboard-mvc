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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const SQLiteStore = SQLiteStoreFactory(session);

// Initialisation DB
await initDb();

// Sécurité
app.use(helmet());

// Parsing formulaires
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Fichiers statiques
app.use("/static", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session
app.use(
  session({
    store: new SQLiteStore({
      db: "sessions.sqlite",
      dir: path.join(__dirname, "..")
    }),
    secret: "jobboard_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    }
  })
);

// Variables globales pour les vues
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  req.session.flash = null;
  next();
});

// EJS
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

// Routes MVC
app.use("/", publicRoutes);
app.use("/auth", authRoutes);
app.use("/recruiter", recruiterRoutes);

// Lancement serveur
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});