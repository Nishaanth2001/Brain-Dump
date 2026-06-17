// ─────────────────────────────────────────────────────────────────────────────
// Smart scheduling algorithm that distributes task completion across days
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_WORK_WINDOWS = [
  { day: "monday",    start: "09:00", end: "12:00", blocked: false },
  { day: "monday",    start: "12:00", end: "13:00", blocked: true, label: "Lunch" },
  { day: "monday",    start: "13:00", end: "17:00", blocked: false },
  { day: "tuesday",   start: "09:00", end: "12:00", blocked: false },
  { day: "tuesday",   start: "12:00", end: "13:00", blocked: true, label: "Lunch" },
  { day: "tuesday",   start: "13:00", end: "17:00", blocked: false },
  { day: "wednesday", start: "09:00", end: "12:00", blocked: false },
  { day: "wednesday", start: "12:00", end: "13:00", blocked: true, label: "Lunch" },
  { day: "wednesday", start: "13:00", end: "17:00", blocked: false },
  { day: "thursday",  start: "09:00", end: "12:00", blocked: false },
  { day: "thursday",  start: "12:00", end: "13:00", blocked: true, label: "Lunch" },
  { day: "thursday",  start: "13:00", end: "17:00", blocked: false },
  { day: "friday",    start: "09:00", end: "12:00", blocked: false },
  { day: "friday",    start: "12:00", end: "13:00", blocked: true, label: "Lunch" },
  { day: "friday",    start: "13:00", end: "17:00", blocked: false },
  { day: "saturday",  start: "10:00", end: "14:00", blocked: false },
  { day: "sunday",    start: "10:00", end: "14:00", blocked: false },
];

/**
 * Calculate available work hours per day based on work windows
 */
export function getAvailableHoursForDay(dayOfWeek, workWindows = DEFAULT_WORK_WINDOWS) {
  const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayOfWeek];
  const windows = workWindows.filter(w => w.day === dayName && !w.blocked);
  
  let totalHours = 0;
  windows.forEach(w => {
    const [startH, startM] = w.start.split(":").map(Number);
    const [endH, endM] = w.end.split(":").map(Number);
    totalHours += (endH + endM / 60) - (startH + startM / 60);
  });
  
  return totalHours;
}

/**
 * Get list of working days between start and deadline
 */
export function getWorkingDays(startDate, deadlineDate, workWindows = DEFAULT_WORK_WINDOWS) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(deadlineDate + "T00:00:00");
  const days = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay();
    const availableHours = getAvailableHoursForDay(dayOfWeek, workWindows);
    
    if (availableHours > 0) {
      days.push({
        date: dateStr,
        dayOfWeek,
        availableHours,
      });
    }
  }
  
  return days;
}

/**
 * Distribute task completion percentage across available days
 * This is the core algorithm that creates the daily schedule
 */
export function distributeTaskAcrossDays(task, workWindows = DEFAULT_WORK_WINDOWS) {
  // If no start date or deadline, can't schedule
  if (!task.startDate || !task.deadlineDate) return [];
  
  const currentProgress = task.progress || 0;
  const remainingProgress = 100 - currentProgress;
  
  // Already completed
  if (remainingProgress <= 0) return [];
  
  const today = new Date().toISOString().split("T")[0];
  const effectiveStart = task.startDate < today ? today : task.startDate;
  
  // Get working days from now until deadline
  const workingDays = getWorkingDays(effectiveStart, task.deadlineDate, workWindows);
  
  if (workingDays.length === 0) return [];
  
  // Calculate total available hours
  const totalHours = workingDays.reduce((sum, day) => sum + day.availableHours, 0);
  
  // Distribute progress proportionally based on available hours each day
  const schedule = workingDays.map(day => {
    const proportion = day.availableHours / totalHours;
    const targetProgress = Math.round(remainingProgress * proportion);
    
    return {
      date: day.date,
      targetProgress,
      availableHours: day.availableHours,
    };
  });
  
  // Adjust for rounding errors - ensure total equals remainingProgress
  const totalScheduled = schedule.reduce((sum, s) => sum + s.targetProgress, 0);
  if (totalScheduled !== remainingProgress && schedule.length > 0) {
    schedule[schedule.length - 1].targetProgress += (remainingProgress - totalScheduled);
  }
  
  return schedule;
}

/**
 * Get all tasks with their daily schedules for calendar view
 */
export function getTasksSchedule(tasks, workWindows = DEFAULT_WORK_WINDOWS) {
  const scheduleMap = {}; // date -> [{ task, targetProgress }]
  
  tasks.forEach(task => {
    // Only schedule tasks that are not completed
    if (task.status === "Done" || task.status === "Done Late") return;
    
    const dailySchedule = distributeTaskAcrossDays(task, workWindows);
    
    dailySchedule.forEach(day => {
      if (!scheduleMap[day.date]) {
        scheduleMap[day.date] = [];
      }
      
      scheduleMap[day.date].push({
        task,
        targetProgress: day.targetProgress,
        availableHours: day.availableHours,
      });
    });
  });
  
  return scheduleMap;
}

/**
 * Check if a task is on track based on today's progress
 */
export function isTaskOnTrack(task, workWindows = DEFAULT_WORK_WINDOWS) {
  if (!task.startDate || !task.deadlineDate) return { onTrack: true, message: "" };
  
  const today = new Date().toISOString().split("T")[0];
  const currentProgress = task.progress || 0;
  
  // Task hasn't started yet
  if (today < task.startDate) return { onTrack: true, message: "Not started yet" };
  
  // Task is past deadline
  if (today > task.deadlineDate) {
    return { 
      onTrack: currentProgress >= 100, 
      message: currentProgress >= 100 ? "Completed" : "Overdue" 
    };
  }
  
  // Calculate expected progress by today
  const workingDays = getWorkingDays(task.startDate, task.deadlineDate, workWindows);
  const daysPassed = workingDays.filter(d => d.date <= today);
  
  if (daysPassed.length === 0) return { onTrack: true, message: "" };
  
  const totalHours = workingDays.reduce((sum, d) => sum + d.availableHours, 0);
  const hoursPassed = daysPassed.reduce((sum, d) => sum + d.availableHours, 0);
  const expectedProgress = Math.round((hoursPassed / totalHours) * 100);
  
  const delta = currentProgress - expectedProgress;
  
  if (delta >= 0) {
    return { onTrack: true, message: `On track (${delta}% ahead)` };
  } else {
    return { onTrack: false, message: `Behind schedule (${Math.abs(delta)}% behind)` };
  }
}

/**
 * Get summary of today's scheduled work
 */
export function getTodaysSummary(tasks, workWindows = DEFAULT_WORK_WINDOWS) {
  const today = new Date().toISOString().split("T")[0];
  const activeTasks = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  
  const schedule = getTasksSchedule(activeTasks, workWindows);
  const todayTasks = schedule[today] || [];
  
  const totalTarget = todayTasks.reduce((sum, s) => sum + s.targetProgress, 0);
  const tasksCount = todayTasks.length;
  
  return {
    tasksCount,
    totalTarget,
    tasks: todayTasks,
  };
}
