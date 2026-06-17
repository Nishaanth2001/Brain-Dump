import { useTheme } from "../../contexts/ThemeContext";

function Field({ label, children }) {
  const { theme } = useTheme();
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{
        display:"block", color:theme.textMuted, fontSize:10,
        letterSpacing:"0.08em", fontWeight:700, marginBottom:6, textTransform:"uppercase",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default Field;
