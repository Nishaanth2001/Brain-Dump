import { useState, useEffect } from "react";
import { isDone } from "../../utils/helpers";

// Assign a consistent accent colour to each section based on its index
const SECTION_ACCENTS = [
  { color: "#E84545", dim: "rgba(232,69,69,0.08)",  glow: "rgba(232,69,69,0.15)"  },
  { color: "#F5A623", dim: "rgba(245,166,35,0.08)",  glow: "rgba(245,166,35,0.15)" },
  { color: "#4A9EE8", dim: "rgba(74,158,232,0.08)",  glow: "rgba(74,158,232,0.15)" },
  { color: "#3DD68C", dim: "rgba(61,214,140,0.08)",  glow: "rgba(61,214,140,0.15)" },
  { color: "#A78BFA", dim: "rgba(167,139,250,0.08)", glow: "rgba(167,139,250,0.15)"},
  { color: "#F472B6", dim: "rgba(244,114,182,0.08)", glow: "rgba(244,114,182,0.15)"},
];

const accent = (i) => SECTION_ACCENTS[i % SECTION_ACCENTS.length];

// Greeting based on time of day
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function SectionsScreen({ sections, tasks, onOpen, onAdd, onDelete, onViewCompleted, user }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 40); return () => clearTimeout(t); }, []);

  const totalActive    = tasks.filter((t) => !isDone(t)).length;
  const totalCompleted = tasks.filter((t) =>  isDone(t)).length;
  const overdue        = tasks.filter((t) => !isDone(t) && t.deadlineDate && t.deadlineDate < new Date().toISOString().split("T")[0]).length;
  const firstName      = user?.displayName?.split(" ")[0] || null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 28px 64px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .section-card:hover .section-arrow { opacity: 1 !important; transform: translateX(0) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        marginBottom: 48,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ color: "#3A4A5C", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              {greeting()}{firstName ? `, ${firstName}` : ""}
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(28px,4vw,42px)", color: "#E2E8F0", margin: 0, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
              My Sections
            </h1>
          </div>
          <button
            onClick={onViewCompleted}
            style={{ background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.2)", color: "#3DD68C", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, padding: "8px 16px", borderRadius: 20, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(61,214,140,0.15)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(61,214,140,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            ✓ View Completed
          </button>
        </div>

        {/* ── Stats bar ── */}
        {tasks.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            {[
              { label: "Active tasks",    value: totalActive,    color: "#E2E8F0", bg: "rgba(255,255,255,0.04)" },
              { label: "Completed",       value: totalCompleted, color: "#3DD68C", bg: "rgba(61,214,140,0.06)"  },
              overdue > 0 && { label: "Overdue", value: overdue, color: "#E84545", bg: "rgba(232,69,69,0.06)"  },
              { label: "Sections",        value: sections.length, color: "#4A9EE8", bg: "rgba(74,158,232,0.06)" },
            ].filter(Boolean).map((s) => (
              <div key={s.label} style={{ background: s.bg, border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 20px", display: "flex", flexDirection: "column", gap: 2, minWidth: 90 }}>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#3A4A5C", fontWeight: 600, letterSpacing: "0.04em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)", marginTop: 36 }} />
      </div>

      {/* ── Section cards ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}>
        {sections.map((s, i) => {
          const ac      = accent(i);
          const active  = tasks.filter((t) => t.sectionId === s.id && !isDone(t)).length;
          const done    = tasks.filter((t) => t.sectionId === s.id &&  isDone(t)).length;
          const ov      = tasks.filter((t) => t.sectionId === s.id && !isDone(t) && t.deadlineDate && t.deadlineDate < new Date().toISOString().split("T")[0]).length;
          const pct     = active + done > 0 ? Math.round((done / (active + done)) * 100) : 0;

          return (
            <div
              key={s.id}
              className="section-card"
              onClick={() => onOpen(s)}
              style={{
                background: "linear-gradient(145deg,#0E1826,#0A1220)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 18,
                padding: "24px 22px",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                minHeight: 160,
                transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                opacity: visible ? 1 : 0,
                animation: visible ? `fadeUp 0.4s ease ${i * 0.06}s both` : "none",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = ac.color; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 16px 48px ${ac.glow}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Accent top bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${ac.color}, transparent)`, borderRadius: "18px 18px 0 0" }} />

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "rgba(255,255,255,0.1)", fontSize: 12, cursor: "pointer", transition: "color 0.15s", lineHeight: 1, padding: 4, borderRadius: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E84545")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.1)")}
              >✕</button>

              {/* Section icon + name */}
              <div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: ac.dim, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 16 }}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 16, lineHeight: 1.2, paddingRight: 20 }}>{s.name}</div>
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: active > 0 ? "#E2E8F0" : "#3A4A5C", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "3px 8px", fontWeight: 600 }}>
                  {active} active
                </span>
                {ov > 0 && (
                  <span style={{ fontSize: 11, color: "#E84545", background: "rgba(232,69,69,0.08)", borderRadius: 6, padding: "3px 8px", fontWeight: 600 }}>
                    {ov} overdue
                  </span>
                )}
                {done > 0 && (
                  <span style={{ fontSize: 11, color: "#3DD68C", background: "rgba(61,214,140,0.06)", borderRadius: 6, padding: "3px 8px", fontWeight: 600 }}>
                    {done} done
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {active + done > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: "#3A4A5C", fontWeight: 600, letterSpacing: "0.04em" }}>PROGRESS</span>
                    <span style={{ fontSize: 10, color: pct === 100 ? "#3DD68C" : "#4A5568", fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#3DD68C" : ac.color, borderRadius: 2, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              )}

              {/* Arrow */}
              <div className="section-arrow" style={{ position: "absolute", bottom: 18, right: 18, color: ac.color, fontSize: 16, opacity: 0, transform: "translateX(-4px)", transition: "all 0.2s ease" }}>→</div>
            </div>
          );
        })}

        {/* Add section card */}
        <div
          onClick={onAdd}
          style={{
            background: "transparent",
            border: "1px dashed rgba(255,255,255,0.07)",
            borderRadius: 18,
            padding: "24px 22px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            minHeight: 160,
            color: "#2D3748",
            transition: "all 0.2s ease",
            opacity: visible ? 1 : 0,
            animation: visible ? `fadeUp 0.4s ease ${sections.length * 0.06}s both` : "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#E84545"; e.currentTarget.style.color = "#E84545"; e.currentTarget.style.background = "rgba(232,69,69,0.04)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#2D3748"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, border: "1px dashed currentColor", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, lineHeight: 1 }}>+</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>New Section</div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {sections.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px", opacity: visible ? 1 : 0, transition: "opacity 0.5s ease 0.2s" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗂️</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: "#E2E8F0", marginBottom: 8 }}>No sections yet</div>
          <div style={{ color: "#4A5568", fontSize: 13, marginBottom: 28 }}>Create your first section to start organising your tasks.</div>
          <button onClick={onAdd} style={{ background: "#E84545", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: "pointer" }}>
            + Create Section
          </button>
        </div>
      )}
    </div>
  );
}

export default SectionsScreen;
