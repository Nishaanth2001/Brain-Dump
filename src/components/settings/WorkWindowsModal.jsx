import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Field from "../common/Field";
import { makeFieldStyle } from "../common/styles";
import { useTheme } from "../../contexts/ThemeContext";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

function WorkWindowsModal({ open, onClose, workWindows, onSave }) {
  const { theme } = useTheme();
  const fs = makeFieldStyle(theme);
  const [windows, setWindows] = useState([]);

  useEffect(() => {
    if (open && workWindows) {
      setWindows([...workWindows]);
    }
  }, [open, workWindows]);

  const handleSave = () => {
    onSave(windows);
    onClose();
  };

  const addWindow = (day) => {
    setWindows([...windows, { day, start: "09:00", end: "17:00", blocked: false, label: "" }]);
  };

  const removeWindow = (index) => {
    setWindows(windows.filter((_, i) => i !== index));
  };

  const updateWindow = (index, field, value) => {
    setWindows(windows.map((w, i) => i === index ? { ...w, [field]: value } : w));
  };

  const btnBase = {
    background: theme.bgInput, color: theme.textMuted,
    border: `1px solid ${theme.border}`, borderRadius: 10,
    padding: "8px 16px", cursor: "pointer", fontSize: 12,
    fontFamily: "'DM Sans',sans-serif", fontWeight: 600, transition: "all 0.15s",
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: theme.text }}>
          ⏰ Work Windows
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ color: theme.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
        Define your available work hours and blocked times (lunch, commute, etc.). Tasks will be scheduled only during available windows.
      </div>

      <div style={{ maxHeight: "50vh", overflowY: "auto", marginBottom: 20 }}>
        {DAYS.map(day => {
          const dayWindows = windows.filter(w => w.day === day);
          return (
            <div key={day} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: theme.text }}>
                  {DAY_LABELS[day]}
                </div>
                <button
                  onClick={() => addWindow(day)}
                  style={{
                    ...btnBase, padding: "4px 12px", fontSize: 11,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                >
                  + Add Window
                </button>
              </div>

              {dayWindows.length === 0 ? (
                <div style={{ color: theme.textDim, fontSize: 12, fontStyle: "italic", padding: "8px 12px" }}>
                  No windows defined (day off)
                </div>
              ) : (
                dayWindows.map((window, idx) => {
                  const globalIndex = windows.indexOf(window);
                  return (
                    <div key={globalIndex} style={{
                      background: window.blocked ? "rgba(232,69,69,0.05)" : theme.bgInput,
                      border: `1px solid ${window.blocked ? theme.redBorder : theme.border}`,
                      borderRadius: 8, padding: "10px 12px", marginBottom: 6,
                      display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap"
                    }}>
                      <input
                        type="time"
                        value={window.start}
                        onChange={(e) => updateWindow(globalIndex, "start", e.target.value)}
                        style={{ ...fs, width: 100, padding: "6px 8px" }}
                      />
                      <span style={{ color: theme.textMuted }}>to</span>
                      <input
                        type="time"
                        value={window.end}
                        onChange={(e) => updateWindow(globalIndex, "end", e.target.value)}
                        style={{ ...fs, width: 100, padding: "6px 8px" }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={window.blocked}
                          onChange={(e) => updateWindow(globalIndex, "blocked", e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ color: window.blocked ? theme.red : theme.textMuted, fontWeight: 600 }}>
                          Blocked
                        </span>
                      </label>
                      {window.blocked && (
                        <input
                          type="text"
                          value={window.label || ""}
                          onChange={(e) => updateWindow(globalIndex, "label", e.target.value)}
                          placeholder="e.g., Lunch, Commute"
                          style={{ ...fs, flex: 1, padding: "6px 8px", minWidth: 120 }}
                        />
                      )}
                      <button
                        onClick={() => removeWindow(globalIndex)}
                        style={{
                          background: "none", border: "none", color: theme.red,
                          cursor: "pointer", fontSize: 16, padding: "0 4px"
                        }}
                        title="Remove window"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
        <button onClick={onClose} style={btnBase}>Cancel</button>
        <button
          onClick={handleSave}
          style={{
            background: theme.red, color: "#fff", border: "none",
            borderRadius: 10, padding: "10px 24px", cursor: "pointer",
            fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700
          }}
        >
          Save Work Windows
        </button>
      </div>
    </Modal>
  );
}

export default WorkWindowsModal;
