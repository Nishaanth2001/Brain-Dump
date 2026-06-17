import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MONTHS, DOWS } from "../constants/appConstants";
import { P, todayStr, isDone, toSlug } from "../utils/helpers";
import { getTasksSchedule, isTaskOnTrack, distributeTaskAcrossDays, getWorkWindowsForDate, allocateTasksToTimeSlots } from "../utils/scheduleHelpers";
import { useTheme } from "../contexts/ThemeContext";

function CalendarPage({ tasks, sections, onProgress, blockedTimes, workHours }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("week"); // 'month' or 'week'
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(now.setDate(diff));
  });
  const today = todayStr();

  // Get schedule for all non-routine tasks (routine tasks don't need time-based scheduling)
  const schedule = useMemo(() => 
    getTasksSchedule(
      tasks.filter(t => !isDone(t) && t.taskType !== "routine"), 
      blockedTimes, 
      workHours.start, 
      workHours.end
    ),
    [tasks, blockedTimes, workHours.start, workHours.end]
  );

  // Calendar grid calculations
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const totalCells = firstDay + daysInMonth;
  const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Get tasks for selected date
  const selectedTasks = selectedDate ? (schedule[selectedDate] || []) : [];
  
  // Get work windows and task allocations for selected date
  const dayWindows = useMemo(() => 
    selectedDate ? getWorkWindowsForDate(selectedDate, blockedTimes, workHours.start, workHours.end) : [],
    [selectedDate, blockedTimes, workHours.start, workHours.end]
  );
  
  const taskAllocations = useMemo(() => 
    selectedDate ? allocateTasksToTimeSlots(selectedTasks, selectedDate, blockedTimes, workHours.start, workHours.end) : [],
    [selectedDate, selectedTasks, blockedTimes, workHours.start, workHours.end]
  );

  // Calculate daily workload (total percentage to complete)
  const dailyWorkload = useMemo(() => {
    const workload = {};
    Object.keys(schedule).forEach(date => {
      workload[date] = schedule[date].reduce((sum, s) => sum + s.targetProgress, 0);
    });
    return workload;
  }, [schedule]);

  const navBtn = {
    background: "none", border: "none", color: theme.textMuted,
    fontSize: 18, cursor: "pointer", padding: "2px 8px",
    borderRadius: 6, transition: "all 0.15s"
  };

  // Week navigation
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const prevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const nextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const goToToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setWeekStart(new Date(now.setDate(diff)));
    setMonth(new Date().getMonth());
    setYear(new Date().getFullYear());
  };

  const weekDays = getWeekDays();
  const weekRange = `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()}–${weekDays[6].getDate()}, ${weekDays[0].getFullYear()}`;

  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const label = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
    return { hour, label, startMinutes: hour * 60, endMinutes: (hour + 1) * 60 };
  });

  return (
    <div style={{ 
      minHeight: "100vh",
      background: theme.mode === "dark" 
        ? "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)"
        : "linear-gradient(135deg, #f5f7fa 0%, #e8ecf3 50%, #dde4ed 100%)",
      padding: "32px 24px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: "absolute",
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        background: theme.mode === "dark"
          ? "radial-gradient(circle, rgba(232,69,69,0.15) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(232,69,69,0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        bottom: -150,
        left: -150,
        width: 500,
        height: 500,
        background: theme.mode === "dark"
          ? "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        pointerEvents: "none"
      }} />

      <div style={{ maxWidth: 1600, margin: "0 auto", position: "relative", zIndex: 1 }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        marginBottom: 32, 
        flexWrap: "wrap", 
        gap: 16,
        background: theme.mode === "dark" 
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.7)",
        backdropFilter: "blur(20px)",
        borderRadius: 20,
        padding: "20px 28px",
        border: theme.mode === "dark"
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(255,255,255,0.6)",
        boxShadow: theme.mode === "dark"
          ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button
            onClick={goToToday}
            style={{
              background: "linear-gradient(135deg, #e84545 0%, #d63939 100%)",
              border: "none",
              borderRadius: 12,
              padding: "10px 20px",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontWeight: 700,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 4px 16px rgba(232,69,69,0.3)",
              letterSpacing: "0.3px"
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 24px rgba(232,69,69,0.45)";
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(232,69,69,0.3)";
            }}
          >
            ⚡ Today
          </button>
          
          {viewMode === "week" && (
            <>
              <button onClick={prevWeek} style={{
                background: "none",
                border: "none",
                color: theme.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                fontSize: 24,
                cursor: "pointer",
                padding: "4px 12px",
                borderRadius: 10,
                transition: "all 0.3s",
                display: "flex",
                alignItems: "center"
              }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.color = theme.red;
                  e.currentTarget.style.background = theme.mode === "dark" ? "rgba(232,69,69,0.1)" : "rgba(232,69,69,0.08)";
                  e.currentTarget.style.transform = "translateX(-2px)";
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.color = theme.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >←</button>
              <button onClick={nextWeek} style={{
                background: "none",
                border: "none",
                color: theme.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                fontSize: 24,
                cursor: "pointer",
                padding: "4px 12px",
                borderRadius: 10,
                transition: "all 0.3s",
                display: "flex",
                alignItems: "center"
              }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.color = theme.red;
                  e.currentTarget.style.background = theme.mode === "dark" ? "rgba(232,69,69,0.1)" : "rgba(232,69,69,0.08)";
                  e.currentTarget.style.transform = "translateX(2px)";
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.color = theme.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >→</button>
              <div style={{ 
                fontFamily: "'DM Serif Display',serif", 
                fontSize: 24, 
                fontWeight: 600,
                background: "linear-gradient(135deg, #e84545 0%, #6366f1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.5px"
              }}>
                {weekRange}
              </div>
            </>
          )}
          
          {viewMode === "month" && (
            <>
              <button onClick={prev} style={{
                background: "none",
                border: "none",
                color: theme.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                fontSize: 24,
                cursor: "pointer",
                padding: "4px 12px",
                borderRadius: 10,
                transition: "all 0.3s"
              }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.color = theme.red;
                  e.currentTarget.style.background = theme.mode === "dark" ? "rgba(232,69,69,0.1)" : "rgba(232,69,69,0.08)";
                  e.currentTarget.style.transform = "translateX(-2px)";
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.color = theme.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >←</button>
              <button onClick={next} style={{
                background: "none",
                border: "none",
                color: theme.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                fontSize: 24,
                cursor: "pointer",
                padding: "4px 12px",
                borderRadius: 10,
                transition: "all 0.3s"
              }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.color = theme.red;
                  e.currentTarget.style.background = theme.mode === "dark" ? "rgba(232,69,69,0.1)" : "rgba(232,69,69,0.08)";
                  e.currentTarget.style.transform = "translateX(2px)";
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.color = theme.mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >→</button>
              <div style={{ 
                fontFamily: "'DM Serif Display',serif", 
                fontSize: 24, 
                fontWeight: 600,
                background: "linear-gradient(135deg, #e84545 0%, #6366f1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.5px"
              }}>
                {MONTHS[month]} {year}
              </div>
            </>
          )}
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* View Mode Toggle */}
          <div style={{ 
            display: "flex", 
            gap: 6, 
            background: theme.mode === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)",
            borderRadius: 14, 
            padding: 6,
            border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.08)"
          }}>
            <button
              onClick={() => setViewMode("week")}
              style={{
                background: viewMode === "week" 
                  ? "linear-gradient(135deg, #e84545 0%, #d63939 100%)"
                  : "transparent",
                border: "none",
                borderRadius: 10,
                padding: "8px 18px",
                color: viewMode === "week" ? "#fff" : theme.mode === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 700,
                transition: "all 0.3s",
                boxShadow: viewMode === "week" ? "0 4px 12px rgba(232,69,69,0.3)" : "none",
                letterSpacing: "0.3px"
              }}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("month")}
              style={{
                background: viewMode === "month" 
                  ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                  : "transparent",
                border: "none",
                borderRadius: 10,
                padding: "8px 18px",
                color: viewMode === "month" ? "#fff" : theme.mode === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 700,
                transition: "all 0.3s",
                boxShadow: viewMode === "month" ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
                letterSpacing: "0.3px"
              }}
            >
              Month
            </button>
          </div>
          
          <button
            onClick={() => navigate("/")}
            style={{
              background: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
              border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              padding: "10px 20px",
              color: theme.mode === "dark" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontWeight: 600,
              transition: "all 0.3s",
              letterSpacing: "0.3px"
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.background = theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,1)";
              e.currentTarget.style.color = theme.red;
              e.currentTarget.style.borderColor = theme.red;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.background = theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)";
              e.currentTarget.style.color = theme.mode === "dark" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";
              e.currentTarget.style.borderColor = theme.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Week View */}
      {viewMode === "week" && (
        <div style={{
          background: theme.mode === "dark" 
            ? "rgba(255,255,255,0.02)"
            : "rgba(255,255,255,0.6)",
          backdropFilter: "blur(20px)",
          border: theme.mode === "dark"
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(255,255,255,0.8)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: theme.mode === "dark"
            ? "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "0 20px 60px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,1)"
        }}>
          {/* Week header with days */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "70px repeat(7, 1fr)", 
            borderBottom: theme.mode === "dark" 
              ? "1px solid rgba(255,255,255,0.06)"
              : "1px solid rgba(0,0,0,0.06)",
            background: theme.mode === "dark"
              ? "linear-gradient(135deg, rgba(232,69,69,0.05) 0%, rgba(99,102,241,0.05) 100%)"
              : "linear-gradient(135deg, rgba(232,69,69,0.03) 0%, rgba(99,102,241,0.03) 100%)"
          }}>
            <div style={{ padding: "16px 12px", fontSize: 11, color: theme.textMuted, fontWeight: 700 }}></div>
            {weekDays.map((day, idx) => {
              const dateStr = day.toISOString().split("T")[0];
              const isToday = dateStr === today;
              const dayTasks = schedule[dateStr] || [];
              
              return (
                <div key={idx} style={{
                  padding: "16px 12px",
                  textAlign: "center",
                  borderLeft: theme.mode === "dark" 
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid rgba(0,0,0,0.06)",
                  background: isToday 
                    ? theme.mode === "dark"
                      ? "linear-gradient(180deg, rgba(232,69,69,0.15) 0%, rgba(232,69,69,0.05) 100%)"
                      : "linear-gradient(180deg, rgba(232,69,69,0.12) 0%, rgba(232,69,69,0.04) 100%)"
                    : "transparent",
                  position: "relative",
                  transition: "all 0.3s"
                }}>
                  {isToday && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: "linear-gradient(90deg, #e84545 0%, #d63939 100%)",
                      boxShadow: "0 2px 8px rgba(232,69,69,0.4)"
                    }} />
                  )}
                  <div style={{
                    fontSize: 10,
                    color: theme.mode === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                    fontWeight: 700,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                  }}>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx]}
                  </div>
                  <div style={{
                    fontSize: 22,
                    color: isToday ? "#e84545" : theme.text,
                    fontWeight: 700,
                    marginBottom: 4
                  }}>
                    {day.getDate()}
                  </div>
                  {dayTasks.length > 0 && (
                    <div style={{
                      fontSize: 9,
                      color: theme.mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                      fontWeight: 600,
                      background: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                      padding: "3px 8px",
                      borderRadius: 8,
                      display: "inline-block"
                    }}>
                      {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time slots grid */}
          <div style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}>
            {timeSlots.map((slot) => (
              <div key={slot.hour} style={{
                display: "grid",
                gridTemplateColumns: "70px repeat(7, 1fr)",
                minHeight: 70,
                borderBottom: theme.mode === "dark" 
                  ? "1px solid rgba(255,255,255,0.04)"
                  : "1px solid rgba(0,0,0,0.04)",
                transition: "background 0.3s"
              }}>
                {/* Time label */}
                <div style={{
                  padding: "12px",
                  fontSize: 11,
                  color: theme.mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                  fontWeight: 700,
                  textAlign: "right",
                  paddingRight: 16,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  letterSpacing: "0.5px"
                }}>
                  {slot.label}
                </div>

                {/* Day columns */}
                {weekDays.map((day, dayIdx) => {
                  const dateStr = day.toISOString().split("T")[0];
                  const daySchedule = schedule[dateStr] || [];
                  const dayAllocations = allocateTasksToTimeSlots(daySchedule, dateStr, blockedTimes, workHours.start, workHours.end);
                  
                  // Find tasks in this time slot
                  const slotTasks = dayAllocations.filter(alloc => {
                    const allocHour = Math.floor(alloc.startMinutes / 60);
                    return allocHour === slot.hour;
                  });

                  const isToday = dateStr === today;

                  return (
                    <div
                      key={dayIdx}
                      style={{
                        borderLeft: theme.mode === "dark" 
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "1px solid rgba(0,0,0,0.04)",
                        padding: 6,
                        background: isToday 
                          ? theme.mode === "dark" 
                            ? "rgba(232,69,69,0.02)" 
                            : "rgba(232,69,69,0.015)"
                          : "transparent",
                        position: "relative",
                        minHeight: 70
                      }}
                    >
                      {slotTasks.map((alloc, idx) => {
                        const pr = P(alloc.task.priority);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              const section = sections.find(s => s.id === alloc.task.sectionId);
                              if (section) navigate(`/${section.slug || toSlug(section.name)}`);
                            }}
                            style={{
                              background: `linear-gradient(135deg, ${pr.color}25, ${pr.color}12)`,
                              border: `2px solid ${pr.color}`,
                              borderRadius: 10,
                              padding: "8px 10px",
                              marginBottom: 4,
                              cursor: "pointer",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              fontSize: 11,
                              boxShadow: `0 4px 12px ${pr.color}20`,
                              backdropFilter: "blur(10px)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `linear-gradient(135deg, ${pr.color}35, ${pr.color}20)`;
                              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                              e.currentTarget.style.boxShadow = `0 8px 20px ${pr.color}35`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = `linear-gradient(135deg, ${pr.color}25, ${pr.color}12)`;
                              e.currentTarget.style.transform = "translateY(0) scale(1)";
                              e.currentTarget.style.boxShadow = `0 4px 12px ${pr.color}20`;
                            }}
                          >
                            <div style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              gap: 6, marginBottom: 4
                            }}>
                              <div style={{
                                fontWeight: 700,
                                color: theme.text,
                                fontSize: 11,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                                letterSpacing: "0.2px"
                              }}>
                                {alloc.task.title}
                              </div>
                              <span style={{
                                background: pr.color,
                                color: "#fff",
                                padding: "2px 7px",
                                borderRadius: 6,
                                fontSize: 9,
                                fontWeight: 800,
                                flexShrink: 0,
                                boxShadow: `0 2px 8px ${pr.color}40`,
                                letterSpacing: "0.3px"
                              }}>
                                {alloc.targetProgress}%
                              </span>
                            </div>
                            <div style={{
                              fontSize: 9,
                              color: pr.color,
                              fontWeight: 700,
                              letterSpacing: "0.3px"
                            }}>
                              {alloc.startTime} • {alloc.durationMinutes}m
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === "month" && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            background: theme.bgCard, border: `1px solid ${theme.border}`,
            borderRadius: 16, padding: 24, transition: "background 0.3s ease"
          }}>

          {/* Calendar Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
            {/* Day headers */}
            {DOWS.map(d => (
              <div key={d} style={{
                textAlign: "center", fontSize: 10, color: theme.textMuted,
                fontWeight: 700, padding: "8px 0", letterSpacing: "0.06em"
              }}>{d}</div>
            ))}

            {/* Previous month days */}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={"p" + i} style={{
                textAlign: "center", padding: "8px 4px", fontSize: 12,
                color: theme.textFaint, minHeight: 80, borderRadius: 8
              }}>
                <span>{daysInPrev - firstDay + 1 + i}</span>
              </div>
            ))}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const dayTasks = schedule[dateStr] || [];
              const workload = dailyWorkload[dateStr] || 0;
              const isToday = dateStr === today;
              const isSel = dateStr === selectedDate;
              const hasTasks = dayTasks.length > 0;

              return (
                <div
                  key={d}
                  onClick={() => setSelectedDate(isSel ? null : dateStr)}
                  style={{
                    textAlign: "center", padding: "8px 4px", borderRadius: 8,
                    minHeight: 80, display: "flex", flexDirection: "column",
                    cursor: hasTasks ? "pointer" : "default",
                    color: isSel ? "#fff" : isToday ? theme.red : hasTasks ? theme.text : theme.textDim,
                    background: isSel ? theme.red : isToday ? theme.redDim : "transparent",
                    fontWeight: isToday ? 700 : 400, transition: "all 0.15s",
                    border: `1px solid ${isSel ? theme.red : isToday ? theme.redBorder : "transparent"}`,
                  }}
                  onMouseEnter={(e) => { if (hasTasks && !isSel) e.currentTarget.style.background = theme.bgHover; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = isToday ? theme.redDim : "transparent"; }}
                >
                  <span style={{ fontSize: 13, marginBottom: 4 }}>{d}</span>
                  {hasTasks && (
                    <>
                      <div style={{
                        fontSize: 9, fontWeight: 700, marginBottom: 2,
                        color: isSel || isToday ? "rgba(255,255,255,0.8)" : theme.textMuted
                      }}>
                        {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                      </div>
                      {/* Workload indicator */}
                      <div style={{
                        background: isSel || isToday ? "rgba(255,255,255,0.2)" : theme.bgInput,
                        borderRadius: 4, padding: "2px 6px", fontSize: 9,
                        fontWeight: 700, marginTop: "auto",
                        color: isSel || isToday ? "#fff" : workload > 100 ? theme.red : theme.orange
                      }}>
                        {workload}%
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Next month days */}
            {Array.from({ length: trailing }, (_, i) => (
              <div key={"n" + i} style={{
                textAlign: "center", padding: "8px 4px", fontSize: 12,
                color: theme.textFaint, minHeight: 80, borderRadius: 8
              }}>
                <span>{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* Day View - Full Width Below Calendar (only in month view) */}
      {viewMode === "month" && selectedDate && (
        <div style={{
          background: theme.bgCard, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: 32, transition: "background 0.3s ease",
          marginTop: 24
        }}>
          <div style={{
            fontSize: 13, color: theme.textMuted, fontWeight: 700,
            marginBottom: 20, letterSpacing: "0.07em", textTransform: "uppercase",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <span>
              📅 {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              style={{
                background: "none", border: `1px solid ${theme.border}`,
                borderRadius: 8, padding: "6px 12px", color: theme.textMuted,
                fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                fontWeight: 600, transition: "all 0.15s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.red; e.currentTarget.style.color = theme.red; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
            >
              ✕ Close
            </button>
          </div>

          {selectedTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: theme.textMuted, fontSize: 14 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🗓️</div>
              No tasks scheduled for this day
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32 }}>
              {/* Timeline View - Left Side */}
              <div>
                <div style={{
                  background: theme.bgInput, borderRadius: 8, padding: "12px 16px",
                  marginBottom: 20, display: "flex", justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ color: theme.textMuted, fontSize: 13, fontWeight: 600 }}>Daily Target</span>
                  <span style={{
                    color: dailyWorkload[selectedDate] > 100 ? theme.red : theme.orange,
                    fontSize: 18, fontWeight: 700
                  }}>
                    {dailyWorkload[selectedDate]}%
                  </span>
                </div>

                <div style={{
                  fontSize: 12,
                  color: theme.text,
                  fontWeight: 700,
                  marginBottom: 16,
                  letterSpacing: "0.05em"
                }}>
                  ⏰ DAILY TIMELINE
                </div>

                {dayWindows.map((window, idx) => {
                  // Get tasks allocated to this window
                  const windowTasks = taskAllocations.filter(alloc =>
                    alloc.startMinutes >= window.startMinutes &&
                    alloc.startMinutes < window.endMinutes
                  );

                  return (
                    <div key={idx} style={{
                      marginBottom: 16
                    }}>
                      {/* Time label */}
                      <div style={{
                        fontSize: 11,
                        color: theme.text,
                        fontWeight: 700,
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                      }}>
                        <span>{window.start} - {window.end}</span>
                        <span style={{ color: theme.textDim, fontSize: 10, fontWeight: 500 }}>
                          ({window.endMinutes - window.startMinutes} min)
                        </span>
                        {window.blocked && (
                          <span style={{
                            background: theme.redDim,
                            color: theme.red,
                            padding: "3px 10px",
                            borderRadius: 5,
                            fontSize: 9,
                            fontWeight: 700
                          }}>
                            🚫 {window.label || "BLOCKED"}
                          </span>
                        )}
                      </div>

                      {/* Window block - using flex layout to stack tasks vertically */}
                      <div style={{
                        background: window.blocked
                          ? "repeating-linear-gradient(45deg, rgba(232,69,69,0.05), rgba(232,69,69,0.05) 10px, rgba(232,69,69,0.1) 10px, rgba(232,69,69,0.1) 20px)"
                          : theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                        border: `1px solid ${window.blocked ? theme.redBorder : theme.border}`,
                        borderRadius: 10,
                        minHeight: 60,
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12
                      }}>
                        {!window.blocked && windowTasks.length === 0 && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 48,
                            color: theme.textDim,
                            fontSize: 12,
                            fontStyle: "italic"
                          }}>
                            Free time
                          </div>
                        )}

                        {!window.blocked && windowTasks.map((alloc, taskIdx) => {
                          const pr = P(alloc.task.priority);

                          return (
                            <div
                              key={taskIdx}
                              style={{
                                minHeight: 80,
                                background: `linear-gradient(135deg, ${pr.color}15, ${pr.color}08)`,
                                border: `2px solid ${pr.color}`,
                                borderRadius: 8,
                                padding: "12px 14px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                boxShadow: `0 2px 8px ${pr.color}22`
                              }}
                              onClick={() => {
                                const section = sections.find(s => s.id === alloc.task.sectionId);
                                if (section) navigate(`/${section.slug || toSlug(section.name)}`);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = `linear-gradient(135deg, ${pr.color}25, ${pr.color}15)`;
                                e.currentTarget.style.transform = "translateX(4px)";
                                e.currentTarget.style.boxShadow = `0 4px 16px ${pr.color}33`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = `linear-gradient(135deg, ${pr.color}15, ${pr.color}08)`;
                                e.currentTarget.style.transform = "translateX(0)";
                                e.currentTarget.style.boxShadow = `0 2px 8px ${pr.color}22`;
                              }}
                            >
                              <div style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: pr.color,
                                marginBottom: 6,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                flexWrap: "wrap"
                              }}>
                                <span>🕐 {alloc.startTime} - {alloc.endTime}</span>
                                <span style={{
                                  background: pr.color,
                                  color: "#fff",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 9
                                }}>
                                  {alloc.durationMinutes} min
                                </span>
                              </div>
                              <div style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: theme.text,
                                marginBottom: 8
                              }}>
                                {alloc.task.title}
                              </div>
                              <div style={{
                                fontSize: 11,
                                color: theme.textMuted,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap"
                              }}>
                                <span>🎯 Target: {alloc.targetProgress}%</span>
                                <span>•</span>
                                <span>📊 Overall: {alloc.task.progress || 0}%</span>
                              </div>
                            </div>
                          );
                        })}

                        {window.blocked && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 48,
                            color: theme.red,
                            fontSize: 13,
                            fontWeight: 600,
                            opacity: 0.6
                          }}>
                            🚫 {window.label || "Blocked Time"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Task Summary - Right Side */}
              <div>
                <div style={{
                  fontSize: 12,
                  color: theme.text,
                  fontWeight: 700,
                  marginBottom: 16,
                  letterSpacing: "0.05em"
                }}>
                  📋 TASKS SUMMARY ({selectedTasks.length})
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selectedTasks.map(({ task, targetProgress }) => {
                    const pr = P(task.priority);
                    const section = sections.find(s => s.id === task.sectionId);
                    const trackInfo = isTaskOnTrack(task, blockedTimes, workHours.start, workHours.end);
                    const allocation = taskAllocations.find(a => a.task.id === task.id);

                    return (
                      <div key={task.id} style={{
                        background: theme.bgInput, borderRadius: 10, padding: "14px 16px",
                        borderLeft: `4px solid ${pr.color}`,
                        cursor: "pointer", transition: "all 0.15s"
                      }}
                        onClick={() => {
                          if (section) navigate(`/${section.slug || toSlug(section.name)}`);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateX(4px)";
                          e.currentTarget.style.boxShadow = `0 4px 12px ${pr.color}22`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, color: theme.text, marginBottom: 8 }}>
                          {task.title}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                          <span style={{ background: pr.dim, color: pr.color, fontSize: 9, padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>
                            {pr.label}
                          </span>
                          {section && (
                            <span style={{ background: theme.blueDim, color: theme.blue, fontSize: 9, padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                              📁 {section.name}
                            </span>
                          )}
                          {allocation && (
                            <span style={{ background: theme.orangeDim, color: theme.orange, fontSize: 9, padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                              ⏱️ {allocation.durationMinutes} min
                            </span>
                          )}
                        </div>

                        {/* Progress bars */}
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ color: theme.textDim, fontSize: 10, fontWeight: 600 }}>
                              Today's Target
                            </span>
                            <span style={{ color: pr.color, fontSize: 11, fontWeight: 700 }}>
                              {targetProgress}%
                            </span>
                          </div>
                          <div style={{
                            background: theme.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.1)",
                            borderRadius: 4, height: 8, overflow: "hidden"
                          }}>
                            <div style={{
                              background: pr.color, height: "100%",
                              width: `${targetProgress}%`, transition: "width 0.3s ease"
                            }} />
                          </div>
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ color: theme.textDim, fontSize: 10, fontWeight: 600 }}>
                              Overall Progress
                            </span>
                            <span style={{ color: theme.text, fontSize: 11, fontWeight: 700 }}>
                              {task.progress || 0}%
                            </span>
                          </div>
                          <div style={{
                            background: theme.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.1)",
                            borderRadius: 4, height: 6, overflow: "hidden"
                          }}>
                            <div style={{
                              background: trackInfo.onTrack ? theme.green : theme.orange,
                              height: "100%", width: `${task.progress || 0}%`,
                              transition: "width 0.3s ease"
                            }} />
                          </div>
                        </div>

                        {trackInfo.message && (
                          <div style={{
                            marginTop: 8, fontSize: 10, fontWeight: 600,
                            color: trackInfo.onTrack ? theme.green : theme.orange,
                            display: "flex", alignItems: "center", gap: 4
                          }}>
                            <span>{trackInfo.onTrack ? "✓" : "⚠"}</span>
                            <span>{trackInfo.message}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
