import { useState, useEffect } from "react";

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const QUADRANTS = [
  { key: "HH", label: "Do First",  sub: "High impact · urgent",     color: "#E84545", dim: "rgba(232,69,69,0.12)",  tasks: ["Launch campaign", "Fix critical bug"] },
  { key: "HL", label: "Schedule",  sub: "High impact · not urgent",  color: "#F5A623", dim: "rgba(245,166,35,0.12)", tasks: ["Write Q3 strategy", "Learn new skill"] },
  { key: "LH", label: "Delegate",  sub: "Low impact · urgent",       color: "#4A9EE8", dim: "rgba(74,158,232,0.12)", tasks: ["Reply to newsletter", "Book travel"] },
  { key: "LL", label: "Drop",      sub: "Low impact · not urgent",   color: "#555E6E", dim: "rgba(85,94,110,0.12)",  tasks: ["Reorganise desktop", "Old side project"] },
];

function MatrixCard({ q, delay }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{
      background: q.dim,
      border: `1px solid ${q.color}22`,
      borderRadius: 14,
      padding: "18px 16px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.5s ease, transform 0.5s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: q.color, flexShrink: 0 }} />
        <span style={{ color: q.color, fontWeight: 700, fontSize: 12, letterSpacing: "0.04em" }}>{q.label}</span>
      </div>
      <div style={{ color: "#3A4A5C", fontSize: 10, marginBottom: 12, letterSpacing: "0.03em" }}>{q.sub}</div>
      {q.tasks.map((task, i) => (
        <div key={i} style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderLeft: `2px solid ${q.color}`,
          borderRadius: 7,
          padding: "7px 10px",
          marginBottom: i < q.tasks.length - 1 ? 6 : 0,
          color: "#8896A8",
          fontSize: 11,
          fontWeight: 500,
        }}>{task}</div>
      ))}
    </div>
  );
}

function LoginScreen({ onSignIn }) {
  const [btnHover, setBtnHover] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080E18",
      color: "#E2E8F0",
      fontFamily: "'DM Sans', sans-serif",
      overflowX: "hidden",
    }}>
      <style>{`
        @keyframes float     { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes gridpulse { 0%,100% { opacity: 0.03 } 50% { opacity: 0.07 } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition-duration: 0.01ms !important; } }
      `}</style>

      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
        backgroundSize: "60px 60px",
        animation: "gridpulse 6s ease-in-out infinite",
      }} />

      {/* Red glow */}
      <div style={{
        position: "fixed", top: "-20%", right: "-10%",
        width: "600px", height: "600px",
        borderRadius: "50%",
        background: "radial-gradient(circle,rgba(232,69,69,0.08) 0%,transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* HERO */}
      <section style={{
        position: "relative", zIndex: 1,
        maxWidth: 1100, margin: "0 auto",
        padding: "100px 32px 80px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 64,
        alignItems: "center",
      }}>
        {/* Left: copy */}
        <div style={{
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(232,69,69,0.1)", border: "1px solid rgba(232,69,69,0.2)",
            borderRadius: 20, padding: "5px 14px", marginBottom: 28,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E84545", animation: "float 2s ease-in-out infinite" }} />
            <span style={{ color: "#E84545", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Personal task system
            </span>
          </div>

          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(42px,5vw,64px)",
            lineHeight: 1.08,
            letterSpacing: "-1px",
            color: "#E2E8F0",
            marginBottom: 24,
          }}>
            Think less.<br />
            <span style={{ color: "#E84545", fontStyle: "italic" }}>Do more.</span>
          </h1>

          <p style={{ color: "#4A5568", fontSize: 16, lineHeight: 1.75, marginBottom: 36, maxWidth: 400 }}>
            Flow uses the Eisenhower matrix to help you cut through the noise — so every task has a place, and nothing important slips through.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
            {[
              { icon: "🔒", text: "Private — tasks live in your Google Drive, not our servers" },
              { icon: "⚡", text: "Brain dump first, prioritise later" },
              { icon: "🌐", text: "Works on any device, no install needed" },
            ].map((f) => (
              <div key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: 12, color: "#4A5568", fontSize: 13 }}>
                <span style={{ fontSize: 15, lineHeight: 1.6, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ lineHeight: 1.6 }}>{f.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onSignIn}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              background: btnHover ? "#f0f0f0" : "#fff",
              color: "#0A0F1A",
              border: "none",
              display: "inline-flex", alignItems: "center", gap: 12,
              padding: "14px 28px",
              borderRadius: 12,
              fontSize: 14, fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: btnHover
                ? "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.15)"
                : "0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08)",
              transform: btnHover ? "translateY(-2px)" : "translateY(0)",
              transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {GOOGLE_SVG}
            Sign in with Google — it&apos;s free
          </button>

          <div style={{ marginTop: 16, color: "#2D3748", fontSize: 12 }}>
            No account needed beyond your Google login.
          </div>
        </div>

        {/* Right: matrix preview */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
        }}>
          <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06))" }} />
            <span style={{ color: "#2D3748", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Eisenhower Matrix</span>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(255,255,255,0.06),transparent)" }} />
          </div>
          {QUADRANTS.map((q, i) => (
            <MatrixCard key={q.key} q={q} delay={300 + i * 120} />
          ))}
          <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#1E2A3A", fontSize: 11, marginTop: 4, letterSpacing: "0.04em" }}>
            Every task finds its place automatically
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "60px 32px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
          <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.05)" }} />
          <span style={{ color: "#2D3748", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>How it works</span>
          <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {[
            { step: "01", title: "Brain dump",  body: "Capture everything on your mind in one go — one task per line, no thinking required.", accent: "#E84545" },
            { step: "02", title: "Prioritise",  body: "Assign each task to a quadrant. Flow shows you exactly what to do first, schedule, delegate, or drop.", accent: "#F5A623" },
            { step: "03", title: "Execute",     body: "Work through your tasks. Track progress, add notes, set deadlines — all saved privately to your Drive.", accent: "#3DD68C" },
          ].map((s) => (
            <div key={s.step} style={{
              padding: "28px 24px",
              background: "linear-gradient(145deg,#0E1826,#0A1220)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderTop: `2px solid ${s.accent}`,
              borderRadius: 14,
            }}>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, color: `${s.accent}22`, marginBottom: 12, lineHeight: 1, letterSpacing: "-1px" }}>{s.step}</div>
              <div style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{s.title}</div>
              <div style={{ color: "#4A5568", fontSize: 13, lineHeight: 1.7 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER CTA */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "60px 32px 80px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(28px,4vw,42px)", color: "#E2E8F0", marginBottom: 16, letterSpacing: "-0.5px" }}>
          Ready to find your flow?
        </div>
        <p style={{ color: "#4A5568", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
          Sign in once. Your tasks live in your Drive forever.
        </p>
        <button
          onClick={onSignIn}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(232,69,69,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(232,69,69,0.2)"; }}
          style={{
            background: "#E84545", color: "#fff",
            border: "none",
            display: "inline-flex", alignItems: "center", gap: 12,
            padding: "14px 32px", borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 4px 16px rgba(232,69,69,0.2)",
            transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {GOOGLE_SVG}
          Get started with Google
        </button>
      </section>

      {/* Responsive */}
      <style>{`
        @media (max-width: 720px) {
          section:first-of-type {
            grid-template-columns: 1fr !important;
            padding: 60px 20px 40px !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default LoginScreen;
