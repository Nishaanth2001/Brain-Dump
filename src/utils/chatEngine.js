// ─────────────────────────────────────────────────────────────────────────────
// Hybrid AI Chat Engine — Rule-based conversation + compromise.js NLP
// ─────────────────────────────────────────────────────────────────────────────
import nlp from "compromise";

// ── NLP Helpers ─────────────────────────────────────────────────────────────

/** Parse natural-language date references into YYYY-MM-DD */
export function parseDate(text) {
  const lower = text.toLowerCase().trim();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Explicit "today", "tomorrow", "day after tomorrow"
  if (/\btoday\b/.test(lower)) return fmt(today);
  if (/\btomorrow\b/.test(lower)) return fmt(addDays(today, 1));
  if (/\bday after tomorrow\b/.test(lower)) return fmt(addDays(today, 2));
  if (/\byesterday\b/.test(lower)) return fmt(addDays(today, -1));

  // "next <weekday>"
  const nextDay = lower.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (nextDay) return fmt(getNextWeekday(nextDay[1], today));

  // "this <weekday>"
  const thisDay = lower.match(/\bthis\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (thisDay) return fmt(getNextWeekday(thisDay[1], today, true));

  // "<weekday>" alone
  const justDay = lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (justDay && lower.split(/\s+/).length <= 3) return fmt(getNextWeekday(justDay[1], today));

  // "in X days/weeks"
  const inXDays = lower.match(/\bin\s+(\d+)\s+(day|days|week|weeks)\b/);
  if (inXDays) {
    const n = parseInt(inXDays[1]);
    const unit = inXDays[2].startsWith("week") ? 7 : 1;
    return fmt(addDays(today, n * unit));
  }

  // "end of week" / "end of month"
  if (/\bend of (?:this )?week\b/.test(lower)) {
    const dow = today.getDay();
    return fmt(addDays(today, (5 - dow + 7) % 7 || 7)); // Friday
  }
  if (/\bend of (?:this )?month\b/.test(lower)) {
    return fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  }

  // Try compromise for more complex dates
  const doc = nlp(text);
  const dates = doc.dates().json();
  if (dates.length > 0 && dates[0].start) {
    const parsed = new Date(dates[0].start);
    if (!isNaN(parsed.getTime())) return fmt(parsed);
  }

  // YYYY-MM-DD already
  const iso = lower.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  // MM/DD or MM-DD
  const mdd = lower.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (mdd) {
    const m = parseInt(mdd[1]) - 1;
    const d = parseInt(mdd[2]);
    let y = today.getFullYear();
    const candidate = new Date(y, m, d);
    if (candidate < today) y++;
    return fmt(new Date(y, m, d));
  }

  return null;
}

/** Extract priority from natural text */
export function parsePriority(text) {
  const lower = text.toLowerCase();

  // Direct key matches
  if (/\b(hh|do first)\b/.test(lower)) return "HH";
  if (/\b(hl|schedule)\b/.test(lower)) return "HL";
  if (/\b(lh|delegate)\b/.test(lower)) return "LH";
  if (/\b(ll|drop)\b/.test(lower)) return "LL";

  // Natural language hints
  if (/\b(critical|urgent|asap|immediately|highest|very important|top priority|do first)\b/.test(lower)) return "HH";
  if (/\b(important|high|significant|soon|should do|need to|must)\b/.test(lower)) return "HL";
  if (/\b(can wait|someone else|delegate|hand off|pass|low urgency)\b/.test(lower)) return "LH";
  if (/\b(not important|whenever|someday|maybe|skip|low|minor|trivial|not urgent|no rush)\b/.test(lower)) return "LL";

  // Numbered priority
  if (/\b(1|one|first)\b/.test(lower) && /\bpriorit/i.test(lower)) return "HH";
  if (/\b(2|two|second)\b/.test(lower) && /\bpriorit/i.test(lower)) return "HL";
  if (/\b(3|three|third)\b/.test(lower) && /\bpriorit/i.test(lower)) return "LH";
  if (/\b(4|four|fourth|last)\b/.test(lower) && /\bpriorit/i.test(lower)) return "LL";

  return null;
}

/** Fuzzy match a section name */
export function matchSection(text, sections) {
  const lower = text.toLowerCase().trim();
  // Exact match
  const exact = sections.find(s => s.name.toLowerCase() === lower);
  if (exact) return exact;
  // Starts-with
  const starts = sections.find(s => s.name.toLowerCase().startsWith(lower));
  if (starts) return starts;
  // Contains
  const contains = sections.find(s => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()));
  if (contains) return contains;
  return null;
}

