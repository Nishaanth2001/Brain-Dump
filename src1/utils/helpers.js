import { PRIORITIES } from "../constants/appConstants";

export const uid      = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
export const todayStr = () => new Date().toISOString().split("T")[0];
export const P        = key => PRIORITIES.find(p => p.key === key) || PRIORITIES[0];
export const isDone   = t => t.status === "Done" || t.status === "Done Late";


// Button label = the NEXT action the user can take
export function getDisplayStatus(t) {
  const today = todayStr();
  if (t.status === "Not Started") {
    if (t.startDate && t.startDate < today)
      return { label:"⚠ Should've Started", color:"#F5A623", bg:"rgba(245,166,35,0.08)", ring:"rgba(245,166,35,0.3)" };
    return { label:"▶ Start", color:"#6B7A8D", bg:"rgba(107,122,141,0.08)", ring:"rgba(107,122,141,0.2)" };
  }
  if (t.status === "In Progress") {
    if (t.deadlineDate && t.deadlineDate < today)
      return { label:"✓ Mark Done (Late)", color:"#E84545", bg:"rgba(232,69,69,0.08)", ring:"rgba(232,69,69,0.3)" };
    return { label:"✓ Mark Done", color:"#F5A623", bg:"rgba(245,166,35,0.08)", ring:"rgba(245,166,35,0.3)" };
  }
  return { label:"▶ Start", color:"#6B7A8D", bg:"rgba(107,122,141,0.08)", ring:"rgba(107,122,141,0.2)" };
}

// Status badge = the CURRENT state shown on the card
export function getStatusBadge(t) {
  const today = todayStr();
  if (t.status === "Not Started") {
    if (t.startDate && t.startDate < today)
      return { text:"Should've Started", color:"#F5A623", bg:"rgba(245,166,35,0.1)" };
    return { text:"Not Started", color:"#6B7A8D", bg:"rgba(107,122,141,0.1)" };
  }
  if (t.status === "In Progress") {
    if (t.deadlineDate && t.deadlineDate < today)
      return { text:"In Progress · Overdue", color:"#E84545", bg:"rgba(232,69,69,0.1)" };
    return { text:"In Progress", color:"#F5A623", bg:"rgba(245,166,35,0.1)" };
  }
  return { text: t.status, color:"#3DD68C", bg:"rgba(61,214,140,0.1)" };
}
