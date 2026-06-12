import { useCallback, useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams, Navigate } from "react-router-dom";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, provider } from "../firebase";

import useDriveSync from "../hooks/useDriveSync";
import useToast     from "../hooks/useToast";

import LoginScreen     from "../components/auth/LoginScreen";
import SectionsScreen  from "../components/sections/SectionsScreen";
import AddSectionModal from "../components/sections/AddSectionModal";
import AppScreen       from "../components/tasks/AppScreen";
import CompletedScreen from "../components/completed/CompletedScreen";
import Toast           from "../components/common/Toast";

import { uid, todayStr, toSlug } from "../utils/helpers";

const TOKEN_KEY  = "flow_drive_token";
const saveToken  = (t) => sessionStorage.setItem(TOKEN_KEY, t);
const loadToken  = ()  => sessionStorage.getItem(TOKEN_KEY) || null;
const clearToken = ()  => sessionStorage.removeItem(TOKEN_KEY);


// ─────────────────────────────────────────────────────────────────────────────
// Auth + data lives here; routing is delegated to child route components
// ─────────────────────────────────────────────────────────────────────────────
export default function RootApp() {
  const [user,        setUser]        = useState(null);
  const [accessToken, setAccessToken] = useState(loadToken);
  const [authLoading, setAuthLoading] = useState(true);

  const { toast, showToast } = useToast();
  const navigate = useNavigate();

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (!firebaseUser) clearToken();
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleSignIn = async () => {
    try {
      const result     = await signInWithPopup(auth, provider);
      const googleCred = GoogleAuthProvider.credentialFromResult(result);
      const token      = googleCred?.accessToken;
      if (token) { saveToken(token); setAccessToken(token); }
      setUser(result.user);
      showToast("Signed in successfully!", "success");
    } catch (err) {
      console.error("Sign-in error:", err);
      showToast("Sign-in failed. Please try again.", "error");
    }
  };

  const handleSignOut = async () => {
    clearToken();
    await signOut(auth);
    setUser(null);
    setAccessToken(null);
    navigate("/");
    showToast("Signed out.");
  };

  // ── Drive sync ────────────────────────────────────────────────────────────
  const { tasks, sections, setTasks, setSections, syncStatus, scheduleSave } =
    useDriveSync(accessToken, showToast);

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
      if (t.status === "Not Started") return { ...t, status: "In Progress" };
      if (t.status === "In Progress") {
        const late = t.deadlineDate && t.deadlineDate < today;
        return { ...t, status: late ? "Done Late" : "Done", completedAt: today };
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

  // ── Section handlers ──────────────────────────────────────────────────────
  const handleAddSection = useCallback((name) => {
    const newSection = { id: uid(), name, slug: toSlug(name), createdAt: Date.now() };
    persistSections([...sections, newSection]);
    navigate(`/${newSection.slug}`);
  }, [sections, persistSections, navigate]);

  const handleDeleteSection = useCallback((sectionId) => {
    persistSections(sections.filter((s) => s.id !== sectionId));
    persistTasks(tasks.filter((t) => t.sectionId !== sectionId));
    navigate("/");
  }, [sections, tasks, persistSections, persistTasks, navigate]);

  // ── Shared props bundle passed into route components ──────────────────────
  const sharedProps = {
    tasks, sections, user,
    handleCycle, handleDelete, handleSave, handleMoveType,
    handleAddSection, handleDeleteSection,
    showToast,
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading) return <Spinner label="Loading…" />;

  if (user && !accessToken) {
    return (
      <>
        <ReconnectScreen user={user} onSignIn={handleSignIn} />
        <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onSignIn={handleSignIn} />
        <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
      </>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#080E18", color:"#E2E8F0" }}>
      <TopBar user={user} syncStatus={syncStatus} onSignOut={handleSignOut} />

      <Routes>
        <Route index element={<SectionsScreenWrapper {...sharedProps} />} />
        {/* /completed must be explicit before /:sectionSlug — otherwise React Router
            treats "completed" as a section slug and redirects home when no match is found */}
        <Route path="completed" element={<CompletedScreenWrapper {...sharedProps} />} />
        <Route path=":sectionSlug" element={<AppScreenWrapper {...sharedProps} />} />
        <Route path=":sectionSlug/completed" element={<CompletedScreenWrapper {...sharedProps} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Route wrapper components — resolve slug → section, then render screen
// ─────────────────────────────────────────────────────────────────────────────

function SectionsScreenWrapper({ tasks, sections, user, handleAddSection, handleDeleteSection }) {
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

function AppScreenWrapper({ tasks, sections, handleCycle, handleDelete, handleSave, handleMoveType }) {
  const { sectionSlug } = useParams();
  const navigate        = useNavigate();

  // Support both old sections (no slug field) and new ones
  const section = sections.find(
    (s) => (s.slug || toSlug(s.name)) === sectionSlug
  );

  // Sections haven't loaded from Drive yet — show spinner
  if (sections.length === 0) return <Spinner label="Loading…" />;
  // Slug doesn't match any section — redirect home
  if (!section) return <Navigate to="/" replace />;

  return (
    <AppScreen
      section={section}
      tasks={tasks}
      onBack={() => navigate("/")}
      onCycle={handleCycle}
      onDelete={handleDelete}
      onSave={handleSave}
      onMoveType={handleMoveType}
      onViewCompleted={() => navigate(`/${sectionSlug}/completed`)}
    />
  );
}

function CompletedScreenWrapper({ tasks, sections, handleDelete }) {
  const { sectionSlug } = useParams();
  const navigate        = useNavigate();

  const section = sectionSlug
    ? sections.find((s) => (s.slug || toSlug(s.name)) === sectionSlug)
    : null;

  if (sections.length === 0) return <Spinner label="Loading…" />;

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

function TopBar({ user, syncStatus, onSignOut }) {
  const navigate = useNavigate();
  return (
    <div style={{
      borderBottom:"1px solid rgba(255,255,255,0.05)",
      padding:"12px 24px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      position:"sticky", top:0, zIndex:50,
      background:"rgba(8,14,24,0.9)", backdropFilter:"blur(12px)",
    }}>
      <div
        onClick={() => navigate("/")}
        style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:"#E2E8F0", cursor:"pointer" }}
      >Flow</div>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        {syncStatus === "saving"  && <span style={{ color:"#F5A623", fontSize:11 }}>↑ Saving…</span>}
        {syncStatus === "loading" && <span style={{ color:"#4A9EE8", fontSize:11 }}>↓ Loading…</span>}
        {syncStatus === "error"   && <span style={{ color:"#E84545", fontSize:11 }}>⚠ Sync error</span>}
        <span style={{ color:"#2D3748", fontSize:12 }}>{user.displayName || user.email}</span>
        <button
          onClick={onSignOut}
          style={{ background:"none", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"5px 12px", color:"#4A5568", fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color="#E84545"; e.currentTarget.style.borderColor="#E84545"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color="#4A5568"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; }}
        >Sign out</button>
      </div>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <div style={{ minHeight:"100vh", background:"#080E18", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
      <div style={{ width:28, height:28, border:"2px solid rgba(232,69,69,0.2)", borderTop:"2px solid #E84545", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      <div style={{ color:"#2D3748", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>{label}</div>
    </div>
  );
}

function ReconnectScreen({ user, onSignIn }) {
  const [btnHover, setBtnHover] = useState(false);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const avatar = user?.photoURL;
  const name   = user?.displayName || user?.email || "there";
  const first  = name.split(" ")[0];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080E18",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @keyframes spin       { to { transform: rotate(360deg) } }
        @keyframes fadeUp     { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse-ring { 0%,100% { opacity:0.15 } 50% { opacity:0.35 } }
      `}</style>

      {/* Background glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(232,69,69,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        position: "relative",
        background: "linear-gradient(145deg, #0E1826, #0A1220)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 24,
        padding: "48px 40px",
        maxWidth: 400,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>

        {/* Pulsing ring + avatar */}
        <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 24px" }}>
          <div style={{
            position: "absolute", inset: -8,
            borderRadius: "50%",
            border: "1px solid rgba(232,69,69,0.3)",
            animation: "pulse-ring 2.5s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", inset: -16,
            borderRadius: "50%",
            border: "1px solid rgba(232,69,69,0.12)",
            animation: "pulse-ring 2.5s ease-in-out infinite 0.4s",
          }} />
          {avatar ? (
            <img src={avatar} alt={name} style={{
              width: 72, height: 72, borderRadius: "50%",
              border: "2px solid rgba(232,69,69,0.4)",
              display: "block",
            }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg, #E84545, #c43030)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: "#fff", fontWeight: 700,
              border: "2px solid rgba(232,69,69,0.4)",
            }}>
              {first[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Text */}
        <div style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 26, color: "#E2E8F0",
          marginBottom: 10, letterSpacing: "-0.3px",
        }}>
          Welcome back, {first}
        </div>
        <p style={{
          color: "#4A5568", fontSize: 13, lineHeight: 1.7,
          marginBottom: 32, maxWidth: 280, margin: "0 auto 32px",
        }}>
          Your Drive connection expired. One quick sign-in and you&apos;ll be right back where you left off.
        </p>

        {/* Divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 28,
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
          <span style={{ color: "#2D3748", fontSize: 11, letterSpacing: "0.06em" }}>YOUR DATA IS SAFE</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Reassurance pills */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {["🔒 Still in your Drive", "✓ Nothing was lost"].map((t) => (
            <span key={t} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 20, padding: "5px 12px",
              fontSize: 11, color: "#4A5568",
            }}>{t}</span>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={onSignIn}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            width: "100%",
            background: btnHover
              ? "linear-gradient(135deg, #f05050, #E84545)"
              : "linear-gradient(135deg, #E84545, #c43030)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px 28px",
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: btnHover
              ? "0 8px 32px rgba(232,69,69,0.45)"
              : "0 4px 20px rgba(232,69,69,0.3)",
            transform: btnHover ? "translateY(-1px)" : "translateY(0)",
            transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
