import { isDone } from "../../utils/helpers";

function SectionsScreen({ sections, tasks, onOpen, onAdd, onDelete, onViewCompleted }) {
  return (
    <div style={{ padding:"32px 24px", maxWidth:1200, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6, flexWrap:"wrap", gap:10 }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, color:"#E2E8F0" }}>My Sections</div>
        <button onClick={onViewCompleted} style={{
          background:"none", border:"none", color:"#2D3748", fontSize:13, cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:6,
          padding:"6px 0", transition:"color 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.color="#3DD68C"}
          onMouseLeave={e => e.currentTarget.style.color="#2D3748"}
        >✓ View Completed Tasks</button>
      </div>
      <div style={{ color:"#2D3748", fontSize:13, marginBottom:28 }}>Pick a section to view and manage its tasks.</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14 }}>
        {sections.map(s => {
          const active = tasks.filter(t => t.sectionId === s.id && !isDone(t)).length;
          return (
            <div key={s.id} onClick={() => onOpen(s)} style={{
              background:"linear-gradient(145deg,#0E1826,#0A1220)",
              border:"1px solid rgba(255,255,255,0.06)", borderRadius:16,
              padding:"24px 20px", cursor:"pointer", position:"relative",
              display:"flex", flexDirection:"column", gap:10, minHeight:120,
              transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#E84545"; e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 12px 40px rgba(232,69,69,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
            >
              <button onClick={e => { e.stopPropagation(); onDelete(s.id); }} style={{
                position:"absolute", top:10, right:10, background:"none", border:"none",
                color:"rgba(255,255,255,0.1)", fontSize:13, cursor:"pointer", transition:"color 0.15s", lineHeight:1,
              }}
                onMouseEnter={e => e.currentTarget.style.color="#E84545"}
                onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,0.1)"}
              >✕</button>
              <div style={{ color:"#E2E8F0", fontWeight:700, fontSize:15 }}>{s.name}</div>
              <div style={{ color:"#2D3748", fontSize:12 }}>{active} active task{active !== 1 ? "s" : ""}</div>
            </div>
          );
        })}
        <div onClick={onAdd} style={{
          background:"transparent", border:"1px dashed rgba(255,255,255,0.08)", borderRadius:16,
          padding:"24px 20px", cursor:"pointer", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:8, minHeight:120,
          color:"#2D3748", transition:"all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#E84545"; e.currentTarget.style.color="#E84545"; e.currentTarget.style.transform="translateY(-3px)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#2D3748"; e.currentTarget.style.transform="translateY(0)"; }}
        >
          <div style={{ fontSize:28, lineHeight:1 }}>+</div>
          <div style={{ fontSize:13, fontWeight:600 }}>Add Section</div>
        </div>
      </div>
    </div>
  );
}

export default SectionsScreen;