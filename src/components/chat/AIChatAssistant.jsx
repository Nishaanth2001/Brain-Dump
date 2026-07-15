import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  createConversation,
  processMessage,
  loadApiKey,
  saveApiKey,
  deleteApiKey,
  validateApiKey,
  isApiKeyReady,
  getCachedApiKey,
} from "../../utils/geminiChatEngine";
import { uid, todayStr } from "../../utils/helpers";

// ── Simple markdown-ish renderer (bold only, no deps) ──────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return <strong key={j}>{seg.slice(2, -2)}</strong>;
      }
      if (seg.startsWith("_") && seg.endsWith("_")) {
        return <em key={j}>{seg.slice(1, -1)}</em>;
      }
      return seg;
    });
    return <div key={i} style={{ minHeight: line.trim() === "" ? 8 : undefined }}>{parts}</div>;
  });
}

function AIChatAssistant({ tasks, sections, blockedTimes, workHours, onSave, onCycle, onDelete, onProgress, driveToken }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [conv, setConv] = useState(() => createConversation());
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState("loading"); // "loading" | "ready" | "missing" | "validating" | "invalid"
  const [hasKey, setHasKey] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Load API key from Drive when chat opens
  useEffect(() => {
    if (open && driveToken) {
      setApiKeyStatus("loading");
      loadApiKey(driveToken).then((key) => {
        if (key) {
          setHasKey(true);
          setApiKeyStatus("ready");
          if (messages.length === 0) sendInitialGreeting();
        } else {
          setHasKey(false);
          setApiKeyStatus("missing");
          setShowSettings(true);
        }
      }).catch(() => {
        setApiKeyStatus("missing");
        setShowSettings(true);
      });
    }
  }, [open, driveToken]);

  // Focus input when opened
  useEffect(() => {
    if (open && hasKey && !showSettings) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, hasKey, showSettings]);

  const sendInitialGreeting = useCallback(() => {
    const greeting = {
      role: "bot",
      text: "Hey! 👋 I'm Flow AI, your intelligent task assistant. I can help you manage tasks naturally — just tell me what you need!",
      timestamp: Date.now(),
      quickReplies: ["Add a task", "Show today's tasks", "Summary"],
    };
    setMessages([greeting]);
  }, []);

  const handleSaveApiKey = async () => {
    const key = apiKeyInput.trim();
    if (!key) return;

    setApiKeyStatus("validating");

    const valid = await validateApiKey(key);
    if (!valid) {
      setApiKeyStatus("invalid");
      return;
    }

    if (driveToken) {
      const saved = await saveApiKey(driveToken, key);
      if (saved) {
        setHasKey(true);
        setApiKeyStatus("ready");
        setShowSettings(false);
        setApiKeyInput("");
        if (messages.length === 0) sendInitialGreeting();
      } else {
        setApiKeyStatus("invalid");
      }
    }
  };

  const handleRemoveApiKey = async () => {
    if (driveToken) {
      await deleteApiKey(driveToken);
      setHasKey(false);
      setApiKeyStatus("missing");
      setMessages([]);
      setConv(createConversation());
    }
  };

  const handleSend = useCallback((text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");

    if (!isApiKeyReady()) {
      setShowSettings(true);
      return;
    }

    // Add user message immediately
    setMessages(prev => [...prev, { role: "user", text: msg, timestamp: Date.now() }]);
    setIsTyping(true);

    processMessage(msg, conv, { tasks, sections, blockedTimes, workHours })
      .then((result) => {
        setIsTyping(false);

        // Handle task creation action
        if (result.action?.type === "create_task") {
          const taskData = result.action.task;
          const newTask = {
            id: uid(),
            ...taskData,
            status: "Not Started",
            progress: 0,
            createdAt: Date.now(),
          };
          onSave(null, [newTask]);
        }

        // Handle task update action
        if (result.action?.type === "update_task") {
          const updates = result.action.task;
          if (!updates) return;

          // Find the task — try exact ID first, then fuzzy title match
          let existing = tasks.find(t => t.id === updates.id);
          if (!existing && updates.title) {
            const lower = updates.title.toLowerCase();
            existing = tasks.find(t => t.title?.toLowerCase() === lower)
                    || tasks.find(t => t.title?.toLowerCase().includes(lower));
          }

          if (existing) {
            // Only allow safe fields to be updated — prevents AI from corrupting task data
            const ALLOWED_UPDATE_FIELDS = ["title", "status", "priority", "deadlineDate", "startDate", "sectionId", "taskType", "progress", "notes"];
            const safeUpdates = {};
            for (const key of ALLOWED_UPDATE_FIELDS) {
              if (key in updates && updates[key] !== undefined) {
                safeUpdates[key] = updates[key];
              }
            }

            // Auto-handle progress when marking as Done
            if (safeUpdates.status === "Done" || safeUpdates.status === "Done Late") {
              safeUpdates.progress = 100;
              if (!safeUpdates.status.includes("Late") && existing.deadlineDate && existing.deadlineDate < todayStr()) {
                safeUpdates.status = "Done Late";
              }
              safeUpdates.completedAt = todayStr();
            }

            onSave({ ...existing, ...safeUpdates }, null);
          }
        }

        // Handle task deletion action
        if (result.action?.type === "delete_task") {
          const taskId = result.action.taskId;
          // Also try title-based match for deletion
          let taskToDelete = tasks.find(t => t.id === taskId);
          if (!taskToDelete && result.action.title) {
            const lower = result.action.title.toLowerCase();
            taskToDelete = tasks.find(t => t.title?.toLowerCase() === lower)
                        || tasks.find(t => t.title?.toLowerCase().includes(lower));
          }
          if (taskToDelete && onDelete) onDelete(taskToDelete.id);
        }

        setMessages(prev => [...prev, {
          role: "bot",
          text: result.text,
          timestamp: Date.now(),
          quickReplies: result.quickReplies,
        }]);
      })
      .catch((error) => {
        console.error("Chat error:", error);
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: "bot",
          text: "Sorry, I encountered an error. Please try again.",
          timestamp: Date.now(),
        }]);
      });
  }, [input, conv, tasks, sections, blockedTimes, workHours, onSave, onDelete]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDark = theme.mode === "dark";

  // ── Floating Button ─────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #e84545 0%, #6366f1 100%)",
          color: "#fff",
          fontSize: 26,
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(232,69,69,0.4), 0 4px 12px rgba(99,102,241,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          animation: "chatPulse 3s ease-in-out infinite",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1) translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 40px rgba(232,69,69,0.5), 0 8px 20px rgba(99,102,241,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1) translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(232,69,69,0.4), 0 4px 12px rgba(99,102,241,0.3)";
        }}
        title="Chat with Flow AI"
      >
        <style>{`
          @keyframes chatPulse {
            0%, 100% { box-shadow: 0 8px 32px rgba(232,69,69,0.4), 0 4px 12px rgba(99,102,241,0.3); }
            50% { box-shadow: 0 8px 40px rgba(232,69,69,0.6), 0 4px 20px rgba(99,102,241,0.5); }
          }
          @keyframes chatSlideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes dotBounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}</style>
        🤖
      </button>
    );
  }

  // ── Settings Panel ────────────────────────────────────────────────────────
  const renderSettings = () => (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1, overflowY: "auto" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
        <h3 style={{ color: theme.text, fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          {hasKey ? "API Key Settings" : "Setup Flow AI"}
        </h3>
        <p style={{ color: theme.textMuted, fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
          {hasKey ? "Your API key is securely saved to your Google account." : "Add your free Google Gemini API key to enable AI features."}
        </p>
      </div>

      {!hasKey && (
        <div style={{
          background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)",
          border: isDark ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(99,102,241,0.1)",
          borderRadius: 12, padding: 14,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 8 }}>How to get your free API key:</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: theme.textMuted, lineHeight: 1.8 }}>
            <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: "#6366f1", textDecoration: "underline" }}>aistudio.google.com/apikey</a></li>
            <li>Click "Create API Key"</li>
            <li>Copy the key and paste it below</li>
          </ol>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 8, fontStyle: "italic" }}>✅ Free • ✅ No credit card • ✅ 1.5M tokens/day</div>
        </div>
      )}

      {hasKey ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>API Key Active</div>
              <div style={{ fontSize: 10, color: theme.textMuted }}>Key: ••••••••{getCachedApiKey()?.slice(-4) || ""}</div>
            </div>
          </div>
          <button onClick={handleRemoveApiKey} style={{ background: isDark ? "rgba(232,69,69,0.1)" : "rgba(232,69,69,0.05)", border: "1px solid rgba(232,69,69,0.2)", borderRadius: 10, padding: "10px 14px", color: "#e84545", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Remove API Key
          </button>
          <button onClick={() => setShowSettings(false)} style={{ background: "linear-gradient(135deg, #e84545 0%, #6366f1 100%)", border: "none", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            ← Back to Chat
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="password" value={apiKeyInput} onChange={(e) => { setApiKeyInput(e.target.value); setApiKeyStatus("missing"); }}
            placeholder="Paste your Gemini API key here..."
            style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: apiKeyStatus === "invalid" ? "1px solid #e84545" : isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "12px 14px", color: theme.text, fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%", boxSizing: "border-box" }}
          />
          {apiKeyStatus === "invalid" && <div style={{ fontSize: 11, color: "#e84545", fontWeight: 500 }}>❌ Invalid API key. Please check and try again.</div>}
          <button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim() || apiKeyStatus === "validating"}
            style={{ background: apiKeyInput.trim() ? "linear-gradient(135deg, #e84545 0%, #6366f1 100%)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: "none", borderRadius: 12, padding: "12px 14px", color: apiKeyInput.trim() ? "#fff" : theme.textMuted, fontSize: 13, fontWeight: 600, cursor: apiKeyInput.trim() ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", opacity: apiKeyStatus === "validating" ? 0.7 : 1 }}>
            {apiKeyStatus === "validating" ? "Validating..." : "Save & Activate"}
          </button>
        </div>
      )}

      <div style={{ fontSize: 10, color: theme.textDim, textAlign: "center", lineHeight: 1.6, marginTop: 8 }}>
        🔒 Your key is stored privately in your Google Drive. It persists across devices and browser clears — tied to your Google account.
      </div>
    </div>
  );

  // ── Chat Panel ──────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, width: 420, maxWidth: "calc(100vw - 40px)", height: 600, maxHeight: "calc(100vh - 60px)",
      borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 9999,
      background: isDark ? "linear-gradient(145deg, #0E1826, #0A1220)" : "linear-gradient(145deg, #FFFFFF, #F8FAFC)",
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
      boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)" : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,1)",
      animation: "chatSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    }}>
      {/* Header */}
      <div style={{ padding: "18px 20px", background: "linear-gradient(135deg, #e84545 0%, #6366f1 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, backdropFilter: "blur(10px)" }}>🤖</div>
          <div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2px" }}>Flow AI</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 600, letterSpacing: "0.3px" }}>
              {hasKey ? "Your task assistant" : "Setup required"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowSettings(!showSettings)} title="Settings"
            style={{ background: showSettings ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 32, height: 32, color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s", backdropFilter: "blur(10px)" }}>
            ⚙️
          </button>
          <button onClick={() => setOpen(false)}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 32, height: 32, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s", backdropFilter: "blur(10px)" }}>
            ✕
          </button>
        </div>
      </div>

      {/* Settings or Messages */}
      {showSettings ? renderSettings() : (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "chatSlideUp 0.2s ease" }}>
                <div style={{
                  maxWidth: "85%", padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, #e84545 0%, #d63939 100%)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  color: msg.role === "user" ? "#fff" : theme.text,
                  fontSize: 13, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif",
                  boxShadow: msg.role === "user" ? "0 4px 12px rgba(232,69,69,0.2)" : "none",
                  border: msg.role === "bot" ? isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)" : "none",
                }}>
                  {msg.role === "bot" ? renderMarkdown(msg.text) : msg.text}
                </div>
              </div>
            ))}

            {messages.length > 0 && messages[messages.length - 1].role === "bot" && messages[messages.length - 1].quickReplies?.length > 0 && !isTyping && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 4, animation: "chatSlideUp 0.3s ease" }}>
                {messages[messages.length - 1].quickReplies.map((qr, i) => (
                  <button key={i} onClick={() => handleSend(qr)}
                    style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.1)", borderRadius: 20, padding: "7px 14px", color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(232,69,69,0.15)" : "rgba(232,69,69,0.08)"; e.currentTarget.style.borderColor = theme.red; e.currentTarget.style.color = theme.red; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"; e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)"; }}>
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {isTyping && (
              <div style={{ display: "flex", justifyContent: "flex-start", animation: "chatSlideUp 0.2s ease" }}>
                <div style={{ padding: "14px 20px", borderRadius: "18px 18px 18px 4px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (<div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: theme.red, opacity: 0.6, animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite both` }} />))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: "12px 16px 16px", borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)", flexShrink: 0, background: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={hasKey ? "Type a message..." : "Add API key first (⚙️)"} disabled={!hasKey} rows={1}
                style={{ flex: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: "12px 16px", color: theme.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "none", maxHeight: 100, lineHeight: 1.5, transition: "border-color 0.2s, background 0.2s", opacity: hasKey ? 1 : 0.5 }}
                onFocus={(e) => { if (hasKey) { e.currentTarget.style.borderColor = theme.red; e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"; } }}
                onBlur={(e) => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"; e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"; }}
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping || !hasKey}
                style={{ width: 44, height: 44, borderRadius: 14, border: "none", background: input.trim() && hasKey ? "linear-gradient(135deg, #e84545 0%, #d63939 100%)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", color: input.trim() && hasKey ? "#fff" : theme.textMuted, fontSize: 18, cursor: input.trim() && hasKey ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0, boxShadow: input.trim() && hasKey ? "0 4px 12px rgba(232,69,69,0.3)" : "none" }}>
                ↑
              </button>
            </div>
            <div style={{ textAlign: "center", fontSize: 9, color: theme.textDim, marginTop: 8, letterSpacing: "0.3px", fontWeight: 600 }}>
              Flow AI • Powered by Gemini • Instant responses
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AIChatAssistant;