/** Detect task type from text */
export function parseTaskType(text) {
  const lower = text.toLowerCase();
  if (/\b(routine|recurring|daily|weekly|every day|every week|repeat|regular)\b/.test(lower)) return "routine";
  if (/\b(one.?off|once|on.?demand|single)\b/.test(lower)) return "ondemand";
  return null;
}

/** Detect user intent from free text */
export function detectIntent(text) {
  const lower = text.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|yo|sup|what's up|good morning|good afternoon|good evening)\b/.test(lower))
    return "greeting";

  // Help / info
  if (/\b(help|what can you do|how do|guide|tutorial|explain)\b/.test(lower))
    return "help";

  // Add task intent
  if (/\b(add|create|new|make|schedule|set up|plan|i need to|i have to|i want to|i should|remind me|can you add|please add)\b/.test(lower))
    return "add_task";

  // View / check schedule
  if (/\b(what('s| is)|show|list|check|how many|my tasks|today|schedule|upcoming|due|overdue|what do i have|what's on|status)\b/.test(lower))
    return "view_tasks";

  // Summary / stats
  if (/\b(summary|overview|stats|report|workload|how am i doing|progress)\b/.test(lower))
    return "summary";

  // If the message is just a plain noun phrase, likely adding a task
  const doc = nlp(text);
  if (doc.nouns().length > 0 && text.split(/\s+/).length >= 2 && text.split(/\s+/).length <= 15)
    return "add_task_implicit";

  return "unknown";
}

/** Extract a task title from a longer sentence */
export function extractTitle(text) {
  let clean = text
    .replace(/\b(add|create|new|make|schedule|set up|plan|please|can you|i need to|i have to|i want to|i should|remind me to|a task|task called|task named|task for|task to|task:)\b/gi, "")
    .replace(/\b(by|due|before|until|deadline)\s+.*/gi, "") // strip date tail
    .replace(/\b(urgent|asap|important|high priority|low priority|critical|not important)\b/gi, "")
    .replace(/\b(in|to|for)\s+(work|personal|home|health)\b/gi, "") // strip section hints
    .replace(/\b(routine|recurring|daily|weekly|on demand|one off)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize first letter
  if (clean.length > 0) clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  return clean || text.trim();
}

/** Guess which section a task might belong to based on keywords */
export function guessSection(text, sections) {
  const lower = text.toLowerCase();

  const KEYWORDS = {
    work: ["meeting", "report", "email", "project", "deadline", "client", "presentation", "review", "sprint", "standup", "office", "colleague", "boss", "manager", "team", "code", "deploy", "pull request", "jira", "slack"],
    personal: ["gym", "workout", "exercise", "doctor", "dentist", "appointment", "grocery", "shopping", "cook", "clean", "laundry", "family", "friend", "birthday", "party", "vacation", "travel", "read", "book", "movie", "game"],
    health: ["medicine", "vitamin", "pill", "water", "sleep", "walk", "run", "yoga", "meditate", "diet", "weight", "checkup", "therapy"],
    home: ["fix", "repair", "plumber", "electrician", "garden", "paint", "furniture", "rent", "mortgage", "bills", "utilities", "insurance"],
    finance: ["pay", "bank", "invest", "tax", "budget", "save", "expense", "invoice", "salary", "loan"],
    study: ["study", "learn", "course", "lecture", "homework", "assignment", "exam", "test", "research", "class", "tutorial"],
  };

  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      const match = sections.find(s => s.name.toLowerCase().includes(category));
      if (match) return match;
    }
  }

  return null;
}

