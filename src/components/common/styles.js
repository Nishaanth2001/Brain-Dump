// fieldStyle is now generated dynamically from theme — use makeFieldStyle(theme)
export const makeFieldStyle = (theme) => ({
  width:"100%",
  background: theme.bgInput,
  border: `1px solid ${theme.borderInput}`,
  borderRadius:10,
  padding:"10px 14px",
  color: theme.text,
  fontSize:13,
  fontFamily:"'DM Sans',sans-serif",
  outline:"none",
  transition:"border-color 0.2s, background 0.3s, color 0.3s",
});

// Legacy static export for components not yet migrated
export const fieldStyle = {
  width:"100%",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(255,255,255,0.08)",
  borderRadius:10, padding:"10px 14px", color:"#E2E8F0", fontSize:13,
  outline:"none", fontFamily:"'DM Sans',sans-serif", transition:"border-color 0.2s",
};
