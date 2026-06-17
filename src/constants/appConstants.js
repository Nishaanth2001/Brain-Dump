export const FILE_NAME = "flow-tasks.json";

export const PRIORITIES = [
  { key: "HH", label: "Do First", color: "#E84545", dim: "rgba(232,69,69,0.1)"  },
  { key: "HL", label: "Schedule", color: "#F5A623", dim: "rgba(245,166,35,0.1)" },
  { key: "LH", label: "Delegate", color: "#4A9EE8", dim: "rgba(74,158,232,0.1)" },
  { key: "LL", label: "Drop",     color: "#555E6E", dim: "rgba(85,94,110,0.1)"  },
];

export const PRIORITY_ORDER = { HH: 0, HL: 1, LH: 2, LL: 3 };

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DOWS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const RECURRING_FREQUENCIES = [
  { key: "daily", label: "Daily", icon: "📅" },
  { key: "weekly", label: "Weekly", icon: "📆" },
  { key: "biweekly", label: "Bi-weekly", icon: "🗓️" },
  { key: "monthly", label: "Monthly", icon: "🗓️" },
];
