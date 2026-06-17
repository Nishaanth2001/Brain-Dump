import { useTheme } from "../../contexts/ThemeContext";

function Toast({ message, type, visible }) {
  const { theme } = useTheme();
  const borderColor = type==="success" ? `rgba(${theme.mode==="dark"?"61,214,140":"22,163,74"},0.3)`
    : type==="error" ? "rgba(232,69,69,0.3)" : theme.border;
  const color = type==="success" ? theme.green : type==="error" ? theme.red : theme.text;

  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:999,
      background: theme.bgCardSolid,
      border:`1px solid ${borderColor}`,
      color, borderRadius:12, padding:"12px 20px", fontSize:13,
      fontFamily:"'DM Sans',sans-serif", fontWeight:500,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      pointerEvents:"none", backdropFilter:"blur(12px)",
      boxShadow: theme.shadowCard,
    }}>{message}</div>
  );
}

export default Toast;
