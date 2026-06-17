import { PRIORITIES } from "../constants/appConstants";

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
export const todayStr = () => new Date().toISOString().split("T")[0];
export const P        = (key) => PRIORITIES.find((p) => p.key === key) || PRIORITIES[0];
export const isDone   = (t) => t.status === "Done" || t.status === "Done Late";

// Format duration: >60 min shows as hours + minutes
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return "0m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

// Format date for display
export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Calculate days between two dates
export const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
};

// Button label = the NEXT action the user can take
export function getDisplayStatus(t) {
  const today = todayStr();
  if (t.status === "Not Started") {
    if (t.startDate && t.startDate < today)
      return { label: "⚠ Should've Started", color: "#F5A623", bg: "rgba(245,166,35,0.08)", ring: "rgba(245,166,35,0.3)" };
    return { label: "▶ Start", color: "#6B7A8D", bg: "rgba(107,122,141,0.08)", ring: "rgba(107,122,141,0.2)" };
  }
  if (t.status === "In Progress") {
    if (t.deadlineDate && t.deadlineDate < today)
      return { label: "✓ Mark Done (Late)", color: "#E84545", bg: "rgba(232,69,69,0.08)", ring: "rgba(232,69,69,0.3)" };
    return { label: "✓ Mark Done", color: "#F5A623", bg: "rgba(245,166,35,0.08)", ring: "rgba(245,166,35,0.3)" };
  }
  return { label: "▶ Start", color: "#6B7A8D", bg: "rgba(107,122,141,0.08)", ring: "rgba(107,122,141,0.2)" };
}

// Status badge = the CURRENT state shown on the card
export function getStatusBadge(t) {
  const today = todayStr();
  if (t.status === "Not Started") {
    if (t.startDate && t.startDate < today)
      return { text: "Should've Started", color: "#F5A623", bg: "rgba(245,166,35,0.1)" };
    return { text: "Not Started", color: "#6B7A8D", bg: "rgba(107,122,141,0.1)" };
  }
  if (t.status === "In Progress") {
    if (t.deadlineDate && t.deadlineDate < today)
      return { text: "In Progress · Overdue", color: "#E84545", bg: "rgba(232,69,69,0.1)" };
    return { text: "In Progress", color: "#F5A623", bg: "rgba(245,166,35,0.1)" };
  }
  return { text: t.status, color: "#3DD68C", bg: "rgba(61,214,140,0.1)" };
}

export const toSlug = (name) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Guard against names made entirely of special characters (e.g. "!!!"),
  // which would produce an empty string and create an unreachable/duplicate route.
  return slug || "section";
};

