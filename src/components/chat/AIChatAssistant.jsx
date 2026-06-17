import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { createConversation, processMessage } from "../../utils/chatEngine";
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

function AIChatAssistant({ tasks, sections, blockedTimes, workHours, onSave }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [conv, setConv] = useState(() => createConversation());
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
      // Send greeting if no messages yet
      if (messages.length === 0) {
        sendInitialGreeting();
      }
    }
  }, [open]);

  const sendInitialGreeting = useCallback(() => {
    const greeting = processMessage("hi", conv, { tasks, sections, blockedTimes, workHours });
    setMessages([...conv.history]);
  }, [conv, tasks, sections, blockedTimes, workHours]);

  const handleSend = useCallback((text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");

    // Simulate brief typing delay for natural feel
    setIsTyping(true);
    const delay = Math.min(300 + msg.length * 15, 1200);

    setTimeout(() => {
      const result = processMessage(msg, conv, { tasks, sections, blockedTimes, workHours });

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

      setMessages([...conv.history]);
      setIsTyping(false);
    }, delay);
  }, [input, conv, tasks, sections, blockedTimes, workHours, onSave]);

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

  // ── Chat Panel ──────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed",
      bottom: 28,
      right: 28,
      width: 420,
      maxWidth: "calc(100vw - 40px)",
      height: 600,
      maxHeight: "calc(100vh - 60px)",
      borderRadius: 24,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      zIndex: 9999,
      background: isDark
        ? "linear-gradient(145deg, #0E1826, #0A1220)"
        : "linear-gradient(145deg, #FFFFFF, #F8FAFC)",
      border: isDark
        ? "1px solid rgba(255,255,255,0.1)"
        : "1px solid rgba(0,0,0,0.08)",
      boxShadow: isDark
        ? "0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)"
        : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,1)",
      animation: "chatSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 20px",
        background: "linear-gradient(135deg, #e84545 0%, #6366f1 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            backdropFilter: "blur(10px)",
          }}>
            🤖
          </div>
          <div>
            <div style={{
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.2px",
            }}>
              Flow AI
            </div>
            <div style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.3px",
            }}>
              Your task assistant
            </div>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 10,
            width: 32,
            height: 32,
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 16px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            animation: "chatSlideUp 0.2s ease",
          }}>
            <div style={{
              maxWidth: "85%",
              padding: "12px 16px",
              borderRadius: msg.role === "user"
                ? "18px 18px 4px 18px"
                : "18px 18px 18px 4px",
              background: msg.role === "user"
                ? "linear-gradient(135deg, #e84545 0%, #d63939 100%)"
                : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              color: msg.role === "user"
                ? "#fff"
                : theme.text,
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: msg.role === "user"
                ? "0 4px 12px rgba(232,69,69,0.2)"
                : "none",
              border: msg.role === "bot"
                ? isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)"
                : "none",
            }}>
              {msg.role === "bot" ? renderMarkdown(msg.text) : msg.text}
            </div>
          </div>
        ))}

        {/* Quick Replies */}
        {messages.length > 0 && messages[messages.length - 1].role === "bot" && messages[messages.length - 1].quickReplies?.length > 0 && !isTyping && (
          <div style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            paddingLeft: 4,
            animation: "chatSlideUp 0.3s ease",
          }}>
            {messages[messages.length - 1].quickReplies.map((qr, i) => (
              <button
                key={i}
                onClick={() => handleSend(qr)}
                style={{
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 20,
                  padding: "7px 14px",
                  color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)",
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? "rgba(232,69,69,0.15)" : "rgba(232,69,69,0.08)";
                  e.currentTarget.style.borderColor = theme.red;
                  e.currentTarget.style.color = theme.red;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                  e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
                  e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{
            display: "flex",
            justifyContent: "flex-start",
            animation: "chatSlideUp 0.2s ease",
          }}>
            <div style={{
              padding: "14px 20px",
              borderRadius: "18px 18px 18px 4px",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              gap: 5,
              alignItems: "center",
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: theme.red,
                  opacity: 0.6,
                  animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: "12px 16px 16px",
        borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
        flexShrink: 0,
        background: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
      }}>
        <div style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex: 1,
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
              borderRadius: 16,
              padding: "12px 16px",
              color: theme.text,
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              outline: "none",
              resize: "none",
              maxHeight: 100,
              lineHeight: 1.5,
              transition: "border-color 0.2s, background 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.red;
              e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
              e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "none",
              background: input.trim()
                ? "linear-gradient(135deg, #e84545 0%, #d63939 100%)"
                : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              color: input.trim() ? "#fff" : theme.textMuted,
              fontSize: 18,
              cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              flexShrink: 0,
              boxShadow: input.trim() ? "0 4px 12px rgba(232,69,69,0.3)" : "none",
            }}
            onMouseEnter={(e) => {
              if (input.trim()) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(232,69,69,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = input.trim() ? "0 4px 12px rgba(232,69,69,0.3)" : "none";
            }}
          >
            ↑
          </button>
        </div>
        <div style={{
          textAlign: "center",
          fontSize: 9,
          color: theme.textDim,
          marginTop: 8,
          letterSpacing: "0.3px",
          fontWeight: 600,
        }}>
          Flow AI • Understands dates, priorities & sections
        </div>
      </div>
    </div>
  );
}

export default AIChatAssistant;
