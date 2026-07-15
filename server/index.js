import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import admin from "firebase-admin";

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/flow";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

if (!FIREBASE_PROJECT_ID) {
  console.warn(
    "[warn] FIREBASE_PROJECT_ID is not set — token verification will fail. " +
    "Set it in server/.env (same value as VITE_FIREBASE_PROJECT_ID)."
  );
}

// Only the projectId is required to verify ID tokens (public certs are
// fetched automatically by the Admin SDK) — no service-account key needed.
admin.initializeApp({ projectId: FIREBASE_PROJECT_ID });

// ─────────────────────────────────────────────────────────────────────────────
// Mongo connection
// ─────────────────────────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log(`[mongo] connected -> ${MONGO_URI}`))
  .catch((err) => {
    console.error("[mongo] connection error:", err.message);
    process.exit(1);
  });

const userDataSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: String,
    displayName: String,
    tasks: { type: Array, default: [] },
    sections: { type: Array, default: [] },
    blockedTimes: { type: Array, default: [] },
    workHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
    },
    geminiApiKey: { type: String, default: null },
  },
  { timestamps: true }
);

const UserData = mongoose.model("UserData", userDataSchema);

// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware — verifies the Firebase ID token using the Admin SDK.
// ─────────────────────────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
    };
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

// GET current user's data (creates an empty record on first login)
app.get("/api/data", requireAuth, async (req, res) => {
  try {
    let doc = await UserData.findOne({ uid: req.user.uid });
    if (!doc) {
      doc = await UserData.create({
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.displayName,
        tasks: [],
        sections: [],
      });
    }
    res.json({
      tasks: doc.tasks,
      sections: doc.sections,
      blockedTimes: doc.blockedTimes,
      workHours: doc.workHours,
    });
  } catch (err) {
    console.error("GET /api/data error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT (upsert) current user's data
app.put("/api/data", requireAuth, async (req, res) => {
  try {
    const { tasks, sections, blockedTimes, workHours } = req.body;
    const update = {
      email: req.user.email,
      displayName: req.user.displayName,
    };
    if (tasks !== undefined) update.tasks = tasks;
    if (sections !== undefined) update.sections = sections;
    if (blockedTimes !== undefined) update.blockedTimes = blockedTimes;
    if (workHours !== undefined) update.workHours = workHours;

    const doc = await UserData.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({
      tasks: doc.tasks,
      sections: doc.sections,
      blockedTimes: doc.blockedTimes,
      workHours: doc.workHours,
    });
  } catch (err) {
    console.error("PUT /api/data error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Gemini API key (BYOK) — stored per-user in Mongo instead of Drive ───────
app.get("/api/settings/gemini-key", requireAuth, async (req, res) => {
  try {
    const doc = await UserData.findOne({ uid: req.user.uid });
    res.json({ apiKey: doc?.geminiApiKey || null });
  } catch (err) {
    console.error("GET gemini-key error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/settings/gemini-key", requireAuth, async (req, res) => {
  try {
    const { apiKey } = req.body;
    await UserData.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: { geminiApiKey: apiKey, email: req.user.email, displayName: req.user.displayName } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT gemini-key error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/settings/gemini-key", requireAuth, async (req, res) => {
  try {
    await UserData.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: { geminiApiKey: null } }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE gemini-key error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
