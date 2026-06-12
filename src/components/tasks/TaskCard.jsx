import { P, getDisplayStatus, getStatusBadge, todayStr } from "../../utils/helpers";

function TaskCard({ task, onCycle, onDelete, onEdit }) {
  const pr    = P(task.priority);
  const ds    = getDisplayStatus(task);
  const sb    = getStatusBadge(task);
  const today = todayStr();

  const borderColor =
    task.status === "In Progress" && task.deadlineDate && task.deadlineDate < today
      ? "rgba(232,69,69,0.2)"
      : task.status === "Not Started" && task.startDate && task.startDate < today
      ? "rgba(245,166,35,0.2)"
      : "rgba(255,255,255,0.05)";

  return (
    <div
      onClick={() => onEdit(task.id)}
      style={{
        background: "linear-gradient(145deg,#0E1826,#0A1220)",
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${pr.color}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 8,
        cursor: "pointer",
        transition: "all 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#E2E8F0", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{task.title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
            <span style={{ background: pr.dim, color: pr.color, fontSize: 10, padding: "2px 8px", borderRadius: 5, fontWeight: 700 }}>{pr.label}</span>
            <span style={{ background: sb.bg,  color: sb.color, fontSize: 10, padding: "2px 8px", borderRadius: 5, fontWeight: 600 }}>{sb.text}</span>
            {task.startDate    && <span style={{ color: "#3A4A5C", fontSize: 11 }}>🟢 {task.startDate}</span>}
            {task.deadlineDate && <span style={{ color: "#3A4A5C", fontSize: 11 }}>⏰ {task.deadlineDate}</span>}
            {(task.tags || []).map((g) => (
              <span key={g} style={{ background: "rgba(74,158,232,0.1)", color: "#4A9EE8", fontSize: 10, padding: "2px 7px", borderRadius: 4 }}>{g}</span>
            ))}
          </div>
          {task.notes && (
            <div style={{ marginTop: 8, color: "#3A4A5C", fontSize: 11, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8 }}>
              {task.notes.length > 120 ? task.notes.slice(0, 120) + "…" : task.notes}
            </div>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
          <button
            onClick={() => onCycle(task.id)}
            style={{
              background: ds.bg, color: ds.color, border: `1px solid ${ds.ring}`,
              borderRadius: 7, padding: "5px 10px", fontSize: 10, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700, whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >{ds.label}</button>
          <button
            onClick={() => onDelete(task.id)}
            style={{
              background: "rgba(232,69,69,0.06)", color: "#E84545", border: "1px solid rgba(232,69,69,0.15)",
              borderRadius: 7, padding: "4px 10px", fontSize: 10, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, transition: "all 0.15s",
            }}
          >✕ Delete</button>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
