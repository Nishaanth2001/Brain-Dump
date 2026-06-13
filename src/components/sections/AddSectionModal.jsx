import { useState } from "react";
import Modal from "../common/Modal";
import Field from "../common/Field";
import { makeFieldStyle } from "../common/styles";
import { useTheme } from "../../contexts/ThemeContext";

function AddSectionModal({ open, onClose, onAdd }) {
  const { theme } = useTheme();
  const fs = makeFieldStyle(theme);
  const [name, setName] = useState("");

  const submit = () => {
    if (name.trim()) { onAdd(name.trim()); setName(""); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} narrow>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:theme.text, marginBottom:24 }}>
        New Section
      </div>
      <Field label="Section Name">
        <input value={name} onChange={(e)=>setName(e.target.value)}
          onKeyDown={(e)=>e.key==="Enter"&&submit()}
          placeholder="e.g. Work, Home, School…" style={fs} autoFocus />
      </Field>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        <button onClick={onClose} style={{ background:theme.bgInput, color:theme.textMuted, border:`1px solid ${theme.border}`, borderRadius:10, padding:"10px 20px", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
          Cancel
        </button>
        <button onClick={submit} style={{ background:theme.red, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>
          Create
        </button>
      </div>
    </Modal>
  );
}

export default AddSectionModal;
