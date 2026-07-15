// ─────────────────────────────────────────────────────────────────────────────
// Gemini-Powered Chat Engine — BYOK (Bring Your Own Key)
// User's API key is saved to the local MongoDB server (persists with account)
// ─────────────────────────────────────────────────────────────────────────────

import { loadGeminiKey, saveGeminiKey, deleteGeminiKey } from "./apiClient";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Preferred models in order — the engine will auto-pick the first available one
const MODEL_PREFERENCES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
];

// ── API Key Management (saved to the local server / MongoDB) ───────────────

let cachedApiKey = null;
let resolvedModel = null; // dynamically resolved model name

/**
 * Load API key from the server (idToken = Firebase ID token)
 */
export async function loadApiKey(idToken) {
  if (cachedApiKey) return cachedApiKey;

  try {
    cachedApiKey = await loadGeminiKey(idToken);

    // Auto-resolve best model when key is loaded
    if (cachedApiKey && !resolvedModel) {
      validateApiKey(cachedApiKey); // fire-and-forget, resolves model in background
    }

    return cachedApiKey;
  } catch (err) {
    console.error("Failed to load API key from server:", err);
  }
  return null;
}

/**
 * Save API key to the server
 */
export async function saveApiKey(idToken, apiKey) {
  try {
    await saveGeminiKey(idToken, apiKey);
    cachedApiKey = apiKey;
    return true;
  } catch (err) {
    console.error("Failed to save API key to server:", err);
    return false;
  }
}

/**
 * Delete API key from the server
 */
export async function deleteApiKey(idToken) {
  try {
    await deleteGeminiKey(idToken);
    cachedApiKey = null;
    return true;
  } catch (err) {
    console.error("Failed to delete API key:", err);
    return false;
  }
}

/**
 * Validate an API key and auto-resolve the best available model.
 * 429 = key IS valid, just rate-limited → still counts as success.
 */
