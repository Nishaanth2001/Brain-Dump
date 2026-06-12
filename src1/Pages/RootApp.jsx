import LoginScreen from "../components/auth/LoginScreen";
import SectionsScreen from "../components/sections/SectionsScreen";
import AppScreen from "../components/tasks/AppScreen";
import CompletedScreen from "../components/completed/CompletedScreen";
import AddSectionModal from "../components/sections/AddSectionModal";
import Toast from "../components/common/Toast";
import { loadFromDrive, saveToDrive } from "../utils/driveApi";
import { uid, todayStr } from "../utils/helpers";
import { auth, provider } from "../firebase";
import {
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from "firebase/auth";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";

const encodeSection = (name) => encodeURIComponent(name);
const decodeSection = (slug)  => decodeURIComponent(slug);

// ── Shell ──────────────────────────────────────────────────────────────────────
function Shell({ user, syncState, signOut, children }) {
  return (
    <div style={{ background:"#080E18", color:"#E2E8F0", fontFamily:"'DM Sans',sans-serif", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#080E18;color:#E2E8F0;font-family:'DM Sans',sans-serif}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#080E18}::-webkit-scrollbar-thumb{background:#1E2A3A;border-radius:3px}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5)}
        select option{background:#0E1826;color:#E2E8F0}
      `}</style>
      <header style={{
        background:"rgba(8,14,24,0.9)", borderBottom:"1px solid rgba(255,255,255,0.05)",
        padding:"14px 24px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
        position:"sticky", top:0, zIndex:50, backdropFilter:"blur(20px)",
      }}>
        <div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#E2E8F0", lineHeight:1 }}>
            Flow<span style={{ color:"#E84545" }}>.</span>
          </div>
          <div style={{ fontSize:9, color:"#2D3748", letterSpacing:"0.1em", marginTop:2, textTransform:"uppercase" }}>Task System</div>
        </div>

        {syncState.state && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#2D3748" }}>
            <div style={{
              width:7, height:7, borderRadius:"50%", flexShrink:0,
              background: syncState.state==="syncing"?"#F5A623":syncState.state==="synced"?"#3DD68C":"#E84545",
              animation: syncState.state==="syncing" ? "pulse 1s infinite" : "none",
            }} />
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
            <span>{syncState.label}</span>
          </div>
        )}

        {user && (
          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:20, padding:"4px 12px 4px 4px" }}>
              <img src={user.photoURL||""} alt="" onError={e => e.target.style.display="none"} style={{ width:24, height:24, borderRadius:"50%", objectFit:"cover" }} />
              <span style={{ fontSize:12, color:"#8896A8" }}>{user.displayName||user.email||""}</span>
            </div>
            <button onClick={signOut} style={{
              background:"rgba(255,255,255,0.04)", color:"#4A5568", border:"1px solid rgba(255,255,255,0.06)",
              borderRadius:8, padding:"7px 14px", fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600,
            }}>Sign out</button>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}

// ── Loading splash ─────────────────────────────────────────────────────────────
function LoadingSplash({ label = "Loading…" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"80vh", gap:16 }}>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:32, color:"#E2E8F0" }}>
        Flow<span style={{ color:"#E84545" }}>.</span>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:7, height:7, borderRadius:"50%", background:"#E84545",
            animation:`bounce 1s ease-in-out ${i*0.15}s infinite`,
          }} />
        ))}
      </div>
      <div style={{ color:"#4A5568", fontSize:13 }}>{label}</div>
      <style>{`@keyframes bounce{0%,100%{opacity:0.2;transform:translateY(0)}50%{opacity:1;transform:translateY(-6px)}}`}</style>
    </div>
  );
}

// ── RootApp ────────────────────────────────────────────────────────────────────
function RootApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tasks,      setTasks]      = useState([]);
  const [sections,   setSections]   = useState([]);
  const [user,       setUser]       = useState(null);
  const [authReady,  setAuthReady]  = useState(false);
  const [driveReady, setDriveReady] = useState(false);
  const [syncState,  setSyncState]  = useState({ state:"", label:"" });
  const [toast,      setToast]      = useState({ msg:"", type:"", visible:false });
  const [addSectionOpen, setAddSectionOpen] = useState(false);

  const tokenRef  = useRef(null);
  const fileIdRef = useRef(null);
  const saveTimer = useRef(null);

  const showToast  = useCallback((msg, type="") => {
    setToast({ msg, type, visible:true });
    setTimeout(() => setToast(t => ({...t, visible:false})), 2800);
  }, []);

  const syncStatus = useCallback((state, label) => setSyncState({ state, label }), []);

  const scheduleSave = useCallback((t, s) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!tokenRef.current) return;
      syncStatus("syncing","Saving…");
      try {
        fileIdRef.current = await saveToDrive(tokenRef.current, fileIdRef.current, t, s);
        syncStatus("synced","Saved");
      } catch(e) {
        syncStatus("error","Save failed");
        showToast("Could not save to Drive","error");
      }
    }, 1200);
  }, [syncStatus, showToast]);

  const loadDriveData = useCallback(async (token) => {
    tokenRef.current = token;
    syncStatus("syncing","Loading…");
    try {
      const d = await loadFromDrive(token);
      setTasks(d.tasks);
      setSections(d.sections);
      fileIdRef.current = d.fileId;
      syncStatus("synced","Synced");
      setDriveReady(true);
    } catch(e) {
      syncStatus("error","Load failed");
      showToast("Could not load from Drive","error");
      setDriveReady(true);
    }
  }, [syncStatus, showToast]);

  // ── On mount: check for redirect result first, then auth state ────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // getRedirectResult resolves with the sign-in result after Google
        // redirects back to the app. Returns null if not a redirect flow.
        const result = await getRedirectResult(auth);

        if (result && !cancelled) {
          // Came back from Google redirect — extract the Drive access token
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential?.accessToken;
          if (token) {
            sessionStorage.setItem("flow_access_token", token);
            setUser(result.user);
            await loadDriveData(token);
            navigate("/sections", { replace: true });
          }
        }
      } catch(e) {
        console.error("Redirect result error:", e);
        if (!cancelled) showToast("Sign in failed — please try again.", "error");
      }

      // Now subscribe to ongoing auth state (persisted session)
      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (cancelled) return;

        if (firebaseUser) {
          setUser(firebaseUser);
          // Try to reuse a Drive token from this browser session
          const cached = sessionStorage.getItem("flow_access_token");
          if (cached && !tokenRef.current) {
            await loadDriveData(cached);
          } else if (!cached && !tokenRef.current) {
            // Firebase session alive but no Drive token (browser restarted)
            // Will show "reconnect" screen below
            setDriveReady(false);
          }
        } else {
          if (!cancelled) {
            setUser(null);
            setDriveReady(false);
          }
        }

        if (!cancelled) setAuthReady(true);
      });

      return unsub;
    };

    const unsubPromise = init();
    return () => {
      cancelled = true;
      unsubPromise.then(unsub => unsub?.());
    };
  }, [loadDriveData, navigate, showToast]);

  // ── Guard: redirect to "/" if not signed in ───────────────────────────────
  useEffect(() => {
    if (!authReady) return;
    if (!user && location.pathname !== "/") navigate("/", { replace: true });
  }, [authReady, user, location.pathname, navigate]);

  // ── Sign in — uses redirect (no popup, no COOP issues) ───────────────────
  const signIn = useCallback(() => {
    // signInWithRedirect navigates away from the app to Google,
    // then back. getRedirectResult (above) handles the return.
    signInWithRedirect(auth, provider);
  }, []);

  // ── Reconnect Drive after browser restart ─────────────────────────────────
  const reconnectDrive = useCallback(() => {
    signInWithRedirect(auth, provider);
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    sessionStorage.removeItem("flow_access_token");
    tokenRef.current = null;
    fileIdRef.current = null;
    setTasks([]); setSections([]); setUser(null); setDriveReady(false);
    syncStatus("","");
    navigate("/");
  }, [navigate, syncStatus]);

  // ── Task actions ──────────────────────────────────────────────────────────
  const cycleStatus = useCallback((id) => {
    const today = todayStr();
    const newTasks = tasks.map(t => {
      if (t.id !== id) return t;
      if (t.status === "Not Started") return { ...t, status:"In Progress" };
      if (t.status === "In Progress") {
        const isLate = t.deadlineDate && t.deadlineDate < today;
        return { ...t, status: isLate ? "Done Late" : "Done", completedAt: today };
      }
      return t;
    });
    setTasks(newTasks);
    scheduleSave(newTasks, sections);
  }, [tasks, sections, scheduleSave]);

  const deleteTask = useCallback((id) => {
    if (!confirm("Delete this task?")) return;
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks);
    scheduleSave(newTasks, sections);
    showToast("Task deleted","success");
  }, [tasks, sections, scheduleSave, showToast]);

  const saveTask = useCallback((updated, newBatch) => {
    const newTasks = newBatch
      ? [...tasks, ...newBatch]
      : tasks.map(t => t.id === updated.id ? updated : t);
    setTasks(newTasks);
    scheduleSave(newTasks, sections);
    if (!newBatch) showToast("Task saved","success");
  }, [tasks, sections, scheduleSave, showToast]);

  const moveType = useCallback((id) => {
    const newTasks = tasks.map(t => t.id !== id ? t : { ...t, taskType: t.taskType==="routine"?"ondemand":"routine" });
    setTasks(newTasks);
    scheduleSave(newTasks, sections);
    const t = newTasks.find(t => t.id === id);
    showToast(`Moved to ${t.taskType==="routine"?"Routine 🔁":"On Demand ⚡"}`,"success");
  }, [tasks, sections, scheduleSave, showToast]);

  // ── Derive active section from URL ────────────────────────────────────────
  const match = location.pathname.match(/^\/sections\/([^/]+)/);
  const activeSectionName = match ? decodeSection(match[1]) : null;
  const activeSection = activeSectionName && activeSectionName !== "completed"
    ? sections.find(s => s.name === activeSectionName) || null
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  // Firebase hasn't resolved yet
  if (!authReady) {
    return (
      <Shell user={null} syncState={{ state:"syncing", label:"Loading…" }} signOut={() => {}}>
        <LoadingSplash label="Checking your session…" />
      </Shell>
    );
  }

  // Firebase session alive but no Drive token (browser fully restarted)
  if (authReady && user && !driveReady && !tokenRef.current) {
    return (
      <Shell user={user} syncState={{ state:"", label:"" }} signOut={signOut}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"80vh", gap:20, padding:32 }}>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:24, color:"#E2E8F0" }}>
            Welcome back<span style={{ color:"#E84545" }}>.</span>
          </div>
          <p style={{ color:"#4A5568", fontSize:14, textAlign:"center", maxWidth:340, lineHeight:1.7 }}>
            Click below to reconnect to Google Drive and load your tasks.
          </p>
          <button onClick={reconnectDrive} style={{
            background:"#fff", color:"#0A0F1A", border:"none",
            display:"inline-flex", alignItems:"center", gap:12,
            padding:"12px 24px", borderRadius:12, fontSize:14, fontWeight:700,
            cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
            boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
            transition:"all 0.2s",
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell user={user} syncState={syncState} signOut={signOut}>
      <Routes>
        <Route path="/" element={
          user ? <Navigate to="/sections" replace /> : <LoginScreen onSignIn={signIn} />
        } />

        <Route path="/sections" element={
          !user ? <Navigate to="/" replace /> :
          <SectionsScreen
            sections={sections} tasks={tasks}
            onOpen={s => navigate(`/sections/${encodeSection(s.name)}`)}
            onAdd={() => setAddSectionOpen(true)}
            onDelete={id => {
              if (!confirm("Delete section and all its tasks?")) return;
              const ns = sections.filter(s => s.id !== id);
              const nt = tasks.filter(t => t.sectionId !== id);
              setSections(ns); setTasks(nt); scheduleSave(nt, ns);
            }}
            onViewCompleted={() => navigate("/sections/completed")}
          />
        } />

        <Route path="/sections/completed" element={
          !user ? <Navigate to="/" replace /> :
          <CompletedScreen
            tasks={tasks} sections={sections}
            activeSectionId={null}
            onBack={() => navigate("/sections")}
            onDelete={deleteTask}
          />
        } />

        <Route path="/sections/:sectionName" element={
          !user ? <Navigate to="/" replace /> :
          !activeSection ? (
            <div style={{ textAlign:"center", padding:"80px 24px", color:"#4A5568" }}>
              Section not found.{" "}
              <span style={{ color:"#E84545", cursor:"pointer" }} onClick={() => navigate("/sections")}>← Back</span>
            </div>
          ) :
          <AppScreen
            section={activeSection} tasks={tasks}
            onBack={() => navigate("/sections")}
            onCycle={cycleStatus}
            onDelete={deleteTask}
            onSave={saveTask}
            onMoveType={moveType}
            onViewCompleted={() => navigate(`/sections/${encodeSection(activeSection.name)}/completed`)}
          />
        } />

        <Route path="/sections/:sectionName/completed" element={
          !user ? <Navigate to="/" replace /> :
          !activeSection ? <Navigate to="/sections" replace /> :
          <CompletedScreen
            tasks={tasks} sections={sections}
            activeSectionId={activeSection.id}
            onBack={() => navigate(`/sections/${encodeSection(activeSection.name)}`)}
            onDelete={deleteTask}
          />
        } />

        <Route path="*" element={<Navigate to={user ? "/sections" : "/"} replace />} />
      </Routes>

      <AddSectionModal open={addSectionOpen} onClose={() => setAddSectionOpen(false)}
        onAdd={name => {
          const ns = [...sections, { id:uid(), name }];
          setSections(ns);
          scheduleSave(tasks, ns);
        }}
      />
      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </Shell>
  );
}

export default RootApp;
