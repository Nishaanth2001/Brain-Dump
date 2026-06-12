function Toast({ message, type, visible }) {
  const borderColor =
    type === "success" ? "rgba(61,214,140,0.3)"
    : type === "error" ? "rgba(232,69,69,0.3)"
    : "rgba(30,42,58,0.8)";

  const color =
    type === "success" ? "#3DD68C"
    : type === "error"  ? "#E84545"
    : "#E2E8F0";

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      background: "#0C1421",
      border: `1px solid ${borderColor}`,
      color,
      borderRadius: 12,
      padding: "12px 20px",
      fontSize: 13,
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: 500,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      pointerEvents: "none",
      backdropFilter: "blur(12px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      {message}
    </div>
  );
}

export default Toast;
