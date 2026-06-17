import { P, getDisplayStatus, getStatusBadge, todayStr } from "../../utils/helpers";
import { isTaskOnTrack, distributeTaskAcrossDays } from "../../utils/scheduleHelpers";
import { useTheme } from "../../contexts/ThemeContext";

function TaskCard({ task, onCycle, onDelete, onEdit, onProgress, blockedTimes }) {
  const { theme } = useTheme();
  const pr      = P(task.priority);
  const ds      = getDisplayStatus(task);
  const sb      = getStatusBadge(task);
  const today   = todayStr();
  const isIP    = task.status === "In Progress";
  const pct     = task.progress ?? 0;
  const trackBg = theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)";

  // Get tracking info and today's target
  const trackInfo = isTaskOnTrack(task, blockedTimes);
  const schedule = distributeTaskAcrossDays(task, blockedTimes);
  const todaySchedule = schedule.find(s => s.date === today);
  const todayTarget = todaySchedule ? todaySchedule.targetProgress : 0;

  const borderColor =
    isIP && task.deadlineDate && task.deadlineDate < today
      ? "rgba(232,69,69,0.25)"
      : task.status === "Not Started" && task.startDate && task.startDate < today
      ? "rgba(245,166,35,0.25)"
      : theme.border;

  return (
    <div
      onClick={() => onEdit(task.id)}
      style={{
        background: theme.bgCard,
        border:`1px solid ${borderColor}`,
        borderLeft:`3px solid ${pr.color}`,
        borderRadius:12, padding:"14px 16px", marginBottom:8,
        cursor:"pointer", transition:"all 0.15s", position:"relative",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow=theme.shadowCard; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
    >
      {/* Slider thumb CSS — uses CSS custom props set inline so each card picks its own priority colour */}
      <style>{`
        .prog-slider { -webkit-appearance:none; appearance:none; height:4px; border-radius:4px; outline:none; cursor:pointer; border:none; display:block; }
        .prog-slider::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:var(--prog-color); border:2px solid var(--prog-border); cursor:pointer; transition:transform 0.15s; }
        .prog-slider::-webkit-slider-thumb:hover { transform:scale(1.25); }
        .prog-slider::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:var(--prog-color); border:2px solid var(--prog-border); cursor:pointer; }
        .prog-slider:focus { outline:none; }
        .prog-slider:focus-visible::-webkit-slider-thumb { box-shadow:0 0 0 3px var(--prog-glow); }
      `}</style>

      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:theme.text, fontWeight:600, fontSize:14, marginBottom:6 }}>{task.title}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, alignItems:"center" }}>
            <span style={{ background:pr.dim, color:pr.color, fontSize:10, padding:"2px 8px", borderRadius:5, fontWeight:700 }}>{pr.label}</span>
            <span style={{ background:sb.bg,  color:sb.color, fontSize:10, padding:"2px 8px", borderRadius:5, fontWeight:600 }}>{sb.text}</span>
            {task.startDate    && <span style={{ color:theme.textDim, fontSize:11 }}>🟢 {task.startDate}</span>}
            {task.deadlineDate && <span style={{ color:theme.textDim, fontSize:11 }}>⏰ {task.deadlineDate}</span>}
            {(task.tags||[]).map((g) => (
              <span key={g} style={{ background:theme.blueDim, color:theme.blue, fontSize:10, padding:"2px 7px", borderRadius:4 }}>{g}</span>
            ))}
          </div>

          {/* ── Progress slider — only shown while In Progress for non-routine tasks ── */}
          {isIP && task.taskType !== "routine" && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${theme.border}` }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ color:theme.textDim, fontSize:10, fontWeight:700, letterSpacing:"0.05em", fontFamily:"'DM Sans',sans-serif" }}>PROGRESS</span>
                <span style={{ color:pr.color, fontSize:11, fontWeight:700, fontFamily:"'DM Sans',sans-serif", minWidth:32, textAlign:"right" }}>{pct}%</span>
              </div>
              <input
                type="range"
                className="prog-slider"
                min={0} max={100} step={5}
                value={pct}
                onChange={(e) => onProgress(task.id, Number(e.target.value))}
                style={{
                  width: "100%",
                  background: `linear-gradient(to right, ${pr.color} ${pct}%, ${trackBg} ${pct}%)`,
                  "--prog-color":  pr.color,
                  "--prog-border": theme.bgCardSolid,
                  "--prog-glow":   pr.color + "55",
                }}
              />
            </div>
          )}

          {/* Today's Target Indicator (shown only for In Progress non-routine tasks with schedule) */}
          {isIP && task.taskType !== "routine" && todayTarget > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: theme.textDim, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>
                  📅 TODAY'S TARGET
                </span>
                <span style={{ color: trackInfo.onTrack ? theme.green : theme.orange, fontSize: 10, fontWeight: 700 }}>
                  {todayTarget}%
                </span>
              </div>
              {trackInfo.message && (
                <div style={{ 
                  fontSize: 9, fontWeight: 600,
                  color: trackInfo.onTrack ? theme.green : theme.orange,
                  marginTop: 2
                }}>
                  {trackInfo.message}
                </div>
              )}
            </div>
          )}

          {task.notes && (
            <div style={{ marginTop:8, color:theme.textDim, fontSize:11, borderTop:`1px solid ${theme.border}`, paddingTop:8 }}>
              {task.notes.length>120 ? task.notes.slice(0,120)+"…" : task.notes}
            </div>
          )}
        </div>
        <div onClick={(e)=>e.stopPropagation()} style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0 }}>
          <button onClick={()=>onCycle(task.id)} style={{
            background:ds.bg, color:ds.color, border:`1px solid ${ds.ring}`,
            borderRadius:7, padding:"5px 10px", fontSize:10, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif", fontWeight:700, whiteSpace:"nowrap", transition:"all 0.15s",
          }}>{ds.label}</button>
          <button onClick={()=>onDelete(task.id)} style={{
            background:"rgba(232,69,69,0.06)", color:"#E84545", border:"1px solid rgba(232,69,69,0.15)",
            borderRadius:7, padding:"4px 10px", fontSize:10, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif", fontWeight:600, transition:"all 0.15s",
          }}>✕ Delete</button>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
