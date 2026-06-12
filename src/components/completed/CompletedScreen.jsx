import { isDone, P } from "../../utils/helpers";

function CompletedScreen({ tasks, sections, activeSectionId, onBack, onDelete }) {
  const done = [...tasks.filter((t) => isDone(t) && (!activeSectionId || t.sectionId === activeSectionId))]
    .sort((a, b) => ((b.completedAt || "") > (a.completedAt || "") ? 1 : -1));

  const heading = activeSectionId
    ? `✓ Completed — ${sections.find((s) => s.id === activeSectionId)?.name || ""}`
    : "✓ All Completed Tasks";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8, padding: "6px 12px", color: "#4A5568", fontSize: 12, cursor: "pointer",
          fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
        }}>← Back</button>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#E2E8F0" }}>{heading}</span>
      </div>

      {done.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <div style={{ color: "#4A5568", fontSize: 16 }}>No completed tasks yet</div>
        </div>
      ) : (
        done.map((t) => {
          const pr  = P(t.priority);
          const sec = sections.find((s) => s.id === t.sectionId);
          return (
            <div key={t.id} style={{
              background: "linear-gradient(145deg,#0E1826,#0A1220)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderLeft: `3px solid ${pr.color}`,
              borderRadius: 12, padding: "14px 16px", marginBottom: 8,
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#E2E8F0", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{t.title}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                    <span style={{ background: pr.dim, color: pr.color, fontSize: 10, padding: "2px 8px", borderRadius: 5, fontWeight: 700 }}>{pr.label}</span>
                    <span style={{ background: "rgba(61,214,140,0.1)", color: "#3DD68C", fontSize: 10, padding: "2px 8px", borderRadius: 5, fontWeight: 600 }}>{t.status}</span>
                    {sec && <span style={{ background: "rgba(255,255,255,0.05)", color: "#8896A8", fontSize: 10, padding: "2px 8px", borderRadius: 5 }}>{sec.name}</span>}
                    {t.completedAt && <span style={{ color: "#3A4A5C", fontSize: 11 }}>✓ {t.completedAt}</span>}
                  </div>
                  {t.notes && (
                    <div style={{ marginTop: 8, color: "#3A4A5C", fontSize: 11, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8 }}>
                      {t.notes.slice(0, 120)}{t.notes.length > 120 ? "…" : ""}
                    </div>
                  )}
                </div>
                <button onClick={() => onDelete(t.id)} style={{
                  background: "rgba(232,69,69,0.06)", color: "#E84545", border: "1px solid rgba(232,69,69,0.15)",
                  borderRadius: 7, padding: "4px 10px", fontSize: 10, cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
                }}>✕</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default CompletedScreen;