export async function validateApiKey(apiKey) {
  try {
    const res = await fetch(`${BASE_URL}/models?key=${apiKey}`, { method: "GET" });

    // 429 means the key is valid but rate-limited — still valid!
    if (res.status === 429) {
      resolvedModel = MODEL_PREFERENCES[MODEL_PREFERENCES.length - 1]; // fallback to safest
      return true;
    }
    if (!res.ok) return false;

    const data = await res.json();
    const available = (data.models || []).map(m => m.name.replace("models/", ""));

    // Pick the first preferred model that's available
    for (const pref of MODEL_PREFERENCES) {
      if (available.some(m => m.startsWith(pref))) {
        resolvedModel = pref;
        break;
      }
    }

    // If none of our preferences match, grab any flash model
    if (!resolvedModel) {
      const anyFlash = available.find(m => m.includes("flash"));
      resolvedModel = anyFlash || available[0] || MODEL_PREFERENCES[MODEL_PREFERENCES.length - 1];
    }

    console.log("[Flow AI] Resolved model:", resolvedModel);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the currently resolved model name
 */
export function getResolvedModel() {
  return resolvedModel;
}

/**
 * Get the cached API key (for quick checks without Drive call)
 */
export function getCachedApiKey() {
  return cachedApiKey;
}

export function isApiKeyReady() {
  return cachedApiKey !== null;
}

// ── Conversation Management ─────────────────────────────────────────────────

export function createConversation() {
  return {
    history: [], // { role: "user"|"model", parts: [{ text }] }
  };
}

// ── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(context) {
  const { tasks = [], sections = [], blockedTimes, workHours } = context;

  // Use browser's local timezone (not UTC)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "Asia/Kolkata"
  const localTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  const dayOfWeek = now.toLocaleDateString([], { weekday: "long" }); // e.g. "Friday"

  const todayTasks = tasks.filter(t => t.deadlineDate === today || t.startDate === today);
  const overdueTasks = tasks.filter(t => t.deadlineDate && t.deadlineDate < today && t.status !== "Done" && t.status !== "Done Late");
  const inProgress = tasks.filter(t => t.status === "In Progress");

  return `You are Flow AI, a smart and friendly task management assistant.
Today is ${dayOfWeek}, ${today}. Current local time: ${localTime} (${timeZone}).

CONTEXT - User's current data:
- Total tasks: ${tasks.length}
- Today's tasks: ${todayTasks.length}
- Overdue: ${overdueTasks.length}
- In Progress: ${inProgress.length}
- Sections: ${sections.map(s => `"${s.name}" (id: ${s.id})`).join(", ") || "None"}

FULL TASK LIST:
${tasks.length > 0 ? JSON.stringify(tasks.slice(0, 50), null, 1) : "No tasks yet."}

PRIORITY SYSTEM (Eisenhower Matrix):
- HH = Do First (urgent + important)
- HL = Schedule (important, not urgent)
- LH = Delegate (urgent, not important)
- LL = Drop (neither)

TASK TYPES: "routine" (recurring) or "ondemand" (one-time)
STATUS VALUES: "Not Started", "In Progress", "Done", "Done Late"

YOUR RESPONSE FORMAT - Always respond with valid JSON:
{
  "message": "Your friendly response to the user",
  "action": null | { "type": "...", ... },
  "quickReplies": ["Suggestion 1", "Suggestion 2"]
}

ACTION TYPES:
1. Create task:
   { "type": "create_task", "task": { "title": "...", "sectionId": "...", "priority": "HH|HL|LH|LL", "deadlineDate": "YYYY-MM-DD"|"", "taskType": "ondemand|routine", "startDate": "YYYY-MM-DD"|"" } }

2. Update task:
   { "type": "update_task", "task": { "id": "existing-task-id", ...fieldsToUpdate } }

3. Delete task:
   { "type": "delete_task", "taskId": "existing-task-id" }

4. No action (just chatting):
   null

RULES:
- Be concise and helpful. Use emoji sparingly.
- When creating tasks, infer priority from context if not specified.
- If user says "high priority" → HH. "schedule it" → HL. "not important" → LL.
- Default section: use the first section if user doesn't specify one.
- Default taskType: "ondemand" unless user mentions recurring/daily/weekly.
- For "show tasks" requests, summarize them in your message (no action needed).
- quickReplies: 2-4 short suggestions for follow-up actions.
- ALWAYS return valid JSON. No markdown code blocks around it.`;
}

// ── Message Processing ──────────────────────────────────────────────────────

/**
 * Send a message to Gemini and get a structured response
 */
export async function processMessage(userText, conversation, context) {
  const apiKey = cachedApiKey;
  if (!apiKey) {
    return {
      text: "⚠️ No API key configured. Please add your Gemini API key in the settings (⚙️ icon above).",
      action: null,
      quickReplies: ["How to get API key"],
    };
  }

  // Add user message to conversation history
  conversation.history.push({
    role: "user",
    parts: [{ text: userText }],
  });

  try {
    const model = resolvedModel || MODEL_PREFERENCES[MODEL_PREFERENCES.length - 1];
    const url = `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(context) }],
        },
        contents: conversation.history,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `API error: ${res.status}`;

      // Remove the failed user message from history
      conversation.history.pop();

      if (res.status === 429) {
        return {
          text: "⏳ Rate limit reached. Please wait a moment and try again.",
          action: null,
          quickReplies: ["Try again"],
        };
      }
      if (res.status === 400 && errMsg.includes("API key")) {
        return {
          text: "❌ Invalid API key. Please update it in settings (⚙️ icon).",
          action: null,
          quickReplies: ["Open settings"],
        };
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Add assistant response to history
    conversation.history.push({
      role: "model",
      parts: [{ text: responseText }],
    });

    // Parse the JSON response
    try {
      // Strip markdown code fences if Gemini wraps the JSON
      let cleanText = responseText.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }

      const parsed = JSON.parse(cleanText);
      return {
        text: parsed.message || "I processed your request.",
        action: parsed.action || null,
        quickReplies: parsed.quickReplies || [],
      };
    } catch {
      // If still not valid JSON, try to extract a message field with regex
      const msgMatch = responseText.match(/"message"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      if (msgMatch) {
        return {
          text: msgMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
          action: null,
          quickReplies: [],
        };
      }
      // Last resort — show raw text but strip JSON syntax noise
      return {
        text: responseText.replace(/[{}"\\]/g, "").replace(/message\s*:/i, "").trim() || "I processed your request.",
        action: null,
        quickReplies: [],
      };
    }
  } catch (err) {
    // Remove failed user message
    conversation.history.pop();
    console.error("Gemini API error:", err);
    return {
      text: `❌ Error: ${err.message}\n\nPlease try again.`,
      action: null,
      quickReplies: ["Try again"],
    };
  }
}