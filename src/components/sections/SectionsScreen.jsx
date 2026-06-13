import { useState, useEffect } from "react";
import { isDone } from "../../utils/helpers";
import { useTheme } from "../../contexts/ThemeContext";

const SECTION_ACCENTS = [
  { color:"#E84545", dim:"rgba(232,69,69,0.08)",  glow:"rgba(232,69,69,0.15)"   },
  { color:"#F5A623", dim:"rgba(245,166,35,0.08)",  glow:"rgba(245,166,35,0.15)"  },
  { color:"#4A9EE8", dim:"rgba(74,158,232,0.08)",  glow:"rgba(74,158,232,0.15)"  },
  { color:"#3DD68C", dim:"rgba(61,214,140,0.08)",  glow:"rgba(61,214,140,0.15)"  },
  { color:"#A78BFA", dim:"rgba(167,139,250,0.08)", glow:"rgba(167,139,250,0.15)" },
  { color:"#F472B6", dim:"rgba(244,114,182,0.08)", glow:"rgba(244,114,182,0.15)" },
];

const accent = (i) => SECTION_ACCENTS[i % SECTION_ACCENTS.length];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function SectionsScreen({ sections, tasks, onOpen, onAdd, onDelete, onViewCompleted, user }) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 40); return () => clearTimeout(t); }, []);

  const today          = new Date().toISOString().split("T")[0];
  const totalActive    = tasks.filter((t) => !isDone(t)).length;
  const totalCompleted = tasks.filter((t) =>  isDone(t)).length;
  const overdue        = tasks.filter((t) => !isDone(t) && t.deadlineDate && t.deadlineDate < today).length;
  const firstName      = user?.displayName?.split(" ")[0] || null;

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"48px 28px 64px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .section-card:hover .section-arrow { opacity:1 !important; transform:translateX(0) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease", marginBottom:48,
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ color:theme.textDim, fontSize:12, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
              {greeting()}{firstName ? `, ${firstName}` : ""}
            </div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(28px,4vw,42px)", color:theme.text, margin:0, letterSpacing:"-0.5px", lineHeight:1.1 }}>
              My Sections
            </h1>
          </div>
          <button
            onClick={onViewCompleted}
            style={{ background:theme.greenDim, border:`1px solid ${theme.green}33`, color:theme.green, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, padding:"8px 16px", borderRadius:20, transition:"all 0.15s", display:"flex", alignItems:"center", gap:6, marginTop:4 }}
            onMouseEnter={(e) => { e.currentTarget.style.background=`${theme.green}22`; e.currentTarget.style.transform="translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background=theme.greenDim; e.currentTarget.style.transform="translateY(0)"; }}
          >✓ View Completed</button>
        </div>

        {/* Stats bar */}
        {tasks.length > 0 && (
          <div style={{ display:"flex", gap:12, marginTop:28, flexWrap:"wrap" }}>
            {[
              { label:"Active tasks",  value:totalActive,    color:theme.text,   bg:theme.bgInput       },
              { label:"Completed",     value:totalCompleted, color:theme.green,  bg:theme.greenDim      },
              overdue > 0 && { label:"Overdue", value:overdue, color:theme.red,  bg:theme.redDim        },
              { label:"Sections",      value:sections.length,color:theme.blue,   bg:theme.blueDim       },
            ].filter(Boolean).map((s) => (
              <div key={s.label} style={{ background:s.bg, border:`1px solid ${theme.border}`, borderRadius:12, padding:"12px 20px", display:"flex", flexDirection:"column", gap:2, minWidth:90 }}>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:11, color:theme.textMuted, fontWeight:600, letterSpacing:"0.04em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height:1, background:`linear-gradient(90deg,${theme.border},transparent)`, marginTop:36 }} />
      </div>

      {/* Section cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>
        {sections.map((s, i) => {
          const ac     = accent(i);
          const active = tasks.filter((t) => t.sectionId===s.id && !isDone(t)).length;
          const done   = tasks.filter((t) => t.sectionId===s.id &&  isDone(t)).length;
          const ov     = tasks.filter((t) => t.sectionId===s.id && !isDone(t) && t.deadlineDate && t.deadlineDate < today).length;
          const pct    = active+done > 0 ? Math.round((done/(active+done))*100) : 0;

          return (
            <div
              key={s.id}
              className="section-card"
              onClick={() => onOpen(s)}
              style={{
                background: theme.bgCard,
                border: `1px solid ${theme.border}`,
                borderRadius:18, padding:"24px 22px", cursor:"pointer",
                position:"relative", display:"flex", flexDirection:"column", gap:14,
                minHeight:160, overflow:"hidden",
                transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                opacity: visible ? 1 : 0,
                animation: visible ? `fadeUp 0.4s ease ${i*0.06}s both` : "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor=ac.color; e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 16px 48px ${ac.glow}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor=theme.border; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
            >
              {/* Accent top bar */}
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${ac.color},transparent)`, borderRadius:"18px 18px 0 0" }} />

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                style={{ position:"absolute", top:12, right:12, background:"none", border:"none", color:theme.textFaint, fontSize:12, cursor:"pointer", transition:"color 0.15s", lineHeight:1, padding:4, borderRadius:4 }}
                onMouseEnter={(e) => e.currentTarget.style.color="#E84545"}
                onMouseLeave={(e) => e.currentTarget.style.color=theme.textFaint}
              >✕</button>

              {/* Icon + name */}
              <div>
                <div style={{ width:36, height:36, borderRadius:10, background:ac.dim, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12, fontSize:16, color:ac.color, fontWeight:700 }}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ color:theme.text, fontWeight:700, fontSize:16, lineHeight:1.2, paddingRight:20 }}>{s.name}</div>
              </div>

              {/* Chips */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:active>0?theme.text:theme.textDim, background:theme.bgInput, borderRadius:6, padding:"3px 8px", fontWeight:600 }}>
                  {active} active
                </span>
                {ov > 0 && (
                  <span style={{ fontSize:11, color:"#E84545", background:"rgba(232,69,69,0.08)", borderRadius:6, padding:"3px 8px", fontWeight:600 }}>
                    {ov} overdue
                  </span>
                )}
                {done > 0 && (
                  <span style={{ fontSize:11, color:theme.green, background:theme.greenDim, borderRadius:6, padding:"3px 8px", fontWeight:600 }}>
                    {done} done
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {active+done > 0 && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                    <span style={{ fontSize:10, color:theme.textDim, fontWeight:600, letterSpacing:"0.04em" }}>PROGRESS</span>
                    <span style={{ fontSize:10, color:pct===100?theme.green:theme.textMuted, fontWeight:700 }}>{pct}%</span>
                  </div>
                  <div style={{ height:3, background:theme.bgInput, borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:pct===100?theme.green:ac.color, borderRadius:2, transition:"width 0.6s ease" }} />
                  </div>
                </div>
              )}

              {/* Arrow */}
              <div className="section-arrow" style={{ position:"absolute", bottom:18, right:18, color:ac.color, fontSize:16, opacity:0, transform:"translateX(-4px)", transition:"all 0.2s ease" }}>→</div>
            </div>
          );
        })}

        {/* Add card */}
        <div
          onClick={onAdd}
          style={{
            background:"transparent", border:`1px dashed ${theme.border}`,
            borderRadius:18, padding:"24px 22px", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:10, minHeight:160, color:theme.textMuted, transition:"all 0.2s ease",
            opacity: visible ? 1 : 0,
            animation: visible ? `fadeUp 0.4s ease ${sections.length*0.06}s both` : "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor="#E84545"; e.currentTarget.style.color="#E84545"; e.currentTarget.style.background="rgba(232,69,69,0.04)"; e.currentTarget.style.transform="translateY(-4px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor=theme.border; e.currentTarget.style.color=theme.textMuted; e.currentTarget.style.background="transparent"; e.currentTarget.style.transform="translateY(0)"; }}
        >
          <div style={{ width:40, height:40, borderRadius:12, border:"1px dashed currentColor", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, lineHeight:1 }}>+</div>
          <div style={{ fontSize:13, fontWeight:600 }}>New Section</div>
        </div>
      </div>

      {/* Empty state */}
      {sections.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 24px", opacity:visible?1:0, transition:"opacity 0.5s ease 0.2s" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🗂️</div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:theme.text, marginBottom:8 }}>No sections yet</div>
          <div style={{ color:theme.textMuted, fontSize:13, marginBottom:28 }}>Create your first section to start organising your tasks.</div>
          <button onClick={onAdd} style={{ background:"#E84545", color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:700, cursor:"pointer" }}>
            + Create Section
          </button>
        </div>
      )}
    </div>
  );
}

export default SectionsScreen;
