// ─────────────────────────────────────────────────────────────────────────────
// LLM-Powered Chat Engine — Fully offline browser AI using Web LLM
// ─────────────────────────────────────────────────────────────────────────────
import * as webllm from "@mlc-ai/web-llm";

// ── LLM Engine Singleton ────────────────────────────────────────────────────

let engineInstance = null;
let isInitializing = false;
let initError = null;

/**
 * Initialize the Web LLM engine (only once)
 * Model: Phi-3.5-mini-instruct (2.5GB, quantized, runs in browser)
 */
export async function initLLMEngine(onProgress = null) {
  if (engineInstance) return engineInstance;
  if (isInitializing) {
    // Wait for ongoing initialization
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return engineInstance;
  }

  isInitializing = true;
  initError = null;

  try {
    // The model weights (*.bin files) come from YOUR GitHub public folder.
    // The WASM runtime is NOT in the HuggingFace clone — it comes from WebLLM's
    // own prebuilt config. We only override the weights URL.
    const baseUrl = (window.location.origin + import.meta.env.BASE_URL).replace(/\/$/, "") + "/";

    // Get the correct WASM/model_lib URL from WebLLM's own prebuilt list
    const prebuilt = webllm.prebuiltAppConfig.model_list.find(
      m => m.model_id === "Phi-3.5-mini-instruct-q4f16_1-MLC"
    );

    if (!prebuilt) {
      throw new Error("Model not found in WebLLM prebuilt list. Check the model ID.");
    }

    const appConfig = {
      model_list: [
        {
          ...prebuilt,                                               // inherit WASM URL + all defaults
          model_id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
          model: `${baseUrl}Phi-3.5-mini-instruct-q4f16_1-MLC/`,   // your GitHub weights
        }
      ]
    };

    // Create engine loading weights from GitHub, WASM from WebLLM CDN
    const engine = await webllm.CreateMLCEngine(
      "Phi-3.5-mini-instruct-q4f16_1-MLC",
      {
        appConfig,
        initProgressCallback: (progress) => {
          if (onProgress) {
            onProgress({
              progress: progress.progress || 0,
              text: progress.text || "Loading AI model from GitHub...",
            });
          }
        },
      }
    );

    engineInstance = engine;
    isInitializing = false;
    return engine;
  } catch (error) {
    isInitializing = false;
    initError = error;
    console.error("Failed to initialize LLM:", error);
    throw error;
  }
}

/**
 * Get the current engine instance (or null if not initialized)
 */
export function getLLMEngine() {
  return engineInstance;
}

/**
 * Check if LLM is ready
 */
export function isLLMReady() {
  return engineInstance !== null;
}

// ── Conversation State ──────────────────────────────────────────────────────

export function createConversation() {
  return {
    messages: [], // { role: "user"|"assistant", content: string }
    history: [],  // { role: "user"|"bot", text, timestamp, quickReplies? }
  };
}

// ── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Flow AI, an intelligent task management assistant. You help users manage their tasks using the Eisenhower Priority Matrix (HH=Do First, HL=Schedule, LH=Delegate, LL=Drop).

**YOUR CAPABILITIES:**
- Create tasks with title, priority, deadline, section, type (routine/ondemand)
- Update task status (Not Started, In Progress, Done)
- Delete tasks
- Update progress (0-100%)
- Edit task properties (title, priority, deadline)
- Move tasks between types (routine ↔ ondemand)
- View tasks (today, overdue, all)
- Provide summaries and insights

**RESPONSE FORMAT:**
You MUST respond with JSON in this exact format:

