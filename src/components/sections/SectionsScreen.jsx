import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

// ── 3-dot context menu ────────────────────────────────────────────────────────
function SectionMenu({ sectionId, sectionName, onDelete, onRename, onOpen }) {
  const { theme } = useTheme();
  const [open, setOpen]       = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal]   = useState(sectionName);
  const menuRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (renaming) { setNameVal(sectionName); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [renaming, sectionName]);

  const handleRenameSubmit = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== sectionName) onRename(sectionId, trimmed);
    setRenaming(false); setOpen(false);
  };

  const item = (danger) => ({
    display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
    cursor:"pointer", fontSize:13, borderRadius:8, transition:"background 0.1s",
    color: danger ? "#E84545" : theme.text,
    fontFamily:"'DM Sans',sans-serif", fontWeight:500, whiteSpace:"nowrap",
  });

  return (
    <div ref={menuRef} style={{ position:"absolute", top:10, right:10, zIndex:20 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{
          background: open ? theme.bgHover : "none", border:"none",
          borderRadius:6, color:theme.textMuted, fontSize:18,
          cursor:"pointer", padding:"2px 7px", lineHeight:1, transition:"all 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "none"; }}
      >⋯</button>

      {open && !renaming && (
        <div onClick={(e) => e.stopPropagation()} style={{
          position:"absolute", top:"calc(100% + 6px)", right:0,
          background:theme.bgCardSolid, border:`1px solid ${theme.border}`,
          borderRadius:12, padding:"6px", boxShadow:theme.shadow, minWidth:160,
          animation:"fadeUp 0.15s ease",
        }}>
          <div style={item(false)}
            onMouseEnter={(e) => e.currentTarget.style.background=theme.bgHover}
            onMouseLeave={(e) => e.currentTarget.style.background="transparent"}
            onClick={() => { setOpen(false); onOpen(); }}
          ><span>📂</span> Open</div>
          <div style={item(false)}
            onMouseEnter={(e) => e.currentTarget.style.background=theme.bgHover}
            onMouseLeave={(e) => e.currentTarget.style.background="transparent"}
            onClick={() => { setRenaming(true); setOpen(false); }}
          ><span>✏️</span> Rename</div>
          <div style={{ height:1, background:theme.border, margin:"5px 0" }} />
          <div style={item(true)}
            onMouseEnter={(e) => e.currentTarget.style.background="rgba(232,69,69,0.08)"}
            onMouseLeave={(e) => e.currentTarget.style.background="transparent"}
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(sectionId); }}
          ><span>🗑️</span> Delete</div>
        </div>
      )}

      {renaming && (
        <div onClick={(e) => e.stopPropagation()} style={{
          position:"absolute", top:"calc(100% + 6px)", right:0,
          background:theme.bgCardSolid, border:`1px solid ${theme.border}`,
          borderRadius:12, padding:"10px", boxShadow:theme.shadow, minWidth:200,
          animation:"fadeUp 0.15s ease",
        }}>
          <input ref={inputRef} value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key==="Enter") handleRenameSubmit();
              if (e.key==="Escape") { setRenaming(false); setOpen(false); }
            }}
            style={{
              width:"100%", background:theme.bgInput, border:`1px solid ${theme.borderInput}`,
              borderRadius:8, padding:"7px 10px", color:theme.text, fontSize:13,
              fontFamily:"'DM Sans',sans-serif", outline:"none", marginBottom:8,
            }}
          />
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={handleRenameSubmit} style={{ flex:1, background:"#E84545", color:"#fff", border:"none", borderRadius:7, padding:"6px 0", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Save</button>
            <button onClick={() => { setRenaming(false); setOpen(false); }} style={{ flex:1, background:theme.bgInput, color:theme.textMuted, border:`1px solid ${theme.border}`, borderRadius:7, padding:"6px 0", fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sortable section card ─────────────────────────────────────────────────────
function SectionCard({ section, index, tasks, onOpen, onDelete, onRename, isDragging }) {
  const { theme } = useTheme();
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging: isSelfDragging,
  } = useSortable({ id: section.id });

  const today  = new Date().toISOString().split("T")[0];
  const ac     = accent(index);
  const active = tasks.filter((t) => t.sectionId===section.id && !isDone(t)).length;
  const done   = tasks.filter((t) => t.sectionId===section.id &&  isDone(t)).length;
  const ov     = tasks.filter((t) => t.sectionId===section.id && !isDone(t) && t.deadlineDate && t.deadlineDate < today).length;
  const pct    = active+done > 0 ? Math.round((done/(active+done))*100) : 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSelfDragging ? "none" : transition,
    opacity: isSelfDragging ? 0 : 1,
    background: theme.bgCard,
    border: `1px solid ${theme.border}`,
    borderRadius:18, padding:"24px 22px", cursor:"grab",
    position:"relative", display:"flex", flexDirection:"column", gap:14,
    minHeight:160, overflow:"visible",
    animation: !isDragging ? `fadeUp 0.4s ease ${index*0.06}s both` : "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="section-card"
      onMouseEnter={(e) => {
        if (isDragging) return;
        e.currentTarget.style.borderColor = ac.color;
        e.currentTarget.style.transform   = CSS.Transform.toString(transform) || "translateY(-4px)";
        e.currentTarget.style.boxShadow   = `0 16px 48px ${ac.glow}`;
      }}
      onMouseLeave={(e) => {
        if (isDragging) return;
        e.currentTarget.style.borderColor = theme.border;
        e.currentTarget.style.boxShadow   = "none";
      }}
    >
      {/* Accent bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${ac.color},transparent)`, borderRadius:"18px 18px 0 0" }} />

      {/* Drag handle — separate from click area */}
      <div
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        style={{
          position:"absolute", top:10, left:12,
          color:theme.textFaint, fontSize:13, cursor:"grab",
          padding:"2px 4px", borderRadius:4, lineHeight:1,
          transition:"color 0.15s",
          userSelect:"none",
        }}
        onMouseEnter={(e) => e.currentTarget.style.color=theme.textMuted}
        onMouseLeave={(e) => e.currentTarget.style.color=theme.textFaint}
      >⠿</div>

      {/* 3-dot menu */}
      <SectionMenu
        sectionId={section.id}
        sectionName={section.name}
        onDelete={onDelete}
        onRename={onRename}
        onOpen={() => onOpen(section)}
      />

      {/* Card body — clicking navigates */}
      <div onClick={() => onOpen(section)} style={{ display:"flex", flexDirection:"column", gap:14, marginTop:4, flex:1, cursor:"pointer" }}>
        <div>
          <div style={{ width:36, height:36, borderRadius:10, background:ac.dim, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12, fontSize:16, color:ac.color, fontWeight:700 }}>
            {section.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ color:theme.text, fontWeight:700, fontSize:16, lineHeight:1.2, paddingRight:28 }}>{section.name}</div>
        </div>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:active>0?theme.text:theme.textDim, background:theme.bgInput, borderRadius:6, padding:"3px 8px", fontWeight:600 }}>{active} active</span>
          {ov>0 && <span style={{ fontSize:11, color:"#E84545", background:"rgba(232,69,69,0.08)", borderRadius:6, padding:"3px 8px", fontWeight:600 }}>{ov} overdue</span>}
          {done>0 && <span style={{ fontSize:11, color:theme.green, background:theme.greenDim, borderRadius:6, padding:"3px 8px", fontWeight:600 }}>{done} done</span>}
        </div>

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
      </div>

      <div className="section-arrow" style={{ position:"absolute", bottom:18, right:18, color:ac.color, fontSize:16, opacity:0, transform:"translateX(-4px)", transition:"all 0.2s ease" }}>→</div>
    </div>
  );
}

