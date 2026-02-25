import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("studenthub.db");
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    reset_token TEXT,
    reset_token_expiry INTEGER
  );

  CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT PRIMARY KEY,
    classes TEXT,
    assignments TEXT,
    study_sessions TEXT,
    reminders TEXT,
    updated_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

const app = express();
app.use(express.json());

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- Auth Routes ---

app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  try {
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare("INSERT INTO users (id, email, password) VALUES (?, ?, ?)");
    stmt.run(id, email, hashedPassword);

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id, email } });
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email } });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user) {
    // Don't reveal if user exists or not for security, but for this app we'll be helpful
    return res.status(404).json({ error: "User not found" });
  }

  const resetToken = Math.random().toString(36).substring(2, 15);
  const expiry = Date.now() + 3600000; // 1 hour

  db.prepare("UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?")
    .run(resetToken, expiry, user.id);

  // In a real app, send email. Here we just return success.
  console.log(`Password reset token for ${email}: ${resetToken}`);
  res.json({ message: "Reset instructions sent to your email", debugToken: resetToken });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?")
    .get(token, Date.now());

  if (!user) return res.status(400).json({ error: "Invalid or expired token" });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  db.prepare("UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?")
    .run(hashedPassword, user.id);

  res.json({ message: "Password reset successful" });
});

// --- Data Routes ---

app.get("/api/data/sync", authenticate, (req: any, res) => {
  const data: any = db.prepare("SELECT * FROM user_data WHERE user_id = ?").get(req.userId);
  if (!data) return res.json({ classes: [], assignments: [], study_sessions: [], reminders: [] });

  res.json({
    classes: JSON.parse(data.classes || "[]"),
    assignments: JSON.parse(data.assignments || "[]"),
    study_sessions: JSON.parse(data.study_sessions || "[]"),
    reminders: JSON.parse(data.reminders || "[]"),
    updated_at: data.updated_at
  });
});

app.post("/api/data/sync", authenticate, (req: any, res) => {
  const { classes, assignments, study_sessions, reminders } = req.body;
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO user_data (user_id, classes, assignments, study_sessions, reminders, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      classes = excluded.classes,
      assignments = excluded.assignments,
      study_sessions = excluded.study_sessions,
      reminders = excluded.reminders,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    req.userId,
    JSON.stringify(classes),
    JSON.stringify(assignments),
    JSON.stringify(study_sessions),
    JSON.stringify(reminders),
    now
  );

  res.json({ status: "ok", updated_at: now });
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