\`\`\`json
{
  "message": "Your friendly response to the user",
  "action": {
    "type": "create_task" | "update_task" | "delete_task" | "view_tasks" | "summary" | "none",
    "data": { /* action-specific data */ }
  },
  "quickReplies": ["Button 1", "Button 2", "Button 3"]
}
\`\`\`

**ACTION TYPES:**

1. **create_task**: Create a new task
   \`\`\`json
   {
     "type": "create_task",
     "data": {
       "title": "Task title",
       "sectionId": "section-id",
       "priority": "HH|HL|LH|LL",
       "deadlineDate": "YYYY-MM-DD" | "",
       "taskType": "routine|ondemand",
       "routineStartTime": "HH:MM" | null,
       "routineEndTime": "HH:MM" | null
     }
   }
   \`\`\`

2. **update_task**: Update existing task
   \`\`\`json
   {
     "type": "update_task",
     "data": {
       "taskId": "task-id",
       "updates": {
         "status": "Not Started|In Progress|Done",
         "progress": 0-100,
         "title": "new title",
         "priority": "HH|HL|LH|LL",
         "deadlineDate": "YYYY-MM-DD"
       }
     }
   }
   \`\`\`

3. **delete_task**: Delete a task
   \`\`\`json
   {
     "type": "delete_task",
     "data": { "taskId": "task-id" }
   }
   \`\`\`

4. **view_tasks** or **summary**: Info request (no action needed, just show info)
   \`\`\`json
   {
     "type": "none",
     "data": null
   }
   \`\`\`

**IMPORTANT RULES:**
- Always be conversational and friendly
- Use markdown bold (**text**) for emphasis
- Use emojis appropriately (📝 🔴 🟡 🔵 ⚪ ✅ 📅 etc.)
- When creating tasks, infer priority/section/deadline from context
- For ambiguous requests, ask clarifying questions
- Match task names intelligently (fuzzy matching)
- Today's date is ${new Date().toISOString().split("T")[0]}

**PRIORITY MAPPING:**
- HH (🔴 Do First): urgent + important (critical, asap, urgent)
- HL (🟡 Schedule): important but not urgent (important, significant, should)
- LH (🔵 Delegate): urgent but not important (delegate, someone else)
- LL (⚪ Drop): neither urgent nor important (someday, maybe, low priority)

**SECTION KEYWORDS:**
- Work: meeting, report, email, project, client, code, deploy
- Personal: gym, workout, doctor, grocery, family, friend
- Health: medicine, exercise, diet, sleep, yoga
- Home: fix, repair, clean, bills, rent
- Finance: pay, bank, invest, tax, budget
- Study: study, learn, course, homework, exam

Always respond with valid JSON only. Never add explanatory text outside the JSON.`;

// ── Main Processing Function ────────────────────────────────────────────────

/**
 * Process user message using LLM
 * @param {string} userText - What the user typed
 * @param {object} conv - Conversation state
 * @param {object} context - { tasks, sections, blockedTimes, workHours }
 * @returns {Promise<{ text: string, quickReplies?: string[], action?: object }>}
 */
export async function processMessage(userText, conv, context) {
  const text = userText.trim();

  // Add user message to history
  conv.history.push({ role: "user", text, timestamp: Date.now() });

  // Check if LLM is ready
  const engine = getLLMEngine();
  if (!engine) {
    return {
      text: "⚠️ AI model is still loading. Please wait a moment...",
      quickReplies: [],
    };
  }

  // Build context for LLM
  const contextData = buildContextData(context);

  // Build conversation messages
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: `**CURRENT CONTEXT:**\n\`\`\`json\n${JSON.stringify(contextData, null, 2)}\n\`\`\`` },
    ...conv.messages,
    { role: "user", content: text },
  ];

  try {
    // Get LLM response
    const response = await engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0].message.content;

    // Parse JSON response
    let result;
    try {
      // Extract JSON from code blocks if present
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                        [null, aiResponse];
      result = JSON.parse(jsonMatch[1] || aiResponse);
    } catch (e) {
      console.error("Failed to parse LLM response:", aiResponse);
      result = {
        message: aiResponse,
        action: { type: "none", data: null },
        quickReplies: ["Add a task", "Show tasks", "Summary"],
      };
    }

    // Update conversation
    conv.messages.push(
      { role: "user", content: text },
      { role: "assistant", content: aiResponse }
    );

    // Process action
    const processedAction = await processAction(result.action, context);

    // Add to history
    conv.history.push({
      role: "bot",
      text: result.message,
      timestamp: Date.now(),
      quickReplies: result.quickReplies || [],
    });

    return {
      text: result.message,
      quickReplies: result.quickReplies || [],
      action: processedAction,
    };
  } catch (error) {
    console.error("LLM processing error:", error);
    return {
      text: "Sorry, I encountered an error processing your request. Please try again.",
      quickReplies: ["Add a task", "Show tasks", "Summary"],
    };
  }
}

