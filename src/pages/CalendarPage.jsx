import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MONTHS, DOWS } from "../../constants/appConstants";
import { P, todayStr, isDone, toSlug } from "../../utils/helpers";
import { getTasksSchedule, isTaskOnTrack, distributeTaskAcrossDays } from "../../utils/scheduleHelpers";
import { useTheme } from "../../contexts/ThemeContext";

function CalendarPage({ tasks, sections, onProgress, workWindows }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const today = todayStr();

  // Get schedule for all tasks
  const schedule = useMemo(() => 
    getTasksSchedule(tasks.filter(t => !isDone(t)), workWindows),
    [tasks, workWindows]
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

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: theme.text, marginBottom: 4 }}>
            📅 Smart Calendar
          </div>
          <div style={{ color: theme.textMuted, fontSize: 13 }}>
            Your tasks are automatically distributed across available days
          </div>
        </div>
        <button
          onClick={() => navigate("/")}
          style={{
            background: theme.bgInput, border: `1px solid ${theme.border}`,
            borderRadius: 10, padding: "10px 20px", color: theme.textMuted,
            fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            fontWeight: 600, transition: "all 0.15s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.borderColor = theme.red; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.borderColor = theme.border; }}
        >
          ← Back to Sections
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        {/* Calendar Grid */}
        <div style={{
          background: theme.bgCard, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: 24, transition: "background 0.3s ease"
        }}>
          {/* Month Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={prev} style={navBtn}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "none"; }}
            >‹</button>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: theme.text }}>
              {MONTHS[month]} {year}
            </div>
            <button onClick={next} style={navBtn}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "none"; }}
            >›</button>
          </div>

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

        {/* Selected Date Details */}
        <div style={{
          background: theme.bgCard, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: 20, position: "sticky", top: 80,
          maxHeight: "calc(100vh - 120px)", overflowY: "auto",
          transition: "background 0.3s ease"
        }}>
          {selectedDate ? (
            <>
              <div style={{
                fontSize: 11, color: theme.textMuted, fontWeight: 700,
                marginBottom: 12, letterSpacing: "0.07em", textTransform: "uppercase"
              }}>
                📅 {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>

              {selectedTasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: theme.textMuted, fontSize: 13 }}>
                  No tasks scheduled for this day
                </div>
              ) : (
                <>
                  <div style={{
                    background: theme.bgInput, borderRadius: 8, padding: "10px 12px",
                    marginBottom: 16, display: "flex", justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ color: theme.textMuted, fontSize: 12, fontWeight: 600 }}>Daily Target</span>
                    <span style={{
                      color: dailyWorkload[selectedDate] > 100 ? theme.red : theme.orange,
                      fontSize: 15, fontWeight: 700
                    }}>
                      {dailyWorkload[selectedDate]}%
                    </span>
                  </div>

                  {selectedTasks.map(({ task, targetProgress }) => {
                    const pr = P(task.priority);
                    const section = sections.find(s => s.id === task.sectionId);
                    const trackInfo = isTaskOnTrack(task, workWindows);

                    return (
                      <div key={task.id} style={{
                        background: theme.bgHover, borderRadius: 10, padding: "12px 14px",
                        marginBottom: 10, borderLeft: `3px solid ${pr.color}`,
                        cursor: "pointer", transition: "all 0.15s"
                      }}
                        onClick={() => {
                          if (section) navigate(`/${section.slug || toSlug(section.name)}`);
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(2px)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(0)"; }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, color: theme.text, marginBottom: 6 }}>
                          {task.title}
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ background: pr.dim, color: pr.color, fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                            {pr.label}
                          </span>
                          {section && (
                            <span style={{ background: theme.blueDim, color: theme.blue, fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                              {section.name}
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ color: theme.textDim, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>
                              TODAY'S TARGET
                            </span>
                            <span style={{ color: pr.color, fontSize: 10, fontWeight: 700 }}>
                              {targetProgress}%
                            </span>
                          </div>
                          <div style={{
                            background: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)",
                            borderRadius: 4, height: 6, overflow: "hidden"
                          }}>
                            <div style={{
                              background: pr.color, height: "100%",
                              width: `${targetProgress}%`, transition: "width 0.3s ease"
                            }} />
                          </div>
                        </div>

                        {/* Overall progress */}
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ color: theme.textDim, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>
                              OVERALL
                            </span>
                            <span style={{ color: theme.text, fontSize: 10, fontWeight: 700 }}>
                              {task.progress || 0}%
                            </span>
                          </div>
                          <div style={{
                            background: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)",
                            borderRadius: 4, height: 4, overflow: "hidden"
                          }}>
                            <div style={{
                              background: trackInfo.onTrack ? theme.green : theme.orange,
                              height: "100%", width: `${task.progress || 0}%`,
                              transition: "width 0.3s ease"
                            }} />
                          </div>
                          {trackInfo.message && (
                            <div style={{
                              marginTop: 4, fontSize: 9, fontWeight: 600,
                              color: trackInfo.onTrack ? theme.green : theme.orange
                            }}>
                              {trackInfo.message}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
              <div style={{ color: theme.textMuted, fontSize: 14, marginBottom: 8 }}>
                Select a date
              </div>
              <div style={{ color: theme.textFaint, fontSize: 12 }}>
                Click on a day to see scheduled tasks
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
