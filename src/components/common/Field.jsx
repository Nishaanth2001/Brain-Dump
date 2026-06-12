function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block",
        color: "#4A5568",
        fontSize: 10,
        letterSpacing: "0.08em",
        fontWeight: 700,
        marginBottom: 6,
        textTransform: "uppercase",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default Field;
