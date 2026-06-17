// ─────────────────────────────────────────────────────────────────────────────
// Smart scheduling algorithm that distributes task completion across days
// ─────────────────────────────────────────────────────────────────────────────

// Default blocked times (applies to all days)
export const DEFAULT_BLOCKED_TIMES = [
  { start: "12:00", end: "13:00", label: "Lunch" },
];

// Default working hours (before blocked times are subtracted)
export const DEFAULT_WORK_START = "09:00"; // 9 AM
export const DEFAULT_WORK_END = "17:00";   // 5 PM

/**
 * Calculate available work hours per day after subtracting blocked times
 */
export function getAvailableHoursForDay(blockedTimes = DEFAULT_BLOCKED_TIMES, workStart = DEFAULT_WORK_START, workEnd = DEFAULT_WORK_END) {
  const [startH, startM] = workStart.split(":").map(Number);
  const [endH, endM] = workEnd.split(":").map(Number);
  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  
  // Subtract blocked times
  blockedTimes.forEach(blocked => {
    const [bStartH, bStartM] = blocked.start.split(":").map(Number);
    const [bEndH, bEndM] = blocked.end.split(":").map(Number);
    const bStart = bStartH * 60 + bStartM;
    const bEnd = bEndH * 60 + bEndM;
    const workStart = startH * 60 + startM;
    const workEnd = endH * 60 + endM;
    
    // Only subtract if blocked time overlaps with work hours
    if (bEnd > workStart && bStart < workEnd) {
      const overlapStart = Math.max(bStart, workStart);
      const overlapEnd = Math.min(bEnd, workEnd);
      totalMinutes -= (overlapEnd - overlapStart);
    }
  });
  
  return totalMinutes / 60; // Convert back to hours
}

/**
 * Get list of working days between start and deadline
 */