// ── Helper Functions ────────────────────────────────────────────────────────

/**
 * Build context data for LLM
 */
function buildContextData(context) {
  const { tasks, sections } = context;
  const today = new Date().toISOString().split("T")[0];
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");

  return {
    today,
    sections: sections.map(s => ({
      id: s.id,
      name: s.name,
    })),
    tasks: active.map(t => ({
      id: t.id,
      title: t.title,
      sectionId: t.sectionId,
      priority: t.priority,
      status: t.status,
      progress: t.progress || 0,
      startDate: t.startDate,
      deadlineDate: t.deadlineDate,
      taskType: t.taskType,
      routineStartTime: t.routineStartTime,
      routineEndTime: t.routineEndTime,
    })),
    stats: {
      total: active.length,
      notStarted: active.filter(t => t.status === "Not Started").length,
      inProgress: active.filter(t => t.status === "In Progress").length,
      overdue: active.filter(t => t.deadlineDate && t.deadlineDate < today).length,
    },
  };
}

/**
 * Process action returned by LLM
 */
async function processAction(action, context) {
  if (!action || action.type === "none") return null;

  const { type, data } = action;

  switch (type) {
    case "create_task":
      return processCreateTask(data, context);

    case "update_task":
      return processUpdateTask(data, context);

    case "delete_task":
      return { type: "delete_task", taskId: data.taskId };

    default:
      return null;
  }
}

/**
 * Process create task action
 */
function processCreateTask(data, context) {
  const { sections } = context;
  const today = new Date().toISOString().split("T")[0];

  // Find section
  let section = sections.find(s => s.id === data.sectionId);
  if (!section && sections.length > 0) {
    section = sections[0]; // Default to first section
  }

  const task = {
    title: data.title,
    sectionId: section?.id || data.sectionId,
    priority: data.priority || "HL",
    startDate: today,
    deadlineDate: data.deadlineDate || "",
    taskType: data.taskType || "ondemand",
    routineStartTime: data.routineStartTime || null,
    routineEndTime: data.routineEndTime || null,
    notes: "",
    tags: [],
  };

  return { type: "create_task", task };
}

/**
 * Process update task action
 */
function processUpdateTask(data, context) {
  const { tasks } = context;
  const task = tasks.find(t => t.id === data.taskId);

  if (!task) {
    console.error("Task not found:", data.taskId);
    return null;
  }

  const today = new Date().toISOString().split("T")[0];
  const updates = data.updates || {};

  // Build updated task
  const updatedTask = { ...task };

  if (updates.status) {
    updatedTask.status = updates.status;
    if (updates.status === "Done" || updates.status === "Done Late") {
      updatedTask.completedAt = today;
      updatedTask.progress = 100;
    }
  }

  if (updates.progress !== undefined) {
    updatedTask.progress = updates.progress;
    if (updates.progress === 100) {
      const late = task.deadlineDate && task.deadlineDate < today;
      updatedTask.status = late ? "Done Late" : "Done";
      updatedTask.completedAt = today;
    } else if (updates.progress > 0 && task.status === "Not Started") {
      updatedTask.status = "In Progress";
    }
  }

  if (updates.title) updatedTask.title = updates.title;
  if (updates.priority) updatedTask.priority = updates.priority;
  if (updates.deadlineDate !== undefined) updatedTask.deadlineDate = updates.deadlineDate;
  if (updates.taskType) updatedTask.taskType = updates.taskType;

  return { type: "update_task", task: updatedTask };
}
