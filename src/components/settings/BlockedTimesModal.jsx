import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Field from "../common/Field";
import { makeFieldStyle } from "../common/styles";
import { useTheme } from "../../contexts/ThemeContext";

function BlockedTimesModal({ open, onClose, blockedTimes, onSave }) {
  const { theme } = useTheme();
  const fs = makeFieldStyle(theme);
  const [times, setTimes] = useState([]);

  useEffect(() => {
    if (open && blockedTimes) {
      setTimes([...blockedTimes]);
    }
  }, [open, blockedTimes]);

  const handleSave = () => {
    onSave(times);
    onClose();
  };

  const addTime = () => {
    setTimes([...times, { start: "12:00", end: "13:00", label: "Lunch" }]);
  };

  const removeTime = (index) => {
    setTimes(times.filter((_, i) => i !== index));
  };

  const updateTime = (index, field, value) => {
    setTimes(times.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const btnBase = {
    background: theme.bgInput, color: theme.textMuted,
    border: `1px solid ${theme.border}`, borderRadius: 10,
    padding: "8px 16px", cursor: "pointer", fontSize: 12,
    fontFamily: "'DM Sans',sans-serif", fontWeight: 600, transition: "all 0.15s",
  };

  const presets = [
    { label: "Breakfast", start: "08:00", end: "09:00" },
    { label: "Lunch", start: "12:00", end: "13:00" },
    { label: "Dinner", start: "18:00", end: "19:00" },
    { label: "Morning Commute", start: "07:30", end: "08:30" },
    { label: "Evening Commute", start: "17:00", end: "18:00" },
  ];

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: theme.text, marginBottom: 4 }}>
            🚫 Blocked Times
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>
            Times to exclude from task scheduling (applies to all days)
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>

      {/* Quick Presets */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 700, marginBottom: 8, letterSpacing: "0.05em" }}>
          QUICK ADD
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setTimes([...times, preset])}
              style={{
                ...btnBase,
                padding: "6px 12px",
                fontSize: 11,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.orange; e.currentTarget.style.color = theme.orange; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Blocked Times List */}
      <div style={{ maxHeight: 400, overflowY: "auto", marginBottom: 20 }}>
        {times.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: theme.textDim, fontSize: 13 }}>
            No blocked times. Tasks will be scheduled throughout the day.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {times.map((time, idx) => (
              <div key={idx} style={{
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                gap: 12,
                alignItems: "center"
              }}>
                <div style={{ flex: 1 }}>
                  <Field label="Label">
                    <input
                      value={time.label}
                      onChange={(e) => updateTime(idx, "label", e.target.value)}
                      placeholder="e.g., Lunch, Break, Commute"
                      style={{ ...fs, marginBottom: 10 }}
                    />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Start Time">
                      <input
                        type="time"
                        value={time.start}
                        onChange={(e) => updateTime(idx, "start", e.target.value)}
                        style={fs}
                      />
                    </Field>
                    <Field label="End Time">
                      <input
                        type="time"
                        value={time.end}
                        onChange={(e) => updateTime(idx, "end", e.target.value)}
                        style={fs}
                      />
                    </Field>
                  </div>
                </div>
                <button
                  onClick={() => removeTime(idx)}
                  style={{
                    background: "none",
                    border: `1px solid ${theme.redBorder}`,
                    color: theme.red,
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = theme.redDim; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Button */}
      <button
        onClick={addTime}
        style={{
          ...btnBase,
          width: "100%",
          marginBottom: 20,
          color: theme.orange,
          borderColor: theme.orangeBorder,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = theme.orangeDim; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = theme.bgInput; }}
      >
        + Add Custom Time
      </button>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={onClose} style={btnBase}>Cancel</button>
        <button
          onClick={handleSave}
          style={{
            background: theme.red,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 24px",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 700
          }}
        >
          Save Blocked Times
        </button>
      </div>
    </Modal>
  );
}

export default BlockedTimesModal;
