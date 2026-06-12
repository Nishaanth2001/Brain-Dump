import Modal from "../common/Modal";
import { fieldStyle } from "../common/styles";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from "react";

function BrainDumpModal({ open, onClose, onAdd, defaultType = "ondemand" }) {
  const [text, setText] = useState("");
  const [type, setType] = useState(defaultType);

  // Every time the modal opens, reset type to whatever tab is currently active
  useEffect(() => {
    if (open) {
      setType(defaultType);
      setText("");
    }
  }, [open, defaultType]);

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const handleAdd = () => {
    if (!lines.length) return;
    onAdd(lines, type);
    setText("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} narrow>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#E2E8F0", marginBottom:8 }}>🧠 Brain Dump</div>
      <p style={{ color:"#4A5568", fontSize:13, marginBottom:18, lineHeight:1.6 }}>
        One task per line. Don't think — just dump everything out of your head.
      </p>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[{key:"ondemand",icon:"⚡",label:"On Demand",sub:"One-off tasks"},{key:"routine",icon:"🔁",label:"Routine",sub:"Recurring tasks"}].map(t => (
          <div key={t.key} onClick={() => setType(t.key)} style={{
            flex:1, padding:10, borderRadius:10, cursor:"pointer", textAlign:"center",
            border:`1px solid ${type===t.key?"#E84545":"rgba(255,255,255,0.06)"}`,
            background: type===t.key ? "rgba(232,69,69,0.08)" : "rgba(255,255,255,0.02)",
            color: type===t.key ? "#E84545" : "#4A5568",
            fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
            transition:"all 0.15s",
          }}>
            <div style={{ fontSize:18, marginBottom:3 }}>{t.icon}</div>
            <div>{t.label}</div>
            <div style={{ fontSize:10, opacity:0.6, fontWeight:400 }}>{t.sub}</div>
          </div>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
        placeholder={"Follow up with client\nPrepare slides for Thursday\nReview pull requests\n..."}
        style={{ ...fieldStyle, resize:"none", lineHeight:1.8, fontSize:14 }}
        autoFocus
      />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16 }}>
        <span style={{ color:"#2D3748", fontSize:12 }}>{lines.length > 0 ? `${lines.length} task${lines.length>1?"s":""} ready` : "Start typing…"}</span>
        <button onClick={handleAdd} disabled={!lines.length} style={{
          background: lines.length ? "#E84545" : "rgba(232,69,69,0.2)", color:"#fff",
          border:"none", borderRadius:10, padding:"10px 22px", fontSize:13,
          fontFamily:"'DM Sans',sans-serif", fontWeight:700, cursor: lines.length ? "pointer" : "not-allowed",
          opacity: lines.length ? 1 : 0.5, transition:"all 0.15s",
        }}>Add {lines.length > 0 ? lines.length : ""} Task{lines.length !== 1 ? "s" : ""} →</button>
      </div>
    </Modal>
  );
}

export default BrainDumpModal;
