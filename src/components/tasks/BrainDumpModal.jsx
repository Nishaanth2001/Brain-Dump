import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import { makeFieldStyle } from "../common/styles";
import { useTheme } from "../../contexts/ThemeContext";

function BrainDumpModal({ open, onClose, onAdd, defaultType="ondemand" }) {
  const { theme } = useTheme();
  const fs = makeFieldStyle(theme);
  const [text, setText] = useState("");
  const [type, setType] = useState(defaultType);

  useEffect(() => {
    if (open) { setType(defaultType); setText(""); }
  }, [open, defaultType]);

  const lines = text.split("\n").map((l)=>l.trim()).filter(Boolean);
  const handleAdd = () => {
    if (!lines.length) return;
    onAdd(lines, type);
    setText(""); onClose();
  };

  const TYPE_OPTIONS = [
    { key:"ondemand", icon:"⚡", label:"On Demand", sub:"One-off tasks" },
    { key:"routine",  icon:"🔁", label:"Routine",   sub:"Recurring tasks" },
  ];

  return (
    <Modal open={open} onClose={onClose} narrow>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:theme.text, marginBottom:8 }}>🧠 Brain Dump</div>
      <p style={{ color:theme.textMuted, fontSize:13, marginBottom:18, lineHeight:1.6 }}>
        One task per line. Don&apos;t think — just dump everything out of your head.
      </p>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {TYPE_OPTIONS.map((t) => (
          <div key={t.key} onClick={()=>setType(t.key)} style={{
            flex:1, padding:10, borderRadius:10, cursor:"pointer", textAlign:"center",
            border:`1px solid ${type===t.key ? theme.red : theme.border}`,
            background: type===t.key ? theme.redDim : theme.bgInput,
            color: type===t.key ? theme.red : theme.textMuted,
            fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
          }}>
            <div style={{ fontSize:18, marginBottom:3 }}>{t.icon}</div>
            <div>{t.label}</div>
            <div style={{ fontSize:10, opacity:0.6, fontWeight:400 }}>{t.sub}</div>
          </div>
        ))}
      </div>
      <textarea value={text} onChange={(e)=>setText(e.target.value)} rows={8}
        placeholder={"Follow up with client\nPrepare slides for Thursday\nReview pull requests\n..."}
        style={{ ...fs, resize:"none", lineHeight:1.8, fontSize:14 }}
        autoFocus
      />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16 }}>
        <span style={{ color:theme.textFaint, fontSize:12 }}>
          {lines.length>0 ? `${lines.length} task${lines.length>1?"s":""} ready` : "Start typing…"}
        </span>
        <button onClick={handleAdd} disabled={!lines.length} style={{
          background: lines.length ? theme.red : theme.redDim,
          color:"#fff", border:"none", borderRadius:10, padding:"10px 22px", fontSize:13,
          fontFamily:"'DM Sans',sans-serif", fontWeight:700,
          cursor: lines.length ? "pointer" : "not-allowed",
          opacity: lines.length ? 1 : 0.5, transition:"all 0.15s",
        }}>
          Add {lines.length>0?lines.length:""} Task{lines.length!==1?"s":""} →
        </button>
      </div>
    </Modal>
  );
}

export default BrainDumpModal;
