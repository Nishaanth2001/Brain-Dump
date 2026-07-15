// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED — This file is no longer used.
// The chatbot now uses llmChatEngine.js (LLM-powered, no keyword matching).
// ─────────────────────────────────────────────────────────────────────────────

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

/** Parse a natural-language time into HH:MM (24h) */
export function parseTime(text) {
  const lower = text.toLowerCase().trim();

  // Named shortcuts
  if (/\b(morning|start of day)\b/.test(lower)) return "09:00";
  if (/\b(noon|midday|lunch)\b/.test(lower)) return "12:00";
  if (/\b(afternoon)\b/.test(lower)) return "14:00";
  if (/\b(evening|end of day|eod)\b/.test(lower)) return "17:00";

  // Match patterns: "9:30 am", "9:30am", "09:30", "9am", "14:30", "2 pm"
  const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?/i;
  const match = lower.match(timeRegex);

  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2] || "0");
    const period = match[3]?.replace(/\./g, "").toLowerCase();

    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    // If no period given and hours <= 7, assume PM (e.g. "5" → 17:00)
    if (!period && hours >= 1 && hours <= 7) hours += 12;

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

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

  // Status change intents (must be before add_task to avoid conflict)
  if (/\b(mark|move|push|set|change|update|switch)\b.*\b(status|to|as|into)\b.*\b(in\s*progress|inprogress|started|working|done|complete|completed|finished|not started)\b/.test(lower))
    return "update_status";
  if (/\b(in\s*progress|inprogress|done|complete|completed|finished|not started)\b/.test(lower) &&
      /\b(mark|move|push|set|change|update|switch|put)\b/.test(lower))
    return "update_status";
  if (/\b(start|begin|work on|working on)\b/.test(lower) && !/\b(add|create|new|make)\b/.test(lower))
    return "update_status";
  if (/\b(mark|complete|finish|done)\b.*\b(task|it)\b/.test(lower))
    return "update_status";
  if (/\b(mark)\b.*\b(done|complete|finished)\b/.test(lower))
    return "update_status";

  // Delete intent
  if (/\b(delete|remove|trash|discard|get rid of)\b/.test(lower) && !/\b(add|create|new|make)\b/.test(lower))
    return "delete_task";

  // Progress update intent
  if (/\b(progress|percent|%)\b/.test(lower) && /\b(\d+)\b/.test(lower))
    return "update_progress";
  if (/\b(set|update|change)\b.*\b(progress|percent)\b/.test(lower))
    return "update_progress";

  // Move task type (routine <-> on demand)
  if (/\b(move|change|switch|convert)\b.*\b(to|into)\b.*\b(routine|on\s*demand|ondemand)\b/.test(lower))
    return "move_type";

  // Edit/update task fields
  if (/\b(edit|rename|update|change)\b.*\b(title|name|priority|deadline|section)\b/.test(lower))
    return "edit_task";

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