export function getWorkingDays(startDate, deadlineDate, blockedTimes = DEFAULT_BLOCKED_TIMES, workStart = DEFAULT_WORK_START, workEnd = DEFAULT_WORK_END) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(deadlineDate + "T00:00:00");
  const days = [];
  const availableHours = getAvailableHoursForDay(blockedTimes, workStart, workEnd);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay();
    
    // Exclude weekends if desired (optional)
    // if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
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
export function distributeTaskAcrossDays(task, blockedTimes = DEFAULT_BLOCKED_TIMES, workStart = DEFAULT_WORK_START, workEnd = DEFAULT_WORK_END) {
  // If no start date or deadline, can't schedule
  if (!task.startDate || !task.deadlineDate) return [];
  
  const currentProgress = task.progress || 0;
  const remainingProgress = 100 - currentProgress;
  
  // Already completed
  if (remainingProgress <= 0) return [];
  
  const today = new Date().toISOString().split("T")[0];
  const effectiveStart = task.startDate < today ? today : task.startDate;
  
  // Get working days from now until deadline
  const workingDays = getWorkingDays(effectiveStart, task.deadlineDate, blockedTimes, workStart, workEnd);
  
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
export function getTasksSchedule(tasks, blockedTimes = DEFAULT_BLOCKED_TIMES, workStart = DEFAULT_WORK_START, workEnd = DEFAULT_WORK_END) {
  const scheduleMap = {}; // date -> [{ task, targetProgress }]
  
  tasks.forEach(task => {
    // Only schedule tasks that are not completed
    if (task.status === "Done" || task.status === "Done Late") return;
    
    const dailySchedule = distributeTaskAcrossDays(task, blockedTimes, workStart, workEnd);
    
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
export function isTaskOnTrack(task, blockedTimes = DEFAULT_BLOCKED_TIMES, workStart = DEFAULT_WORK_START, workEnd = DEFAULT_WORK_END) {
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
  const workingDays = getWorkingDays(task.startDate, task.deadlineDate, blockedTimes, workStart, workEnd);
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
export function getTodaysSummary(tasks, blockedTimes = DEFAULT_BLOCKED_TIMES, workStart = DEFAULT_WORK_START, workEnd = DEFAULT_WORK_END) {
  const today = new Date().toISOString().split("T")[0];
  const activeTasks = tasks.filter(t => t.status !== "Done" && t.status !== "Done Late");
  
  const schedule = getTasksSchedule(activeTasks, blockedTimes, workStart, workEnd);
  const todayTasks = schedule[today] || [];
  
  const totalTarget = todayTasks.reduce((sum, s) => sum + s.targetProgress, 0);
  const tasksCount = todayTasks.length;
  
  return {
    tasksCount,
    totalTarget,
    tasks: todayTasks,
  };
}

/**
 * Get available time windows for a specific date (work hours minus blocked times)
 */
export function getWorkWindowsForDate(dateStr, blockedTimes = DEFAULT_BLOCKED_TIMES, workStart = DEFAULT_WORK_START, workEnd = DEFAULT_WORK_END) {
  // Start with configured work day
  const [startH, startM] = workStart.split(":").map(Number);
  const [endH, endM] = workEnd.split(":").map(Number);
  
  const windows = [];
  let currentStart = startH * 60 + startM;
  const dayEnd = endH * 60 + endM;
  
  // Sort blocked times by start time
  const sortedBlocked = [...blockedTimes].sort((a, b) => {
    const aMin = timeToMinutes(a.start);
    const bMin = timeToMinutes(b.start);
    return aMin - bMin;
  });
  
  // Create windows by splitting around blocked times
  sortedBlocked.forEach(blocked => {
    const blockStart = timeToMinutes(blocked.start);
    const blockEnd = timeToMinutes(blocked.end);
    
    // Add work window before blocked time
    if (currentStart < blockStart && currentStart < dayEnd) {
      const windowEnd = Math.min(blockStart, dayEnd);
      windows.push({
        start: minutesToTime(currentStart),
        end: minutesToTime(windowEnd),
        startMinutes: currentStart,
        endMinutes: windowEnd,
        blocked: false
      });
    }
    
    // Add blocked window
    if (blockStart < dayEnd && blockEnd > currentStart) {
      const adjustedStart = Math.max(blockStart, currentStart);
      const adjustedEnd = Math.min(blockEnd, dayEnd);
      windows.push({
        start: minutesToTime(adjustedStart),
        end: minutesToTime(adjustedEnd),
        startMinutes: adjustedStart,
        endMinutes: adjustedEnd,
        blocked: true,
        label: blocked.label
      });
    }
    
    currentStart = Math.max(currentStart, blockEnd);
  });
  
  // Add final work window after last blocked time
  if (currentStart < dayEnd) {
    windows.push({
      start: minutesToTime(currentStart),
      end: minutesToTime(dayEnd),
      startMinutes: currentStart,
      endMinutes: dayEnd,
      blocked: false
    });
  }
  
  return windows;
}

/**
 * Convert time string to minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Gap between consecutive tasks (in minutes)
export const TASK_GAP_MINUTES = 10;

/**
 * Allocate tasks to specific time slots within the work windows for a given day
 * Respects manually pinned start times (task.scheduledStartTime)
 */
export function allocateTasksToTimeSlots(tasksForDay, dateStr, blockedTimes = DEFAULT_BLOCKED_TIMES, workStart = DEFAULT_WORK_START, workEnd = DEFAULT_WORK_END) {
  const dayWindows = getWorkWindowsForDate(dateStr, blockedTimes, workStart, workEnd);
  const availableWindows = dayWindows.filter(w => !w.blocked);
  
  if (availableWindows.length === 0) return [];
  
  // Calculate total available minutes
  const totalAvailableMinutes = availableWindows.reduce((sum, w) => 
    sum + (w.endMinutes - w.startMinutes), 0
  );

  // Separate pinned tasks (have a manual start time) from flexible tasks
  const todayDateStr = new Date().toISOString().split("T")[0];
  const pinnedTasks = [];
  const flexibleTasks = [];

  tasksForDay.forEach(item => {
    const task = item.task;
    const pinned = task.scheduledStartTime;
    const scope = task.scheduledStartScope || "always";
    
    // Only use pinned time if scope is "always" OR scope is "today" and it IS today
    if (pinned && (scope === "always" || (scope === "today" && dateStr === todayDateStr))) {
      pinnedTasks.push({ ...item, pinnedMinute: timeToMinutes(pinned) });
    } else {
      flexibleTasks.push(item);
    }
  });

  // Sort pinned tasks by their start time
  pinnedTasks.sort((a, b) => a.pinnedMinute - b.pinnedMinute);

  const allocations = [];

  // First, allocate pinned tasks
  pinnedTasks.forEach(({ task, targetProgress, pinnedMinute }) => {
    const taskMinutes = Math.round((targetProgress / 100) * totalAvailableMinutes);
    if (taskMinutes <= 0) return;

    allocations.push({
      task,
      targetProgress,
      startTime: minutesToTime(pinnedMinute),
      endTime: minutesToTime(pinnedMinute + taskMinutes),
      startMinutes: pinnedMinute,
      endMinutes: pinnedMinute + taskMinutes,
      durationMinutes: taskMinutes,
      pinned: true,
    });
  });

  // Sort allocations by start time for gap calculation
  allocations.sort((a, b) => a.startMinutes - b.startMinutes);

  // Now allocate flexible tasks around pinned ones
  let currentWindowIndex = 0;
  let currentMinuteInWindow = availableWindows[0]?.startMinutes || 0;
  
  flexibleTasks.forEach(({ task, targetProgress }, idx) => {
    const taskMinutes = Math.round((targetProgress / 100) * totalAvailableMinutes);
    let remainingMinutes = taskMinutes;
    
    while (remainingMinutes > 0 && currentWindowIndex < availableWindows.length) {
      const window = availableWindows[currentWindowIndex];
      const windowEndMinute = window.endMinutes;
      const availableInWindow = windowEndMinute - currentMinuteInWindow;
      
      if (availableInWindow <= 0) {
        currentWindowIndex++;
        if (currentWindowIndex < availableWindows.length) {
          currentMinuteInWindow = availableWindows[currentWindowIndex].startMinutes;
        }
        continue;
      }

      // Check if current position overlaps with any pinned task
      const overlappingPinned = allocations.find(a => 
        a.pinned && currentMinuteInWindow < a.endMinutes && (currentMinuteInWindow + remainingMinutes) > a.startMinutes
      );

      if (overlappingPinned) {
        // Skip past the pinned task + gap
        currentMinuteInWindow = overlappingPinned.endMinutes + TASK_GAP_MINUTES;
        continue;
      }
      
      const minutesToUse = Math.min(remainingMinutes, availableInWindow);
      
      allocations.push({
        task,
        targetProgress,
        startTime: minutesToTime(currentMinuteInWindow),
        endTime: minutesToTime(currentMinuteInWindow + minutesToUse),
        startMinutes: currentMinuteInWindow,
        endMinutes: currentMinuteInWindow + minutesToUse,
        durationMinutes: minutesToUse,
        pinned: false,
      });
      
      currentMinuteInWindow += minutesToUse + TASK_GAP_MINUTES; // Add gap after each task
      remainingMinutes -= minutesToUse;
    }
  });

  // Sort final allocations by start time
  allocations.sort((a, b) => a.startMinutes - b.startMinutes);
  
  return allocations;
}