// Overlay card shown while dragging (ghost)
function DragGhostCard({ section, index }) {
  const { theme } = useTheme();
  const ac = accent(index);
  return (
    <div style={{
      background:theme.bgCard, border:`2px solid ${ac.color}`,
      borderRadius:18, padding:"24px 22px", minHeight:160,
      boxShadow:`0 24px 60px ${ac.glow}`, opacity:0.95,
      transform:"rotate(2deg) scale(1.03)",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${ac.color},transparent)`, borderRadius:"18px 18px 0 0" }} />
      <div style={{ width:36, height:36, borderRadius:10, background:ac.dim, display:"flex", alignItems:"center", justifyContent:"center", marginTop:12, marginBottom:12, fontSize:16, color:ac.color, fontWeight:700 }}>
        {section.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ color:theme.text, fontWeight:700, fontSize:16 }}>{section.name}</div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
function SectionsScreen({ sections, tasks, onOpen, onAdd, onDelete, onRename, onReorder, onViewCompleted, user }) {
  const { theme } = useTheme();
  const [visible,   setVisible]   = useState(false);
  const [activeId,  setActiveId]  = useState(null);
  const [localOrder, setLocalOrder] = useState(sections);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 40); return () => clearTimeout(t); }, []);
  // Keep local order in sync when sections prop changes (e.g. after add/delete)
  useEffect(() => { setLocalOrder(sections); }, [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const today          = new Date().toISOString().split("T")[0];
  const totalActive    = tasks.filter((t) => !isDone(t)).length;
  const totalCompleted = tasks.filter((t) =>  isDone(t)).length;
  const overdue        = tasks.filter((t) => !isDone(t) && t.deadlineDate && t.deadlineDate < today).length;
  const firstName      = user?.displayName?.split(" ")[0] || null;

  const activeSection = activeId ? localOrder.find((s) => s.id === activeId) : null;
  const activeIndex   = activeId ? localOrder.findIndex((s) => s.id === activeId) : -1;

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = localOrder.findIndex((s) => s.id === active.id);
    const newIdx = localOrder.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(localOrder, oldIdx, newIdx);
    setLocalOrder(reordered);
    onReorder(reordered);
  };

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"48px 28px 64px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .section-card:hover .section-arrow { opacity:1 !important; transform:translateX(0) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(12px)",
        transition:"opacity 0.5s ease, transform 0.5s ease", marginBottom:48,
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

        {tasks.length > 0 && (
          <div style={{ display:"flex", gap:12, marginTop:28, flexWrap:"wrap" }}>
            {[
              { label:"Active tasks",  value:totalActive,    color:theme.text,  bg:theme.bgInput  },
              { label:"Completed",     value:totalCompleted, color:theme.green, bg:theme.greenDim },
              overdue>0 && { label:"Overdue", value:overdue, color:"#E84545", bg:"rgba(232,69,69,0.08)" },
              { label:"Sections",      value:sections.length,color:theme.blue,  bg:theme.blueDim  },
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

      {/* Drag-and-drop grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={localOrder.map((s) => s.id)} strategy={rectSortingStrategy}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>
            {localOrder.map((s, i) => (
              <SectionCard
                key={s.id}
                section={s}
                index={i}
                tasks={tasks}
                onOpen={onOpen}
                onDelete={onDelete}
                onRename={onRename}
                isDragging={!!activeId}
              />
            ))}

            {/* Add card — not sortable */}
            <div
              onClick={onAdd}
              style={{
                background:"transparent", border:`1px dashed ${theme.border}`,
                borderRadius:18, padding:"24px 22px", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:10, minHeight:160, color:theme.textMuted, transition:"all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor="#E84545"; e.currentTarget.style.color="#E84545"; e.currentTarget.style.background="rgba(232,69,69,0.04)"; e.currentTarget.style.transform="translateY(-4px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor=theme.border; e.currentTarget.style.color=theme.textMuted; e.currentTarget.style.background="transparent"; e.currentTarget.style.transform="translateY(0)"; }}
            >
              <div style={{ width:40, height:40, borderRadius:12, border:"1px dashed currentColor", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>+</div>
              <div style={{ fontSize:13, fontWeight:600 }}>New Section</div>
            </div>
          </div>
        </SortableContext>

        {/* Ghost card shown under cursor while dragging */}
        <DragOverlay dropAnimation={{ duration:180, easing:"ease" }}>
          {activeSection && <DragGhostCard section={activeSection} index={activeIndex} />}
        </DragOverlay>
      </DndContext>

      {sections.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 24px", opacity:visible?1:0, transition:"opacity 0.5s ease 0.2s" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🗂️</div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:theme.text, marginBottom:8 }}>No sections yet</div>
          <div style={{ color:theme.textMuted, fontSize:13, marginBottom:28 }}>Create your first section to start organising your tasks.</div>
          <button onClick={onAdd} style={{ background:"#E84545", color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:700, cursor:"pointer" }}>+ Create Section</button>
        </div>
      )}
    </div>
  );
}

export default SectionsScreen;