/** Normalize text for comparison — collapse spaces, remove special chars */
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Fuzzy-match a task by name from a sentence */
export function findTaskInText(text, tasks) {
  const lower = text.toLowerCase();
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  if (active.length === 0) return null;

  // ── Strategy 1: Exact title match in the raw text ─────────────────────
  const exactInText = active.find(t => lower.includes(t.title.toLowerCase()));
  if (exactInText) return exactInText;

  // ── Strategy 2: Normalized contains (handles "pushups" vs "push ups") ─
  const normText = normalize(text);
  const normMatch = active.find(t => {
    const normTitle = normalize(t.title);
    return normText.includes(normTitle) || normTitle.includes(normText.replace(/task/g, "").trim());
  });
  if (normMatch) return normMatch;

  // ── Strategy 3: Strip command words, then match ───────────────────────
  const cleaned = lower
    .replace(/\b(can you|please|push|move|set|mark|change|update|switch|start|begin|delete|remove|the|a|an|task|status|to|as|its?|of|it|that|this|i want|i need|want to|need to)\b/gi, "")
    .replace(/\b(in\s*progress|inprogress|not started|done|complete|finished|working|started)\b/gi, "")
    .replace(/\b(routine|on\s*demand|ondemand)\b/gi, "")
    .replace(/\b(progress|percent|%)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned) {
    // Exact on cleaned
    const exactCleaned = active.find(t => t.title.toLowerCase() === cleaned);
    if (exactCleaned) return exactCleaned;

    // Cleaned contained in title or vice versa
    const containsCleaned = active.find(t =>
      cleaned.includes(t.title.toLowerCase()) || t.title.toLowerCase().includes(cleaned)
    );
    if (containsCleaned) return containsCleaned;

    // Normalized cleaned match
    const normCleaned = normalize(cleaned);
    if (normCleaned.length >= 3) {
      const normCleanedMatch = active.find(t => {
        const normTitle = normalize(t.title);
        return normTitle.includes(normCleaned) || normCleaned.includes(normTitle);
      });
      if (normCleanedMatch) return normCleanedMatch;
    }
  }

  // ── Strategy 4: Score every task by multiple signals ──────────────────
  const scored = active.map(t => {
    const titleLower = t.title.toLowerCase();
    const titleNorm = normalize(t.title);
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 1);
    const inputWords = lower.split(/\s+/).filter(w => w.length > 1);
    let score = 0;

    // (a) How many title words appear in the user's text?
    const wordHits = titleWords.filter(w => lower.includes(w)).length;
    if (titleWords.length > 0) score += (wordHits / titleWords.length) * 40;

    // (b) How many user input words appear in the title?
    const reverseHits = inputWords.filter(w => titleLower.includes(w)).length;
    if (inputWords.length > 0) score += (reverseHits / inputWords.length) * 20;

    // (c) Normalized substring match (handles concatenated words)
    if (titleNorm.includes(normText.replace(/[^a-z0-9]/g, "")) ||
        normText.includes(titleNorm)) {
      score += 30;
    }

    // (d) Any individual user word is a substring of any title word (or vice versa)
    //     e.g. "pushups" contains "push" and "ups" from "push ups"
    const substringHits = titleWords.filter(tw =>
      inputWords.some(iw => iw.includes(tw) || tw.includes(iw))
    ).length;
    if (titleWords.length > 0) score += (substringHits / titleWords.length) * 25;

    // (e) Levenshtein-like: check if any input word is very close to any title word
    const closeHits = titleWords.filter(tw =>
      inputWords.some(iw => {
        if (tw.length < 3 || iw.length < 3) return false;
        // One is a prefix of the other (handles plurals, typos)
        return tw.startsWith(iw.slice(0, 3)) || iw.startsWith(tw.slice(0, 3));
      })
    ).length;
    if (titleWords.length > 0) score += (closeHits / titleWords.length) * 10;

    return { task: t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return the best match if it scores above threshold
  if (scored[0] && scored[0].score >= 25) {
    return scored[0].task;
  }

  return null;
}

/** Extract target status from text */
export function parseTargetStatus(text) {
  const lower = text.toLowerCase();
  if (/\b(in\s*progress|inprogress|started|working|start|begin)\b/.test(lower)) return "In Progress";
  if (/\b(done|complete|finished|mark done|mark complete)\b/.test(lower)) return "Done";
  if (/\b(not started|reset|restart)\b/.test(lower)) return "Not Started";
  return null;
}

/** Extract a percentage number from text */
export function parseProgress(text) {
  const match = text.match(/(\d+)\s*(%|percent)?/);
  if (match) {
    const num = parseInt(match[1]);
    if (num >= 0 && num <= 100) return num;
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
        "• **Start a task** — e.g. \"start pushups\" or \"move X to in progress\"\n" +
        "• **Mark done** — e.g. \"mark pushups done\" or \"complete X\"\n" +
        "• **Delete a task** — e.g. \"delete pushups\"\n" +
        "• **Update progress** — e.g. \"set pushups to 50%\"\n" +
        "• **Change type** — e.g. \"move X to routine\"\n" +
        "• **Show today's tasks** — see what's scheduled\n" +
        "• **Summary** — overview of your workload\n" +
        "• **Check overdue** — find behind-schedule tasks\n\n" +
        "You can type naturally — I'll figure out what you mean!",
        ["Add a task", "Today's tasks", "Summary"]
      );

    case "update_status":
      return handleUpdateStatus(text, conv, context);

    case "delete_task":
      return handleDeleteTask(text, conv, context);

    case "update_progress":
      return handleUpdateProgress(text, conv, context);

    case "move_type":
      return handleMoveType(text, conv, context);

    case "edit_task":
      return handleEditTask(text, conv, context);

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
        "I'm not sure what you mean. You can:\n• Tell me a task to add\n• Ask to start/complete a task\n• Ask about today's schedule\n• Get a summary",
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

// ── Task Management Handlers ────────────────────────────────────────────────

function handleUpdateStatus(text, conv, context) {
  const { tasks } = context;
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  const task = findTaskInText(text, tasks);
  const targetStatus = parseTargetStatus(text);

  if (!task && active.length === 0) {
    return reply(conv, "You don't have any active tasks to update.", ["Add a task", "Summary"]);
  }

  if (!task) {
    // Couldn't identify which task — ask
    conv.state = "collecting";
    conv.pendingField = "status_task_pick";
    conv.draft = { targetStatus };
    const taskNames = active.slice(0, 8).map(t => t.title);
    return reply(conv,
      "Which task do you want to update? Here are your active tasks:",
      taskNames
    );
  }

  if (!targetStatus) {
    // Found the task but don't know the target status
    conv.state = "collecting";
    conv.pendingField = "status_pick";
    conv.draft = { taskId: task.id, taskTitle: task.title };
    return reply(conv,
      `What status should I set **"${task.title}"** to?`,
      ["▶️ In Progress", "✅ Done", "⏸️ Not Started"]
    );
  }

  // We have both task and target status — execute
  const today = new Date().toISOString().split("T")[0];
  let updatedTask = { ...task, status: targetStatus };
  if (targetStatus === "Done") {
    const late = task.deadlineDate && task.deadlineDate < today;
    updatedTask = { ...task, status: late ? "Done Late" : "Done", completedAt: today, progress: 100 };
  } else if (targetStatus === "In Progress") {
    updatedTask = { ...task, status: "In Progress", progress: task.progress || 0 };
  } else if (targetStatus === "Not Started") {
    updatedTask = { ...task, status: "Not Started", progress: 0 };
  }

  return reply(conv,
    `✅ Done! **"${task.title}"** is now **${updatedTask.status}**.`,
    ["Add a task", "Show today's tasks", "Summary"],
    { type: "update_task", task: updatedTask }
  );
}

function handleDeleteTask(text, conv, context) {
  const { tasks } = context;
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  const task = findTaskInText(text, tasks);

  if (!task && active.length === 0) {
    return reply(conv, "You don't have any active tasks to delete.", ["Add a task", "Summary"]);
  }

  if (!task) {
    conv.state = "collecting";
    conv.pendingField = "delete_task_pick";
    conv.draft = {};
    const taskNames = active.slice(0, 8).map(t => t.title);
    return reply(conv,
      "Which task should I delete?",
      taskNames
    );
  }

  // Confirm deletion
  conv.state = "collecting";
  conv.pendingField = "delete_confirm";
  conv.draft = { taskId: task.id, taskTitle: task.title };
  return reply(conv,
    `⚠️ Are you sure you want to delete **"${task.title}"**? This can't be undone.`,
    ["Yes, delete it", "No, keep it"]
  );
}

function handleUpdateProgress(text, conv, context) {
  const { tasks } = context;
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  const task = findTaskInText(text, tasks);
  const progress = parseProgress(text);

  if (!task && active.length === 0) {
    return reply(conv, "You don't have any active tasks to update progress on.", ["Add a task", "Summary"]);
  }

  if (!task) {
    conv.state = "collecting";
    conv.pendingField = "progress_task_pick";
    conv.draft = { progress };
    const taskNames = active.slice(0, 8).map(t => t.title);
    return reply(conv,
      "Which task's progress do you want to update?",
      taskNames
    );
  }

  if (progress === null) {
    conv.state = "collecting";
    conv.pendingField = "progress_value";
    conv.draft = { taskId: task.id, taskTitle: task.title };
    return reply(conv,
      `What percentage should I set **"${task.title}"** progress to?`,
      ["25%", "50%", "75%", "100%"]
    );
  }

  // Execute progress update
  const today = new Date().toISOString().split("T")[0];
  let updatedTask;
  if (progress === 100) {
    const late = task.deadlineDate && task.deadlineDate < today;
    updatedTask = { ...task, progress: 100, status: late ? "Done Late" : "Done", completedAt: today };
  } else {
    updatedTask = { ...task, progress, status: progress > 0 ? "In Progress" : task.status };
  }

  return reply(conv,
    `📈 **"${task.title}"** progress updated to **${progress}%**${progress === 100 ? " — task completed! 🎉" : "."}`,
    ["Add a task", "Show today's tasks", "Summary"],
    { type: "update_task", task: updatedTask }
  );
}

function handleMoveType(text, conv, context) {
  const { tasks } = context;
  const task = findTaskInText(text, tasks);
  const lower = text.toLowerCase();

  if (!task) {
    const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
    if (active.length === 0) return reply(conv, "You don't have any active tasks.", ["Add a task"]);
    conv.state = "collecting";
    conv.pendingField = "movetype_task_pick";
    conv.draft = {};
    return reply(conv, "Which task do you want to change the type of?", active.slice(0, 8).map(t => t.title));
  }

  const newType = /\broutine\b/.test(lower) ? "routine" : "ondemand";
  const updatedTask = { ...task, taskType: newType };
  const label = newType === "routine" ? "🔁 Routine" : "⚡ On Demand";

  return reply(conv,
    `✅ **"${task.title}"** is now **${label}**.`,
    ["Add a task", "Show today's tasks", "Summary"],
    { type: "update_task", task: updatedTask }
  );
}

function handleEditTask(text, conv, context) {
  const { tasks } = context;
  const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  const task = findTaskInText(text, tasks);
  const lower = text.toLowerCase();

  if (!task) {
    if (active.length === 0) return reply(conv, "You don't have any active tasks to edit.", ["Add a task"]);
    conv.state = "collecting";
    conv.pendingField = "edit_task_pick";
    conv.draft = {};
    return reply(conv, "Which task do you want to edit?", active.slice(0, 8).map(t => t.title));
  }

  // Determine what field to edit
  if (/\bpriority\b/.test(lower)) {
    conv.state = "collecting";
    conv.pendingField = "edit_priority";
    conv.draft = { taskId: task.id, taskTitle: task.title, task };
    return reply(conv, `What priority should **"${task.title}"** have?`, ["🔴 Do First", "🟡 Schedule", "🔵 Delegate", "⚪ Drop"]);
  }
  if (/\b(title|name|rename)\b/.test(lower)) {
    conv.state = "collecting";
    conv.pendingField = "edit_title";
    conv.draft = { taskId: task.id, taskTitle: task.title, task };
    return reply(conv, `What should the new title be for **"${task.title}"**?`);
  }
  if (/\bdeadline\b|\bdue\b/.test(lower)) {
    conv.state = "collecting";
    conv.pendingField = "edit_deadline";
    conv.draft = { taskId: task.id, taskTitle: task.title, task };
    return reply(conv, `When should **"${task.title}"** be due?`, ["Tomorrow", "Next Friday", "End of month", "No deadline"]);
  }

  // Generic edit — ask what to change
  conv.state = "collecting";
  conv.pendingField = "edit_field_pick";
  conv.draft = { taskId: task.id, taskTitle: task.title, task };
  return reply(conv, `What do you want to change about **"${task.title}"**?`, ["Title", "Priority", "Deadline", "Status", "Progress"]);
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
    routineStartTime: null,
    routineEndTime: null,
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

  // 3. Routine tasks → ask for start time & end time instead of deadline
  if (draft.taskType === "routine") {
    if (!draft.routineStartTime) {
      conv.pendingField = "routineStartTime";
      return reply(conv,
        prefixMsg + "What time does this routine start? (e.g. *9 AM*, *morning*, *14:30*)",
        ["9:00 AM", "10:00 AM", "Morning", "Noon"]
      );
    }
    if (!draft.routineEndTime) {
      conv.pendingField = "routineEndTime";
      return reply(conv,
        prefixMsg + "What time does it end? (e.g. *10 AM*, *5 PM*, *end of day*)",
        ["10:00 AM", "11:00 AM", "Noon", "5:00 PM", "End of day"]
      );
    }
  }

  // 4. Non-routine tasks → ask for deadline
  if (!draft.deadlineDate && draft.taskType !== "routine") {
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
  const { sections, tasks } = context;
  const field = conv.pendingField;

  // ── Task management fields ──────────────────────────────────────────────

  if (field === "status_task_pick") {
    const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
    const task = findTaskInText(text, tasks) || active.find(t => t.title.toLowerCase() === text.toLowerCase().trim());
    if (!task) return reply(conv, "I couldn't find that task. Please pick from the list:", active.slice(0, 8).map(t => t.title));
    conv.pendingField = "status_pick";
    conv.draft = { ...conv.draft, taskId: task.id, taskTitle: task.title };
    const targetStatus = conv.draft.targetStatus;
    if (targetStatus) {
      // Already know the target — execute
      conv.state = "idle";
      conv.pendingField = null;
      const today = new Date().toISOString().split("T")[0];
      let updatedTask = { ...task, status: targetStatus };
      if (targetStatus === "Done") {
        const late = task.deadlineDate && task.deadlineDate < today;
        updatedTask = { ...task, status: late ? "Done Late" : "Done", completedAt: today, progress: 100 };
      } else if (targetStatus === "In Progress") {
        updatedTask = { ...task, status: "In Progress", progress: task.progress || 0 };
      } else if (targetStatus === "Not Started") {
        updatedTask = { ...task, status: "Not Started", progress: 0 };
      }
      conv.draft = null;
      return reply(conv, `✅ Done! **"${task.title}"** is now **${updatedTask.status}**.`, ["Add a task", "Show today's tasks", "Summary"], { type: "update_task", task: updatedTask });
    }
    return reply(conv, `What status should I set **"${task.title}"** to?`, ["▶️ In Progress", "✅ Done", "⏸️ Not Started"]);
  }

  if (field === "status_pick") {
    const targetStatus = parseTargetStatus(text);
    if (!targetStatus) return reply(conv, "Please pick a status:", ["▶️ In Progress", "✅ Done", "⏸️ Not Started"]);
    const task = tasks.find(t => t.id === conv.draft.taskId);
    if (!task) { conv.state = "idle"; conv.draft = null; conv.pendingField = null; return reply(conv, "Task not found. It may have been deleted.", ["Add a task"]); }
    const today = new Date().toISOString().split("T")[0];
    let updatedTask;
    if (targetStatus === "Done") {
      const late = task.deadlineDate && task.deadlineDate < today;
      updatedTask = { ...task, status: late ? "Done Late" : "Done", completedAt: today, progress: 100 };
    } else if (targetStatus === "In Progress") {
      updatedTask = { ...task, status: "In Progress", progress: task.progress || 0 };
    } else {
      updatedTask = { ...task, status: "Not Started", progress: 0 };
    }
    conv.state = "idle"; conv.draft = null; conv.pendingField = null;
    return reply(conv, `✅ Done! **"${task.title}"** is now **${updatedTask.status}**.`, ["Add a task", "Show today's tasks", "Summary"], { type: "update_task", task: updatedTask });
  }

  if (field === "delete_task_pick") {
    const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
    const task = findTaskInText(text, tasks) || active.find(t => t.title.toLowerCase() === text.toLowerCase().trim());
    if (!task) return reply(conv, "I couldn't find that task. Please pick one:", active.slice(0, 8).map(t => t.title));
    conv.pendingField = "delete_confirm";
    conv.draft = { taskId: task.id, taskTitle: task.title };
    return reply(conv, `⚠️ Are you sure you want to delete **"${task.title}"**?`, ["Yes, delete it", "No, keep it"]);
  }

  if (field === "delete_confirm") {
    const lower = text.toLowerCase();
    if (/\b(yes|yep|yeah|sure|ok|do it|delete|confirm)\b/.test(lower)) {
      const taskId = conv.draft.taskId;
      const title = conv.draft.taskTitle;
      conv.state = "idle"; conv.draft = null; conv.pendingField = null;
      return reply(conv, `🗑️ **"${title}"** has been deleted.`, ["Add a task", "Show today's tasks"], { type: "delete_task", taskId });
    }
    conv.state = "idle"; conv.draft = null; conv.pendingField = null;
    return reply(conv, "OK, keeping the task. What else can I help with?", ["Add a task", "Today's tasks"]);
  }

  if (field === "progress_task_pick") {
    const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
    const task = findTaskInText(text, tasks) || active.find(t => t.title.toLowerCase() === text.toLowerCase().trim());
    if (!task) return reply(conv, "I couldn't find that task. Please pick one:", active.slice(0, 8).map(t => t.title));
    const progress = conv.draft.progress;
    if (progress !== null && progress !== undefined) {
      const today = new Date().toISOString().split("T")[0];
      let updatedTask;
      if (progress === 100) {
        const late = task.deadlineDate && task.deadlineDate < today;
        updatedTask = { ...task, progress: 100, status: late ? "Done Late" : "Done", completedAt: today };
      } else {
        updatedTask = { ...task, progress, status: progress > 0 ? "In Progress" : task.status };
      }
      conv.state = "idle"; conv.draft = null; conv.pendingField = null;
      return reply(conv, `📈 **"${task.title}"** progress set to **${progress}%**${progress === 100 ? " — done! 🎉" : "."}`, ["Add a task", "Summary"], { type: "update_task", task: updatedTask });
    }
    conv.pendingField = "progress_value";
    conv.draft = { taskId: task.id, taskTitle: task.title };
    return reply(conv, `What percentage should I set **"${task.title}"** progress to?`, ["25%", "50%", "75%", "100%"]);
  }

  if (field === "progress_value") {
    const progress = parseProgress(text);
    if (progress === null) return reply(conv, "Please enter a number between 0 and 100:", ["25%", "50%", "75%", "100%"]);
    const task = tasks.find(t => t.id === conv.draft.taskId);
    if (!task) { conv.state = "idle"; conv.draft = null; conv.pendingField = null; return reply(conv, "Task not found.", ["Add a task"]); }
    const today = new Date().toISOString().split("T")[0];
    let updatedTask;
    if (progress === 100) {
      const late = task.deadlineDate && task.deadlineDate < today;
      updatedTask = { ...task, progress: 100, status: late ? "Done Late" : "Done", completedAt: today };
    } else {
      updatedTask = { ...task, progress, status: progress > 0 ? "In Progress" : task.status };
    }
    conv.state = "idle"; conv.draft = null; conv.pendingField = null;
    return reply(conv, `📈 **"${task.title}"** progress set to **${progress}%**${progress === 100 ? " — done! 🎉" : "."}`, ["Add a task", "Summary"], { type: "update_task", task: updatedTask });
  }

  if (field === "movetype_task_pick") {
    const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
    const task = findTaskInText(text, tasks) || active.find(t => t.title.toLowerCase() === text.toLowerCase().trim());
    if (!task) return reply(conv, "I couldn't find that task. Please pick one:", active.slice(0, 8).map(t => t.title));
    const newType = task.taskType === "routine" ? "ondemand" : "routine";
    const updatedTask = { ...task, taskType: newType };
    const label = newType === "routine" ? "🔁 Routine" : "⚡ On Demand";
    conv.state = "idle"; conv.draft = null; conv.pendingField = null;
    return reply(conv, `✅ **"${task.title}"** is now **${label}**.`, ["Add a task", "Summary"], { type: "update_task", task: updatedTask });
  }

  if (field === "edit_task_pick") {
    const active = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
    const task = findTaskInText(text, tasks) || active.find(t => t.title.toLowerCase() === text.toLowerCase().trim());
    if (!task) return reply(conv, "I couldn't find that task. Please pick one:", active.slice(0, 8).map(t => t.title));
    conv.pendingField = "edit_field_pick";
    conv.draft = { taskId: task.id, taskTitle: task.title, task };
    return reply(conv, `What do you want to change about **"${task.title}"**?`, ["Title", "Priority", "Deadline", "Status", "Progress"]);
  }

  if (field === "edit_field_pick") {
    const lower = text.toLowerCase();
    const task = conv.draft.task || tasks.find(t => t.id === conv.draft.taskId);
    if (!task) { conv.state = "idle"; conv.draft = null; conv.pendingField = null; return reply(conv, "Task not found.", ["Add a task"]); }
    if (/\btitle\b|\bname\b/.test(lower)) {
      conv.pendingField = "edit_title";
      return reply(conv, `What should the new title be?`);
    }
    if (/\bpriority\b/.test(lower)) {
      conv.pendingField = "edit_priority";
      return reply(conv, `What priority should it have?`, ["🔴 Do First", "🟡 Schedule", "🔵 Delegate", "⚪ Drop"]);
    }
    if (/\bdeadline\b|\bdue\b/.test(lower)) {
      conv.pendingField = "edit_deadline";
      return reply(conv, `When should it be due?`, ["Tomorrow", "Next Friday", "End of month", "No deadline"]);
    }
    if (/\bstatus\b/.test(lower)) {
      conv.pendingField = "status_pick";
      conv.draft = { taskId: task.id, taskTitle: task.title };
      return reply(conv, `What status?`, ["▶️ In Progress", "✅ Done", "⏸️ Not Started"]);
    }
    if (/\bprogress\b/.test(lower)) {
      conv.pendingField = "progress_value";
      conv.draft = { taskId: task.id, taskTitle: task.title };
      return reply(conv, `What percentage?`, ["25%", "50%", "75%", "100%"]);
    }
    return reply(conv, "Pick what to change:", ["Title", "Priority", "Deadline", "Status", "Progress"]);
  }

  if (field === "edit_title") {
    const task = conv.draft.task || tasks.find(t => t.id === conv.draft.taskId);
    if (!task) { conv.state = "idle"; conv.draft = null; conv.pendingField = null; return reply(conv, "Task not found.", ["Add a task"]); }
    const newTitle = text.trim();
    if (!newTitle) return reply(conv, "Please enter a new title:");
    const updatedTask = { ...task, title: newTitle };
    conv.state = "idle"; conv.draft = null; conv.pendingField = null;
    return reply(conv, `✅ Renamed to **"${newTitle}"**.`, ["Add a task", "Summary"], { type: "update_task", task: updatedTask });
  }

  if (field === "edit_priority") {
    const task = conv.draft.task || tasks.find(t => t.id === conv.draft.taskId);
    if (!task) { conv.state = "idle"; conv.draft = null; conv.pendingField = null; return reply(conv, "Task not found.", ["Add a task"]); }
    const parsed = parsePriority(text);
    const buttonMap = { "do first": "HH", "schedule": "HL", "delegate": "LH", "drop": "LL" };
    const cleaned = text.replace(/[🔴🟡🔵⚪]/g, "").trim().toLowerCase();
    const priority = parsed || buttonMap[cleaned] || null;
    if (!priority) return reply(conv, "Please pick a priority:", ["🔴 Do First", "🟡 Schedule", "🔵 Delegate", "⚪ Drop"]);
    const updatedTask = { ...task, priority };
    const label = { HH: "🔴 Do First", HL: "🟡 Schedule", LH: "🔵 Delegate", LL: "⚪ Drop" }[priority];
    conv.state = "idle"; conv.draft = null; conv.pendingField = null;
    return reply(conv, `✅ **"${task.title}"** priority set to **${label}**.`, ["Add a task", "Summary"], { type: "update_task", task: updatedTask });
  }

  if (field === "edit_deadline") {
    const task = conv.draft.task || tasks.find(t => t.id === conv.draft.taskId);
    if (!task) { conv.state = "idle"; conv.draft = null; conv.pendingField = null; return reply(conv, "Task not found.", ["Add a task"]); }
    const lower = text.toLowerCase().trim();
    if (/\b(no|none|skip|no deadline|remove)\b/.test(lower)) {
      const updatedTask = { ...task, deadlineDate: "" };
      conv.state = "idle"; conv.draft = null; conv.pendingField = null;
      return reply(conv, `✅ Deadline removed from **"${task.title}"**.`, ["Add a task", "Summary"], { type: "update_task", task: updatedTask });
    }
    const date = parseDate(text);
    if (!date) return reply(conv, "I couldn't understand that date. Try *tomorrow*, *next Friday*, *end of month*, or *no deadline*.", ["Tomorrow", "Next Friday", "End of month", "No deadline"]);
    const updatedTask = { ...task, deadlineDate: date };
    conv.state = "idle"; conv.draft = null; conv.pendingField = null;
    return reply(conv, `✅ **"${task.title}"** deadline set to **${date}**.`, ["Add a task", "Summary"], { type: "update_task", task: updatedTask });
  }

  // ── Task creation fields ────────────────────────────────────────────────

  if (field === "title_change") {
    conv.draft.title = text.trim();
    conv.pendingField = null;
    return showConfirmation(conv, context, `Title updated to **"${conv.draft.title}"**.\n\n`);
  }

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

  if (field === "routineStartTime") {
    const time = parseTime(text);
    if (time) {
      conv.draft.routineStartTime = time;
      conv.pendingField = null;
      return askNextField(conv, context, `🕐 Start time: **${time}**\n\n`);
    }
    return reply(conv, "I couldn't understand that time. Try something like *9 AM*, *9:30*, *morning*, or *14:00*.", ["9:00 AM", "10:00 AM", "Morning", "Noon"]);
  }

  if (field === "routineEndTime") {
    const time = parseTime(text);
    if (time) {
      // Validate end > start
      if (conv.draft.routineStartTime && time <= conv.draft.routineStartTime) {
        return reply(conv, `⚠️ End time must be after start time (**${conv.draft.routineStartTime}**). Try again:`, ["10:00 AM", "11:00 AM", "Noon", "5:00 PM"]);
      }
      conv.draft.routineEndTime = time;
      conv.pendingField = null;
      return askNextField(conv, context, `🕐 End time: **${time}**\n\n`);
    }
    return reply(conv, "I couldn't understand that time. Try something like *10 AM*, *5 PM*, *end of day*, or *17:00*.", ["10:00 AM", "Noon", "5:00 PM", "End of day"]);
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
  if (draft.taskType === "routine") {
    msg += `🕐 Start time: ${draft.routineStartTime}\n`;
    msg += `🕐 End time: ${draft.routineEndTime}\n`;
  } else {
    msg += `📅 Start: ${draft.startDate}\n`;
    msg += draft.deadlineDate ? `📅 Deadline: ${draft.deadlineDate}\n` : `📅 Deadline: None\n`;
  }
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
      routineStartTime: draft.routineStartTime || null,
      routineEndTime: draft.routineEndTime || null,
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
    const changeOptions = conv.draft?.taskType === "routine"
      ? ["Title", "Section", "Priority", "Start time", "End time", "Task type"]
      : ["Title", "Section", "Priority", "Deadline", "Task type"];
    return reply(conv, "What would you like to change?", changeOptions);
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
  if (/\bstart time\b/.test(lower)) {
    conv.draft.routineStartTime = null;
    conv.state = "collecting";
    conv.pendingField = "routineStartTime";
    return reply(conv, "What time should it start?", ["9:00 AM", "10:00 AM", "Morning", "Noon"]);
  }
  if (/\bend time\b/.test(lower)) {
    conv.draft.routineEndTime = null;
    conv.state = "collecting";
    conv.pendingField = "routineEndTime";
    return reply(conv, "What time should it end?", ["10:00 AM", "Noon", "5:00 PM", "End of day"]);
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
