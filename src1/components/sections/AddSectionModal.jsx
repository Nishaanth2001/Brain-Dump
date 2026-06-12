import Modal from "../common/Modal";
import Field from "../common/Field";
import { fieldStyle } from "../common/styles";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from "react";


function AddSectionModal({ open, onClose, onAdd }) {
  const [name, setName] = useState("");
  const submit = () => { if (name.trim()) { onAdd(name.trim()); setName(""); onClose(); } };
  return (
    <Modal open={open} onClose={onClose} narrow>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#E2E8F0", marginBottom:24 }}>New Section</div>
      <Field label="Section Name">
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key==="Enter" && submit()}
          placeholder="e.g. Work, Home, School…" style={fieldStyle} autoFocus />
      </Field>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        <button onClick={onClose} style={{
          background:"rgba(255,255,255,0.03)", color:"#4A5568", border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:10, padding:"10px 20px", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif",
        }}>Cancel</button>
        <button onClick={submit} style={{
          background:"#E84545", color:"#fff", border:"none", borderRadius:10,
          padding:"10px 24px", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:700,
        }}>Create</button>
      </div>
    </Modal>
  );
}

export default AddSectionModal;