// ── Date Utilities ──────────────────────────────────────────────────────────

function fmt(d) { return d.toISOString().split("T")[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

const WEEKDAY_MAP = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
function getNextWeekday(name, from, allowToday = false) {
  const target = WEEKDAY_MAP[name.toLowerCase()];
  const current = from.getDay();
  let diff = target - current;
  if (diff < 0 || (diff === 0 && !allowToday)) diff += 7;
  return addDays(from, diff);
}


// ── Conversation State Machine ──────────────────────────────────────────────

/**
 * The conversation state stores what the bot knows and what it still needs.
 * State flow: idle → collecting → confirming → idle
 */
export function createConversation() {
  return {
    state: "idle",    // idle | collecting | confirming | viewing
    draft: null,      // The task being built: { title, sectionId, priority, startDate, deadlineDate, taskType, notes, tags }
    pendingField: null, // which field we're currently asking about
    history: [],      // { role: "user"|"bot", text, timestamp, quickReplies? }
  };
}

/**
 * Main entry — processes a user message and returns a bot response.
 *
 * @param {string} userText — what the user typed
 * @param {object} conv — current conversation state (mutated in place)
 * @param {object} context — { tasks, sections, blockedTimes, workHours }
 * @returns {{ text: string, quickReplies?: string[], action?: object }}
 */
export function processMessage(userText, conv, context) {
  const { tasks, sections } = context;
  const text = userText.trim();

  // Push user message
  conv.history.push({ role: "user", text, timestamp: Date.now() });

  // ─── Handle cancel at any point ───────────────────────────────────────
  if (/^(cancel|stop|never ?mind|forget it|nah|nope|exit)$/i.test(text)) {
    conv.state = "idle";
    conv.draft = null;
    conv.pendingField = null;
    return reply(conv, "No worries, cancelled! What else can I help with?", ["Add a task", "Show today's tasks", "Summary"]);
  }

  // ─── State: Confirming ────────────────────────────────────────────────
  if (conv.state === "confirming") {
    return handleConfirmation(text, conv, context);
  }

  // ─── State: Collecting task fields ────────────────────────────────────
  if (conv.state === "collecting") {
    return handleCollection(text, conv, context);
  }

  // ─── State: Idle — detect intent ──────────────────────────────────────
  const intent = detectIntent(text);

  switch (intent) {
    case "greeting":
      return reply(conv, getGreeting(tasks), ["Add a task", "Show today's tasks", "Summary"]);

    case "help":
      return reply(conv,
        "Here's what I can do:\n\n" +
        "• **Add a task** — just tell me what you need to do\n" +
        "• **Show today's tasks** — see what's scheduled\n" +
        "• **Summary** — overview of your workload\n" +
        "• **Check overdue** — find behind-schedule tasks\n\n" +
        "You can type naturally — I'll figure out the priority, dates, and section!",
        ["Add a task", "Today's tasks", "Summary"]
      );

    case "view_tasks":
      return handleViewTasks(text, conv, context);

    case "summary":
      return handleSummary(conv, context);

    case "add_task":
    case "add_task_implicit":
      return startTaskCreation(text, conv, context);

    default:
      // Try treating it as a task title
      if (text.length > 2 && text.length < 200) {
        return startTaskCreation(text, conv, context);
      }
      return reply(conv,
        "I'm not sure what you mean. You can:\n• Tell me a task to add\n• Ask about today's schedule\n• Get a summary",
        ["Add a task", "Today's tasks", "Summary"]
      );
  }
}


// ── Intent Handlers ─────────────────────────────────────────────────────────

function getGreeting(tasks) {
  const today = new Date().toISOString().split("T")[0];
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  const overdue = active.filter(t => t.deadlineDate && t.deadlineDate < today);
  const todayDue = active.filter(t => t.deadlineDate === today);

  let msg = "Hey! 👋 I'm your task assistant.";
  if (active.length === 0) {
    msg += " You have no active tasks — want to add some?";
  } else {
    msg += ` You have **${active.length}** active task${active.length !== 1 ? "s" : ""}.`;
    if (overdue.length > 0) msg += ` ⚠️ **${overdue.length}** overdue!`;
    if (todayDue.length > 0) msg += ` 📅 **${todayDue.length}** due today.`;
    msg += "\n\nWhat would you like to do?";
  }
  return msg;
}

function handleViewTasks(text, conv, context) {
  const { tasks } = context;
  const lower = text.toLowerCase();
  const today = new Date().toISOString().split("T")[0];
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");

  // Overdue
  if (/\boverdue\b/.test(lower) || /\bbehind\b/.test(lower)) {
    const overdue = active.filter(t => t.deadlineDate && t.deadlineDate < today);
    if (overdue.length === 0) return reply(conv, "✅ No overdue tasks! You're all caught up.", ["Add a task", "Summary"]);
    let msg = `⚠️ You have **${overdue.length}** overdue task${overdue.length !== 1 ? "s" : ""}:\n\n`;
    overdue.forEach((t, i) => { msg += `${i + 1}. **${t.title}** — due ${t.deadlineDate}\n`; });
    return reply(conv, msg, ["Add a task", "Summary"]);
  }

  // Today's tasks
  if (/\btoday\b/.test(lower) || /\bdue\b/.test(lower) || /\bschedule\b/.test(lower)) {
    const todayTasks = active.filter(t =>
      (t.startDate && t.startDate <= today && (!t.deadlineDate || t.deadlineDate >= today)) ||
      t.deadlineDate === today
    );
    if (todayTasks.length === 0) return reply(conv, "📋 No tasks on today's schedule. Enjoy or plan ahead!", ["Add a task", "Summary"]);
    let msg = `📋 Here's what you have for today (**${todayTasks.length}** tasks):\n\n`;
    todayTasks.forEach((t, i) => {
      const pri = { HH: "🔴", HL: "🟡", LH: "🔵", LL: "⚪" }[t.priority] || "⚪";
      msg += `${pri} **${t.title}** — ${t.progress || 0}% done${t.deadlineDate === today ? " ⏰ Due today!" : ""}\n`;
    });
    return reply(conv, msg, ["Add a task", "Summary"]);
  }

  // All tasks
  if (active.length === 0) return reply(conv, "You don't have any active tasks right now.", ["Add a task"]);
  let msg = `📂 You have **${active.length}** active tasks:\n\n`;
  const byPriority = { HH: [], HL: [], LH: [], LL: [] };
  active.forEach(t => { (byPriority[t.priority] || byPriority.LL).push(t); });
  const labels = { HH: "🔴 Do First", HL: "🟡 Schedule", LH: "🔵 Delegate", LL: "⚪ Drop" };
  Object.entries(byPriority).forEach(([key, list]) => {
    if (list.length > 0) {
      msg += `**${labels[key]}** (${list.length}):\n`;
      list.slice(0, 5).forEach(t => { msg += `  • ${t.title}${t.deadlineDate ? ` — due ${t.deadlineDate}` : ""}\n`; });
      if (list.length > 5) msg += `  _...and ${list.length - 5} more_\n`;
      msg += "\n";
    }
  });
  return reply(conv, msg.trim(), ["Add a task", "Summary"]);
}

function handleSummary(conv, context) {
  const { tasks, sections } = context;
  const today = new Date().toISOString().split("T")[0];
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  const done = tasks.filter(t => t.status === "Done" || t.status === "Done Late");
  const overdue = active.filter(t => t.deadlineDate && t.deadlineDate < today);
  const inProgress = active.filter(t => t.status === "In Progress");
  const notStarted = active.filter(t => t.status === "Not Started");

  let msg = "📊 **Your Task Summary**\n\n";
  msg += `• **${active.length}** active tasks (${inProgress.length} in progress, ${notStarted.length} not started)\n`;
  msg += `• **${done.length}** completed tasks\n`;
  if (overdue.length > 0) msg += `• ⚠️ **${overdue.length}** overdue\n`;
  msg += `• **${sections.length}** sections\n\n`;

  // Per-section breakdown
  if (sections.length > 0) {
    msg += "**By Section:**\n";
    sections.forEach(s => {
      const count = active.filter(t => t.sectionId === s.id).length;
      msg += `  📁 ${s.name}: ${count} task${count !== 1 ? "s" : ""}\n`;
    });
  }

  // Avg progress
  if (inProgress.length > 0) {
    const avgProgress = Math.round(inProgress.reduce((s, t) => s + (t.progress || 0), 0) / inProgress.length);
    msg += `\n📈 Average progress on in-progress tasks: **${avgProgress}%**`;
  }

  return reply(conv, msg, ["Add a task", "Today's tasks", "Show overdue"]);
}

// ── Task Creation Flow ──────────────────────────────────────────────────────

function startTaskCreation(text, conv, context) {
  const { sections, tasks } = context;
  const today = new Date().toISOString().split("T")[0];

  // Extract everything we can from the initial message
  const title = extractTitle(text);
  const priority = parsePriority(text);
  const deadline = parseDate(text);
  const taskType = parseTaskType(text);

  // Try to guess section
  let section = null;
  // Check if user mentioned a section name
  for (const s of sections) {
    if (text.toLowerCase().includes(s.name.toLowerCase())) {
      section = s;
      break;
    }
  }
  if (!section) section = guessSection(text, sections);

  // Check for duplicate
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  const duplicate = active.find(t => t.title.toLowerCase() === title.toLowerCase());

  conv.draft = {
    title: title || "",
    sectionId: section?.id || null,
    sectionName: section?.name || null,
    priority: priority || null,
    startDate: today,
    deadlineDate: deadline || "",
    taskType: taskType || "ondemand",
    notes: "",
    tags: [],
  };

  conv.state = "collecting";

  let msg = "";
  if (duplicate) {
    msg += `⚠️ You already have a task called **"${duplicate.title}"**. I'll create this as a new one.\n\n`;
  }

  msg += `Got it — **"${conv.draft.title}"** 📝\n\n`;

  // Show what was auto-detected
  const detected = [];
  if (priority) detected.push(`Priority: **${{ HH: "🔴 Do First", HL: "🟡 Schedule", LH: "🔵 Delegate", LL: "⚪ Drop" }[priority]}**`);
  if (deadline) detected.push(`Deadline: **${deadline}**`);
  if (section) detected.push(`Section: **📁 ${section.name}**`);
  if (taskType) detected.push(`Type: **${taskType === "routine" ? "🔁 Routine" : "⚡ On Demand"}**`);

  if (detected.length > 0) {
    msg += "I picked up:\n" + detected.map(d => `  ✓ ${d}`).join("\n") + "\n\n";
  }

  // Ask for the first missing field
  return askNextField(conv, context, msg);
}

function askNextField(conv, context, prefixMsg = "") {
  const { sections, tasks } = context;
  const draft = conv.draft;

  // 1. Need section?
  if (!draft.sectionId) {
    if (sections.length === 0) {
      // No sections exist — can't create task
      conv.state = "idle";
      conv.draft = null;
      return reply(conv, prefixMsg + "You don't have any sections yet. Create a section first, then come back!", ["OK"]);
    }
    if (sections.length === 1) {
      // Auto-assign the only section
      draft.sectionId = sections[0].id;
      draft.sectionName = sections[0].name;
    } else {
      conv.pendingField = "section";
      const sectionList = sections.map(s => s.name);
      return reply(conv,
        prefixMsg + `Which section should this go in?`,
        sectionList
      );
    }
  }

  // 2. Need priority?
  if (!draft.priority) {
    conv.pendingField = "priority";
    return reply(conv,
      prefixMsg + "How urgent and important is this?",
      ["🔴 Do First", "🟡 Schedule", "🔵 Delegate", "⚪ Drop"]
    );
  }

  // 3. Need deadline?
  if (!draft.deadlineDate) {
    conv.pendingField = "deadline";
    return reply(conv,
      prefixMsg + "When is this due? (e.g. *tomorrow*, *Friday*, *end of week*, or *skip*)",
      ["Tomorrow", "This Friday", "End of week", "End of month", "No deadline"]
    );
  }

  // All fields collected — go to confirmation
  return showConfirmation(conv, context, prefixMsg);
}

function handleCollection(text, conv, context) {
  const { sections } = context;
  const field = conv.pendingField;

  if (field === "section") {
    // Try to match section
    const matched = matchSection(text, sections);
    if (matched) {
      conv.draft.sectionId = matched.id;
      conv.draft.sectionName = matched.name;
      conv.pendingField = null;
      return askNextField(conv, context, `📁 Section: **${matched.name}**\n\n`);
    }
    // Try number selection
    const num = parseInt(text);
    if (num >= 1 && num <= sections.length) {
      const s = sections[num - 1];
      conv.draft.sectionId = s.id;
      conv.draft.sectionName = s.name;
      conv.pendingField = null;
      return askNextField(conv, context, `📁 Section: **${s.name}**\n\n`);
    }
    return reply(conv, `I couldn't find that section. Please pick one:`, sections.map(s => s.name));
  }

  if (field === "priority") {
    const parsed = parsePriority(text);
    // Also handle quick-reply button text
    const buttonMap = { "do first": "HH", "schedule": "HL", "delegate": "LH", "drop": "LL" };
    const cleaned = text.replace(/[🔴🟡🔵⚪]/g, "").trim().toLowerCase();
    const priority = parsed || buttonMap[cleaned] || null;

    if (priority) {
      conv.draft.priority = priority;
      conv.pendingField = null;
      const label = { HH: "🔴 Do First", HL: "🟡 Schedule", LH: "🔵 Delegate", LL: "⚪ Drop" }[priority];
      return askNextField(conv, context, `Priority: **${label}**\n\n`);
    }
    return reply(conv, "Please pick a priority:", ["🔴 Do First", "🟡 Schedule", "🔵 Delegate", "⚪ Drop"]);
  }

  if (field === "deadline") {
    const lower = text.toLowerCase().trim();
    if (/\b(no|none|skip|no deadline|not sure)\b/.test(lower)) {
      conv.draft.deadlineDate = "";
      conv.pendingField = null;
      return askNextField(conv, context, "📅 No deadline set.\n\n");
    }
    const date = parseDate(text);
    if (date) {
      conv.draft.deadlineDate = date;
      conv.pendingField = null;
      return askNextField(conv, context, `📅 Deadline: **${date}**\n\n`);
    }
    return reply(conv, "I couldn't understand that date. Try something like *tomorrow*, *next Friday*, *June 25*, or *skip*.", ["Tomorrow", "Next Friday", "End of month", "No deadline"]);
  }

  // Fallback
  return askNextField(conv, context);
}

function showConfirmation(conv, context, prefixMsg = "") {
  const draft = conv.draft;
  const priLabel = { HH: "🔴 Do First", HL: "🟡 Schedule", LH: "🔵 Delegate", LL: "⚪ Drop" }[draft.priority];
  const typeLabel = draft.taskType === "routine" ? "🔁 Routine" : "⚡ On Demand";

  // Check workload for the deadline day
  let workloadWarning = "";
  if (draft.deadlineDate) {
    const { tasks } = context;
    const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
    const sameDayTasks = active.filter(t => t.deadlineDate === draft.deadlineDate);
    if (sameDayTasks.length >= 3) {
      workloadWarning = `\n\n💡 **Heads up:** You already have **${sameDayTasks.length}** tasks due on ${draft.deadlineDate}. Might be a busy day!`;
    }
  }

  conv.state = "confirming";
  conv.pendingField = null;

  let msg = prefixMsg + "Here's what I'll create:\n\n";
  msg += `📝 **${draft.title}**\n`;
  msg += `📁 Section: ${draft.sectionName}\n`;
  msg += `${priLabel}\n`;
  msg += `📅 Start: ${draft.startDate}\n`;
  msg += draft.deadlineDate ? `📅 Deadline: ${draft.deadlineDate}\n` : `📅 Deadline: None\n`;
  msg += `${typeLabel}\n`;
  msg += workloadWarning;
  msg += "\n\nShall I create this task?";

  return reply(conv, msg, ["✅ Create it!", "✏️ Change something", "❌ Cancel"]);
}

function handleConfirmation(text, conv, context) {
  const lower = text.toLowerCase().trim();

  if (/\b(yes|yep|yeah|sure|ok|okay|do it|create|confirm|go|✅|create it)\b/.test(lower)) {
    // Create the task!
    const draft = conv.draft;
    const task = {
      title: draft.title,
      sectionId: draft.sectionId,
      priority: draft.priority,
      startDate: draft.startDate,
      deadlineDate: draft.deadlineDate,
      taskType: draft.taskType,
      notes: draft.notes,
      tags: draft.tags,
    };

    conv.state = "idle";
    conv.draft = null;
    conv.pendingField = null;

    return reply(conv,
      `✅ Task created!\n\n📝 **"${task.title}"** has been added to **${draft.sectionName}**.`,
      ["Add another task", "Show today's tasks", "Summary"],
      { type: "create_task", task }
    );
  }

  if (/\b(change|edit|modify|update|✏️)\b/.test(lower)) {
    conv.state = "collecting";
    return reply(conv, "What would you like to change?", ["Title", "Section", "Priority", "Deadline", "Task type"]);
  }

  // Handle specific field changes
  if (/\btitle\b/.test(lower)) {
    conv.state = "collecting";
    conv.pendingField = "title_change";
    return reply(conv, "What should the new title be?");
  }
  if (/\bsection\b/.test(lower)) {
    conv.draft.sectionId = null;
    conv.draft.sectionName = null;
    conv.state = "collecting";
    return askNextField(conv, context);
  }
  if (/\bpriority\b/.test(lower)) {
    conv.draft.priority = null;
    conv.state = "collecting";
    return askNextField(conv, context);
  }
  if (/\bdeadline\b|\bdate\b/.test(lower)) {
    conv.draft.deadlineDate = "";
    conv.state = "collecting";
    conv.pendingField = "deadline";
    return reply(conv, "When is this due?", ["Tomorrow", "Next Friday", "End of month", "No deadline"]);
  }
  if (/\btype\b/.test(lower)) {
    conv.draft.taskType = conv.draft.taskType === "routine" ? "ondemand" : "routine";
    return showConfirmation(conv, context, `Type changed to **${conv.draft.taskType === "routine" ? "🔁 Routine" : "⚡ On Demand"}**.\n\n`);
  }

  if (/\b(no|nah|cancel|nope|❌)\b/.test(lower)) {
    conv.state = "idle";
    conv.draft = null;
    conv.pendingField = null;
    return reply(conv, "Cancelled! What else can I help with?", ["Add a task", "Today's tasks"]);
  }

  return reply(conv, "Just say **yes** to create it, **change** to edit, or **cancel** to discard.", ["✅ Create it!", "✏️ Change something", "❌ Cancel"]);
}


// ── Reply Helper ────────────────────────────────────────────────────────────

function reply(conv, text, quickReplies = [], action = null) {
  const msg = { role: "bot", text, timestamp: Date.now(), quickReplies };
  conv.history.push(msg);
  return { text, quickReplies, action };
}
