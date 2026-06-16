import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Field from "../common/Field";
import { makeFieldStyle } from "../common/styles";
import { useTheme } from "../../contexts/ThemeContext";

function EditTaskModal({ open, task, onClose, onSave, onMoveType }) {
  const { theme } = useTheme();
  const fs = makeFieldStyle(theme);
  const [form, setForm]         = useState({});
  const [tags, setTags]         = useState([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (task) {
      setForm({
        title:        task.title        || "",
        startDate:    task.startDate    || "",
        deadlineDate: task.deadlineDate || "",
        // Preserve the real status (including Done/Done Late) so saving
        // an already-completed task does not silently reset it to Not Started.
        status:       task.status || "Not Started",
        priority:     task.priority     || "HH",
        notes:        task.notes        || "",
      });
      setTags(task.tags || []);
    }
  }, [task]);

  const set    = (k,v) => setForm((f)=>({...f,[k]:v}));
  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags((t)=>[...t,v]);
    setTagInput("");
  };
  const save = () => {
    if (!form.title.trim()) return;
    onSave({...task,...form,tags});
    onClose();
  };

  if (!task) return null;

  const btnSecondary = {
    background: theme.bgInput, color: theme.textMuted,
    border:`1px solid ${theme.border}`, borderRadius:10,
    padding:"10px 20px", cursor:"pointer", fontSize:13,
    fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:theme.text }}>Edit Task</div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:theme.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
      </div>

      <Field label="Task Name">
        <input value={form.title||""} onChange={(e)=>set("title",e.target.value)}
          placeholder="What needs to get done?" style={fs} />
      </Field>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
        <Field label="Start Date">
          <input type="date" value={form.startDate||""} onChange={(e)=>set("startDate",e.target.value)} style={fs} />
        </Field>
        <Field label="Deadline">
          <input type="date" value={form.deadlineDate||""} onChange={(e)=>set("deadlineDate",e.target.value)} style={fs} />
        </Field>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
        <Field label="Status">
          <select value={form.status||"Not Started"} onChange={(e)=>set("status",e.target.value)} style={fs}>
            <option>Not Started</option>
            <option>In Progress</option>
          </select>
        </Field>
        <Field label="Priority">
          <select value={form.priority||"HH"} onChange={(e)=>set("priority",e.target.value)} style={fs}>
            <option value="HH">Do First — High Impact · High Urgency</option>
            <option value="HL">Schedule — High Impact · Low Urgency</option>
            <option value="LH">Delegate — Low Impact · High Urgency</option>
            <option value="LL">Drop — Low Impact · Low Urgency</option>
          </select>
        </Field>
      </div>

      <Field label="Notes &amp; Documentation">
        <textarea value={form.notes||""} onChange={(e)=>set("notes",e.target.value)}
          rows={4} placeholder="Document what you did, how, decisions made…"
          style={{...fs, resize:"vertical"}} />
      </Field>

      <Field label="Tags">
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8, minHeight:10 }}>
          {tags.map((tag)=>(
            <span key={tag} style={{ background:theme.blueDim, color:theme.blue, borderRadius:6, padding:"3px 10px", fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
              {tag}
              <span onClick={()=>setTags((t)=>t.filter((x)=>x!==tag))} style={{ cursor:"pointer", opacity:0.6 }}>✕</span>
            </span>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={tagInput} onChange={(e)=>setTagInput(e.target.value)}
            onKeyDown={(e)=>e.key==="Enter"&&(e.preventDefault(),addTag())}
            placeholder="Add tag…" style={{...fs, flex:1}} />
          <button onClick={addTag} style={{ ...btnSecondary, padding:"0 16px", borderRadius:10 }}>Add</button>
        </div>
      </Field>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
        <button onClick={()=>{onMoveType(task.id);onClose();}} style={{ ...btnSecondary, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600 }}>
          {task.taskType==="routine" ? "⚡ Move to On Demand" : "🔁 Move to Routine"}
        </button>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={save} style={{ background:theme.red, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>
            Save Task
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default EditTaskModal;
