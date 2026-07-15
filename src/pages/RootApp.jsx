import { useCallback, useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from "react-router-dom";
import {
  onIdTokenChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, provider } from "../firebase";

import useDataSync from "../hooks/useDataSync";
import useToast     from "../hooks/useToast";

import LoginScreen     from "../components/auth/LoginScreen";
import SectionsScreen  from "../components/sections/SectionsScreen";
import AddSectionModal from "../components/sections/AddSectionModal";
import AppScreen       from "../components/tasks/AppScreen";
import CompletedScreen from "../components/completed/CompletedScreen";
import CalendarPage    from "./CalendarPage";
import BlockedTimesModal from "../components/settings/BlockedTimesModal";
import AIChatAssistant  from "../components/chat/AIChatAssistant";
import Toast           from "../components/common/Toast";

import { uid, todayStr, toSlug } from "../utils/helpers";
import { DEFAULT_BLOCKED_TIMES, DEFAULT_WORK_START, DEFAULT_WORK_END } from "../utils/scheduleHelpers";
import { useTheme } from "../contexts/ThemeContext";

const BLOCKED_TIMES_KEY = "flow_blocked_times";
const WORK_HOURS_KEY = "flow_work_hours";

const loadBlockedTimes = () => {
  try {
    const saved = localStorage.getItem(BLOCKED_TIMES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_BLOCKED_TIMES;
  } catch {
    return DEFAULT_BLOCKED_TIMES;
  }
};

const saveBlockedTimes = (times) => {
  try {
    localStorage.setItem(BLOCKED_TIMES_KEY, JSON.stringify(times));
  } catch {
    console.error("Failed to save blocked times");
  }
};

const loadWorkHours = () => {
  try {
    const saved = localStorage.getItem(WORK_HOURS_KEY);
    if (saved) {
      const { start, end } = JSON.parse(saved);
      return { start, end };
    }
    return { start: DEFAULT_WORK_START, end: DEFAULT_WORK_END };
  } catch {
    return { start: DEFAULT_WORK_START, end: DEFAULT_WORK_END };
  }
};

const saveWorkHours = (start, end) => {
  try {
    localStorage.setItem(WORK_HOURS_KEY, JSON.stringify({ start, end }));
  } catch {
    console.error("Failed to save work hours");
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// Auth + data lives here; routing is delegated to child route components
// ─────────────────────────────────────────────────────────────────────────────
export default function RootApp() {
  const { theme } = useTheme();
  const [user,        setUser]        = useState(null);
  const [idToken,     setIdToken]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [blockedTimes, setBlockedTimes] = useState(loadBlockedTimes);
  const [workHours, setWorkHours] = useState(loadWorkHours);
  const [blockedTimesOpen, setBlockedTimesOpen] = useState(false);

  const { toast, showToast } = useToast();
  const navigate = useNavigate();

  // ── Auth ──────────────────────────────────────────────────────────────────
  // onIdTokenChanged fires on sign-in, sign-out, and whenever Firebase
  // auto-refreshes the ID token (roughly every hour) — so idToken is always
  // kept fresh automatically, with no manual refresh logic needed.
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIdToken(null);
        setAuthLoading(false);
        return;
      }
      setUser(firebaseUser);
      try {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
      } catch (err) {
        console.error("Failed to get ID token:", err);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const token  = await result.user.getIdToken();
      setIdToken(token);
      setUser(result.user);
      showToast("Signed in successfully!", "success");
    } catch (err) {
      console.error("Sign-in error:", err);
      showToast("Sign-in failed. Please try again.", "error");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setIdToken(null);
    navigate("/");
    showToast("Signed out.");
  };

  // ── Data sync (MongoDB via local server) ────────────────────────────────
  const { tasks, sections, setTasks, setSections, syncStatus, scheduleSave } =
    useDataSync(idToken, showToast);

  // ── Mutation helpers ──────────────────────────────────────────────────────
  const persistTasks = useCallback((newTasks) => {
    setTasks(newTasks);
    scheduleSave(newTasks, sections);
  }, [sections, scheduleSave, setTasks]);

  const persistSections = useCallback((newSections) => {
    setSections(newSections);
    scheduleSave(tasks, newSections);
  }, [tasks, scheduleSave, setSections]);

  // ── Task handlers ─────────────────────────────────────────────────────────
  const handleCycle = useCallback((taskId) => {
    const today = todayStr();
    persistTasks(tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (t.status === "Not Started") return { ...t, status: "In Progress", progress: t.progress ?? 0 };
      if (t.status === "In Progress") {
        const late = t.deadlineDate && t.deadlineDate < today;
        return { ...t, status: late ? "Done Late" : "Done", completedAt: today, progress: 100 };
      }
      return t;
    }));
  }, [tasks, persistTasks]);

  const handleDelete = useCallback((taskId) => {
    persistTasks(tasks.filter((t) => t.id !== taskId));
  }, [tasks, persistTasks]);

  const handleSave = useCallback((updated, newTasks) => {
    if (updated)       persistTasks(tasks.map((t) => t.id === updated.id ? updated : t));
    else if (newTasks) persistTasks([...tasks, ...newTasks]);
  }, [tasks, persistTasks]);

  const handleMoveType = useCallback((taskId) => {
    persistTasks(tasks.map((t) =>
      t.id === taskId ? { ...t, taskType: t.taskType === "routine" ? "ondemand" : "routine" } : t
    ));
  }, [tasks, persistTasks]);

  // When the user drags the slider to 100 the task auto-completes.
  const handleProgress = useCallback((taskId, pct) => {
    const today = todayStr();
    persistTasks(tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (pct === 100) {
        const late = t.deadlineDate && t.deadlineDate < today;
        return { ...t, progress: 100, status: late ? "Done Late" : "Done", completedAt: today };
      }
      return { ...t, progress: pct };
    }));
  }, [tasks, persistTasks]);

  // ── Section handlers ──────────────────────────────────────────────────────
  const handleAddSection = useCallback((name) => {
    const newSection = { id: uid(), name, slug: toSlug(name), createdAt: Date.now() };
    persistSections([...sections, newSection]);
    navigate(`/${newSection.slug}`);
  }, [sections, persistSections, navigate]);

  const handleDeleteSection = useCallback((sectionId) => {
    const newSections = sections.filter((s) => s.id !== sectionId);
    const newTasks    = tasks.filter((t) => t.sectionId !== sectionId);
    // Set both states and call scheduleSave once with the correct pair.
    // Calling persistSections then persistTasks separately would cause the
    // debounce to keep only the second scheduleSave call, which still holds
    // the old sections in its closure — leaving the deleted section in Drive.
    setSections(newSections);
    setTasks(newTasks);
    scheduleSave(newTasks, newSections);
    navigate("/");
  }, [sections, tasks, setSections, setTasks, scheduleSave, navigate]);

  const handleRenameSection = useCallback((sectionId, newName) => {
    const newSlug = toSlug(newName);
    persistSections(sections.map((s) =>
      s.id === sectionId ? { ...s, name: newName, slug: newSlug } : s
    ));
  }, [sections, persistSections]);

  const handleReorderSections = useCallback((reordered) => {
    persistSections(reordered);
  }, [persistSections]);

  const handleSaveBlockedTimes = useCallback((times, workStart, workEnd) => {
    setBlockedTimes(times);
    saveBlockedTimes(times);
    setWorkHours({ start: workStart, end: workEnd });
    saveWorkHours(workStart, workEnd);
    showToast("Work hours and blocked times updated successfully!", "success");
  }, [showToast]);

  // ── Shared props bundle passed into route components ──────────────────────
  const sharedProps = {
    tasks, sections, user, syncStatus, blockedTimes, workHours,
    handleCycle, handleDelete, handleSave, handleMoveType, handleProgress,
    handleAddSection, handleDeleteSection, handleRenameSection, handleReorderSections,
    showToast,
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading) return <Spinner label="Loading…" />;

  if (!user) {
    return (
      <>
        <LoginScreen onSignIn={handleSignIn} />
        <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
      </>
    );
  }

  return (
    <div style={{ 
      minHeight:"100vh", 
      background: theme.mode === "dark"
        ? "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)"
        : "linear-gradient(135deg, #f5f7fa 0%, #e8ecf3 50%, #dde4ed 100%)",
      color:theme.text, 
      transition:"background 0.3s ease, color 0.3s ease",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative background orbs */}
      <div style={{
        position: "fixed",
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        background: theme.mode === "dark"
          ? "radial-gradient(circle, rgba(232,69,69,0.15) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(232,69,69,0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <div style={{
        position: "fixed",
        bottom: -150,
        left: -150,
        width: 500,
        height: 500,
        background: theme.mode === "dark"
          ? "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <TopBar
          user={user}
          syncStatus={syncStatus}
          onSignOut={handleSignOut}
          onOpenBlockedTimes={() => setBlockedTimesOpen(true)}
        />
        <Routes>
        <Route index element={<SectionsScreenWrapper {...sharedProps} />} />
        <Route path="calendar" element={<CalendarPage {...sharedProps} />} />
        {/* /completed must be explicit before /:sectionSlug — otherwise React Router
            treats "completed" as a section slug and redirects home when no match is found */}
        <Route path="completed" element={<CompletedScreenWrapper {...sharedProps} />} />
        <Route path=":sectionSlug" element={<AppScreenWrapper {...sharedProps} />} />
        <Route path=":sectionSlug/completed" element={<CompletedScreenWrapper {...sharedProps} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BlockedTimesModal
        open={blockedTimesOpen}
        onClose={() => setBlockedTimesOpen(false)}
        blockedTimes={blockedTimes}
        workStart={workHours.start}
        workEnd={workHours.end}
        onSave={handleSaveBlockedTimes}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />

      <AIChatAssistant
        tasks={tasks}
        sections={sections}
        blockedTimes={blockedTimes}
        workHours={workHours}
        onSave={handleSave}
        onDelete={handleDelete}
        onProgress={handleProgress}
        driveToken={idToken}
      />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Route wrapper components — resolve slug → section, then render screen
// ─────────────────────────────────────────────────────────────────────────────

function SectionsScreenWrapper({ tasks, sections, user, handleAddSection, handleDeleteSection, handleRenameSection, handleReorderSections }) {
  const navigate         = useNavigate();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <SectionsScreen
        sections={sections}
        tasks={tasks}
        user={user}
        onOpen={(s) => navigate(`/${s.slug || toSlug(s.name)}`)}
        onAdd={() => setAddOpen(true)}
        onDelete={handleDeleteSection}
        onRename={handleRenameSection}
        onReorder={handleReorderSections}
        onViewCompleted={() => navigate("/completed")}
      />
      <AddSectionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddSection}
      />
    </>
  );
}

function AppScreenWrapper({ tasks, sections, syncStatus, blockedTimes, workHours, handleCycle, handleDelete, handleSave, handleMoveType, handleProgress }) {
  const { sectionSlug } = useParams();
  const navigate        = useNavigate();

  const section = sections.find(
    (s) => (s.slug || toSlug(s.name)) === sectionSlug
  );

  if (sections.length === 0 && syncStatus === "loading") return <Spinner label="Loading…" />;
  if (!section) return <Navigate to="/" replace />;

  return (
    <AppScreen
      section={section}
      tasks={tasks}
      blockedTimes={blockedTimes}
      workHours={workHours}
      onBack={() => navigate("/")}
      onCycle={handleCycle}
      onDelete={handleDelete}
      onSave={handleSave}
      onMoveType={handleMoveType}
      onProgress={handleProgress}
      onViewCompleted={() => navigate(`/${sectionSlug}/completed`)}
    />
  );
}

function CompletedScreenWrapper({ tasks, sections, syncStatus, handleDelete }) {
  const { sectionSlug } = useParams();
  const navigate        = useNavigate();

  const section = sectionSlug
    ? sections.find((s) => (s.slug || toSlug(s.name)) === sectionSlug)
    : null;

  if (sections.length === 0 && syncStatus === "loading") return <Spinner label="Loading…" />;

  return (
    <CompletedScreen
      tasks={tasks}
      sections={sections}
      activeSectionId={section?.id ?? null}
      onBack={() => navigate(sectionSlug ? `/${sectionSlug}` : "/")}
      onDelete={handleDelete}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI pieces
// ─────────────────────────────────────────────────────────────────────────────

function TopBar({ user, syncStatus, onSignOut, onOpenBlockedTimes }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const isDark = theme.mode === "dark";
  const isOnCalendar = location.pathname.includes("/calendar");

  return (
    <>
      <div style={{
        borderBottom:`1px solid ${theme.border}`,
        padding:"12px 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:50,
        background:theme.bgTopBar, backdropFilter:"blur(12px)",
        transition:"background 0.3s ease, border-color 0.3s ease",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div
            onClick={() => navigate("/")}
            style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:theme.text, cursor:"pointer" }}
          >Flow</div>
          <button
            onClick={() => navigate(isOnCalendar ? "/" : "/calendar")}
            style={{
              background: "none", border: "none", color: theme.textMuted,
              fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              fontWeight: 600, transition: "color 0.15s", padding: "4px 8px",
              borderRadius: 6
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = theme.red; e.currentTarget.style.background = theme.redDim; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "none"; }}
          >
            {isOnCalendar ? "📂 Sections" : "📅 Calendar"}
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {syncStatus === "saving"  && <span style={{ color:theme.orange, fontSize:11 }}>↑ Saving…</span>}
          {syncStatus === "loading" && <span style={{ color:theme.blue,   fontSize:11 }}>↓ Loading…</span>}
          <span style={{ color:theme.textMuted, fontSize:12 }}>{user.displayName || user.email}</span>

          {/* Blocked Times Settings */}
          <button
            onClick={onOpenBlockedTimes}
            title="Configure blocked times"
            style={{
              background: theme.bgInput,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
              transition: "all 0.2s ease",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.orange; e.currentTarget.style.background = theme.orangeDim; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.bgInput; }}
          >
            🚫
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: theme.bgInput,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
              transition: "all 0.2s ease",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.red; e.currentTarget.style.background = theme.redDim; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.bgInput; }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          <button
            onClick={onSignOut}
            style={{ background:"none", border:`1px solid ${theme.border}`, borderRadius:8, padding:"5px 12px", color:theme.textMuted, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color=theme.red; e.currentTarget.style.borderColor=theme.red; }}
            onMouseLeave={(e) => { e.currentTarget.style.color=theme.textMuted; e.currentTarget.style.borderColor=theme.border; }}
          >Sign out</button>
        </div>
      </div>

      {/* Sync-error banner — shown below the TopBar so it can't be missed */}
      {syncStatus === "error" && (
        <div style={{
          background: "rgba(232,69,69,0.08)",
          borderBottom: "1px solid rgba(232,69,69,0.2)",
          padding: "10px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
        }}>
          <span style={{ color: theme.red, fontSize: 13, fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15 }}>⚠</span>
            Could not sync with the server. Your changes are saved locally.
          </span>
        </div>
      )}
    </>
  );
}

function Spinner({ label }) {
  const { theme } = useTheme();
  return (
    <div style={{ minHeight:"100vh", background:theme.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, transition:"background 0.3s ease" }}>
      <div style={{ width:28, height:28, border:`2px solid ${theme.redDim}`, borderTop:"2px solid #E84545", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      <div style={{ color:theme.textMuted, fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>{label}</div>
    </div>
  );
}
