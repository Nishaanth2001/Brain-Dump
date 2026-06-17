import { useState, useMemo } from "react";
import TaskCard from "./TaskCard";
import BrainDumpModal from "./BrainDumpModal";
import EditTaskModal from "./EditTaskModal";
import Calendar from "../calendar/Calendar";
import { PRIORITIES, PRIORITY_ORDER } from "../../constants/appConstants";
import { uid, todayStr, isDone } from "../../utils/helpers";
import { useTheme } from "../../contexts/ThemeContext";

function AppScreen({ section, tasks, blockedTimes, workHours, onBack, onCycle, onDelete, onSave, onMoveType, onViewCompleted, onProgress }) {
  const { theme } = useTheme();
  const [typeTab,   setTypeTab]   = useState("ondemand");
  const [search,    setSearch]    = useState("");
  const [fStatus,   setFStatus]   = useState("All");
  const [fPriority, setFPriority] = useState("All");
  const [sortBy,    setSortBy]    = useState("priority");
  const [dumpOpen,  setDumpOpen]  = useState(false);
  const [editTask,  setEditTask]  = useState(null);

  const sectionTasks = tasks.filter((t)=>t.sectionId===section.id && !isDone(t));
  const odCount = sectionTasks.filter((t)=>t.taskType!=="routine").length;
  const rtCount = sectionTasks.filter((t)=>t.taskType==="routine").length;

  const visible = useMemo(()=>{
    return sectionTasks.filter((t)=>{
      const typeOk     = typeTab==="routine" ? t.taskType==="routine" : t.taskType!=="routine";
      const statusOk   = fStatus==="All"   || t.status===fStatus;
      const priorityOk = fPriority==="All" || t.priority===fPriority;
      const searchOk   = !search || (t.title||"").toLowerCase().includes(search.toLowerCase())
        || (t.tags||[]).some((g)=>g.toLowerCase().includes(search.toLowerCase()));
      return typeOk && statusOk && priorityOk && searchOk;
    }).sort((a,b)=>{
      if (sortBy==="priority") return PRIORITY_ORDER[a.priority]-PRIORITY_ORDER[b.priority];
      if (sortBy==="status")   return (a.status==="In Progress"?0:1)-(b.status==="In Progress"?0:1);
      if (sortBy==="deadline") return (a.deadlineDate||"9999")<(b.deadlineDate||"9999")?-1:1;
      return 0;
    });
  },[sectionTasks,typeTab,fStatus,fPriority,search,sortBy]);

  const handleAdd = (lines,type) => {
    const today=todayStr();
    const newTasks=lines.map((title)=>({
      id:uid(),title,sectionId:section.id,taskType:type,
      startDate:today,deadlineDate:"",status:"Not Started",
      priority:"HH",notes:"",tags:[],createdAt:Date.now(),
    }));
    onSave(null,newTasks); setTypeTab(type);
  };

  const today=todayStr();
  const stats=[];
  PRIORITIES.forEach((pr)=>{
    const n=sectionTasks.filter((t)=>t.priority===pr.key).length;
    if(n) stats.push({...pr,count:n});
  });
  const ovCount=sectionTasks.filter((t)=>t.deadlineDate&&t.deadlineDate<today).length;

  const inputStyle = {
    background:theme.bgInput, border:`1px solid ${theme.border}`,
    borderRadius:8, padding:"8px 12px", color:theme.text, fontSize:13,
    fontFamily:"'DM Sans',sans-serif", outline:"none", cursor:"pointer",
    transition:"background 0.3s, color 0.3s",
  };

  const btnBase = {
    background:theme.bgInput, border:`1px solid ${theme.border}`,
    borderRadius:8, padding:"6px 12px", color:theme.textMuted, fontSize:12,
    cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, transition:"all 0.15s",
  };

  return (
    <div style={{ maxWidth:1200, margin:"0 auto", padding:"32px 24px" }}>
      {/* Header */}
      <div style={{ 
        display:"flex", 
        alignItems:"center", 
        gap:16, 
        marginBottom:28, 
        flexWrap:"wrap",
        background: theme.mode === "dark" 
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.7)",
        backdropFilter: "blur(20px)",
        borderRadius: 20,
        padding: "20px 28px",
        border: theme.mode === "dark"
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(255,255,255,0.6)",
        boxShadow: theme.mode === "dark"
          ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
      }}>
        <button onClick={onBack} style={{
          background: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
          border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: "10px 18px",
          color: theme.mode === "dark" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "'DM Sans',sans-serif",
          fontWeight: 600,
          transition: "all 0.3s",
          letterSpacing: "0.3px"
        }}
          onMouseEnter={(e)=>{
            e.currentTarget.style.color=theme.red;
            e.currentTarget.style.borderColor=theme.red;
            e.currentTarget.style.transform="translateY(-1px)";
          }}
          onMouseLeave={(e)=>{
            e.currentTarget.style.color=theme.mode === "dark" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";
            e.currentTarget.style.borderColor=theme.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
            e.currentTarget.style.transform="translateY(0)";
          }}
        >← Sections</button>
        <span style={{ 
          fontFamily:"'DM Serif Display',serif", 
          fontSize:24, 
          fontWeight:600,
          background: "linear-gradient(135deg, #e84545 0%, #6366f1 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.5px"
        }}>{section.name}</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:12, alignItems:"center" }}>
          <button onClick={onViewCompleted} style={{ 
            background:"none", 
            border:"none", 
            color:theme.mode === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", 
            fontSize:13, 
            cursor:"pointer", 
            fontFamily:"'DM Sans',sans-serif", 
            transition:"color 0.3s",
            fontWeight: 600,
            letterSpacing: "0.3px"
          }}
            onMouseEnter={(e)=>e.currentTarget.style.color=theme.green}
            onMouseLeave={(e)=>e.currentTarget.style.color=theme.mode === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
          >✓ View Completed</button>
          <button onClick={()=>setDumpOpen(true)} style={{
            background:"linear-gradient(135deg, #e84545 0%, #d63939 100%)",
            color:"#fff", 
            border:"none", 
            borderRadius:12,
            padding:"10px 22px", 
            fontSize:13, 
            fontFamily:"'DM Sans',sans-serif",
            fontWeight:700, 
            cursor:"pointer", 
            transition:"all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow:"0 4px 16px rgba(232,69,69,0.3)",
            letterSpacing: "0.3px"
          }}
            onMouseEnter={(e)=>{
              e.currentTarget.style.transform="translateY(-2px)";
              e.currentTarget.style.boxShadow="0 6px 24px rgba(232,69,69,0.45)";
            }}
            onMouseLeave={(e)=>{
              e.currentTarget.style.transform="translateY(0)";
              e.currentTarget.style.boxShadow="0 4px 16px rgba(232,69,69,0.3)";
            }}
          >🧠 Brain Dump</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, alignItems:"start" }}>
        <div>
          {/* Stats */}
          {stats.length>0 && (
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              {stats.map((s)=>(
                <div key={s.key} style={{ background:s.dim, border:`1px solid ${s.color}33`, borderRadius:8, padding:"5px 14px", display:"flex", alignItems:"center", gap:7, fontSize:12, fontWeight:600 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:s.color }} />
                  <span style={{ color:s.color }}>{s.count} {s.label}</span>
                </div>
              ))}
              {ovCount>0 && (
                <div style={{ background:theme.redDim, border:`1px solid ${theme.redBorder}`, borderRadius:8, padding:"5px 14px", fontSize:12, fontWeight:600, color:theme.red }}>
                  {ovCount} Overdue
                </div>
              )}
            </div>
          )}

          {/* Filter bar */}
          {sectionTasks.length>0 && (
            <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search…" style={{...inputStyle,flex:1,minWidth:140}} />
              <select value={fStatus}   onChange={(e)=>setFStatus(e.target.value)}   style={inputStyle}>
                <option value="All">All Statuses</option>
                <option>Not Started</option>
                <option>In Progress</option>
              </select>
              <select value={fPriority} onChange={(e)=>setFPriority(e.target.value)} style={inputStyle}>
                <option value="All">All Priorities</option>
                <option value="HH">Do First</option>
                <option value="HL">Schedule</option>
                <option value="LH">Delegate</option>
                <option value="LL">Drop</option>
              </select>
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} style={inputStyle}>
                <option value="priority">Sort: Priority</option>
                <option value="status">Sort: Status</option>
                <option value="deadline">Sort: Deadline</option>
              </select>
            </div>
          )}

          {/* Type tabs */}
          {sectionTasks.length>0 && (
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              {[{key:"ondemand",icon:"⚡",label:"On Demand",count:odCount},{key:"routine",icon:"🔁",label:"Routine",count:rtCount}].map((t)=>(
                <div key={t.key} onClick={()=>setTypeTab(t.key)} style={{
                  flex:1, padding:"12px 16px", borderRadius:12, cursor:"pointer", textAlign:"center",
                  border:`1px solid ${typeTab===t.key?theme.red:theme.border}`,
                  background: typeTab===t.key ? theme.redDim : theme.bgInput,
                  transition:"all 0.15s",
                }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{t.icon}</div>
                  <div style={{ color:typeTab===t.key?theme.red:theme.text, fontSize:13, fontWeight:700 }}>{t.label}</div>
                  <div style={{ color:typeTab===t.key?"rgba(232,69,69,0.7)":theme.textMuted, fontSize:11, marginTop:2 }}>{t.count} task{t.count!==1?"s":""}</div>
                </div>
              ))}
            </div>
          )}

          {/* Task list */}
          {sectionTasks.length===0 ? (
            <div style={{ textAlign:"center", padding:"60px 24px" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🧠</div>
              <div style={{ color:theme.textMuted, fontSize:16, marginBottom:8 }}>No tasks yet in {section.name}</div>
              <div style={{ color:theme.textFaint, fontSize:13, marginBottom:28 }}>Use Brain Dump to capture everything on your mind.</div>
              <button onClick={()=>setDumpOpen(true)} style={{ background:theme.red, color:"#fff", border:"none", borderRadius:10, padding:"10px 22px", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:700, cursor:"pointer" }}>
                🧠 Start Brain Dump
              </button>
            </div>
          ) : visible.length===0 ? (
            <div style={{ textAlign:"center", color:theme.textMuted, padding:"48px 0", fontSize:13 }}>No tasks match your filters.</div>
          ) : (
            visible.map((t)=>(
              <TaskCard key={t.id} task={t} onCycle={onCycle} onDelete={onDelete} onEdit={()=>setEditTask(t)} onProgress={onProgress} blockedTimes={blockedTimes} workHours={workHours} />
            ))
          )}
        </div>

        <Calendar tasks={tasks} sectionId={section.id} />
      </div>

      <BrainDumpModal open={dumpOpen} onClose={()=>setDumpOpen(false)} onAdd={handleAdd} defaultType={typeTab} />
      <EditTaskModal open={!!editTask} task={editTask} onClose={()=>setEditTask(null)}
        onSave={(updated)=>{onSave(updated,null);setEditTask(null);}}
        onMoveType={onMoveType}
      />
    </div>
  );
}

export default AppScreen;
