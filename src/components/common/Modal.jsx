import { useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";

function Modal({ open, onClose, children, narrow }) {
  const { theme } = useTheme();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0,
        background:"rgba(0,0,0,0.6)",
        zIndex:100, display:"flex", alignItems:"center", justifyContent:"center",
        padding:20, backdropFilter:"blur(8px)",
        animation:"fadeIn 0.15s ease",
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bgModal,
          border: `1px solid ${theme.borderModal}`,
          borderRadius:20, width:"100%",
          maxWidth: narrow ? 480 : 620,
          maxHeight:"90vh", overflowY:"auto", padding:32,
          boxShadow: theme.shadow,
          animation:"slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          transition:"background 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;
