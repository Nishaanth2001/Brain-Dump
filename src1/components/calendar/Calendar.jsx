import { MONTHS, DOWS } from "../../constants/appConstants";
import { isDone, P, todayStr } from "../../utils/helpers";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from "react";

function Calendar({ tasks, sectionId }) {
  const [year,  setYear]  = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);
  const today = todayStr();

  const sectionTasks = useMemo(() =>
    tasks.filter(t => t.sectionId === sectionId && !isDone(t)), [tasks, sectionId]);

  const dateMap = useMemo(() => {
    const m = {};
    sectionTasks.forEach(t => {
      [t.deadlineDate, t.startDate].filter(Boolean).forEach(d => {
        if (!m[d]) m[d] = [];
        if (!m[d].includes(t)) m[d].push(t);
      });
    });
    return m;
  }, [sectionTasks]);

  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMon  = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const totalCells = firstDay + daysInMon;
  const trailing   = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const selectedTasks = selected ? tasks.filter(t =>
    t.sectionId === sectionId && !isDone(t) &&
    (t.deadlineDate === selected || t.startDate === selected)
  ) : [];

  return (
    <div style={{
      background:"linear-gradient(145deg,#0E1826,#0A1220)",
      border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:18,
      position:"sticky", top:80,
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <button onClick={prev} style={{ background:"none", border:"none", color:"#4A5568", fontSize:18, cursor:"pointer", padding:"2px 8px", borderRadius:6, transition:"all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.color="#E2E8F0"; e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.color="#4A5568"; e.currentTarget.style.background="none"; }}
        >‹</button>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:15, color:"#E2E8F0" }}>{MONTHS[month]} {year}</div>
        <button onClick={next} style={{ background:"none", border:"none", color:"#4A5568", fontSize:18, cursor:"pointer", padding:"2px 8px", borderRadius:6, transition:"all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.color="#E2E8F0"; e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.color="#4A5568"; e.currentTarget.style.background="none"; }}
        >›</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {DOWS.map(d => <div key={d} style={{ textAlign:"center", fontSize:9, color:"#2D3748", fontWeight:700, padding:"4px 0", letterSpacing:"0.06em" }}>{d}</div>)}

        {Array.from({length: firstDay}, (_, i) => (
          <div key={"p"+i} style={{ textAlign:"center", padding:"5px 2px", fontSize:11, color:"#1E2A3A", minHeight:32, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span>{daysInPrev - firstDay + 1 + i}</span>
          </div>
        ))}

        {Array.from({length: daysInMon}, (_, i) => {
          const d = i + 1;
          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dayTasks = dateMap[dateStr] || [];
          const isToday  = dateStr === today;
          const isSel    = dateStr === selected;
          const hasTasks = dayTasks.length > 0;
          return (
            <div key={d} onClick={() => hasTasks && setSelected(isSel ? null : dateStr)}
              style={{
                textAlign:"center", padding:"5px 2px", borderRadius:7, fontSize:12,
                minHeight:32, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                cursor: hasTasks ? "pointer" : "default",
                color: isSel ? "#fff" : isToday ? "#E84545" : hasTasks ? "#E2E8F0" : "#3A4A5C",
                background: isSel ? "#E84545" : isToday ? "rgba(232,69,69,0.12)" : "transparent",
                fontWeight: isToday ? 700 : 400,
                transition:"all 0.15s",
              }}
              onMouseEnter={e => { if (hasTasks && !isSel) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isToday ? "rgba(232,69,69,0.12)" : "transparent"; }}
            >
              <span>{d}</span>
              {hasTasks && (
                <span style={{
                  background: isSel||isToday ? "#fff" : "#E84545",
                  color: isSel||isToday ? "#E84545" : "#fff",
                  borderRadius:10, fontSize:8, fontWeight:700, padding:"1px 4px", lineHeight:1.4,
                }}>{dayTasks.length}</span>
              )}
            </div>
          );
        })}

        {Array.from({length: trailing}, (_, i) => (
          <div key={"n"+i} style={{ textAlign:"center", padding:"5px 2px", fontSize:11, color:"#1E2A3A", minHeight:32, display:"flex", flexDirection:"column", alignItems:"center" }}>
            <span>{i+1}</span>
          </div>
        ))}
      </div>

      {selected && selectedTasks.length > 0 && (
        <div style={{ marginTop:14, borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:12 }}>
          <div style={{ fontSize:10, color:"#4A5568", fontWeight:700, marginBottom:8, letterSpacing:"0.07em", textTransform:"uppercase" }}>
            📅 {new Date(selected+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
          </div>
          {selectedTasks.map(t => {
            const pr = P(t.priority);
            return (
              <div key={t.id} style={{
                background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"8px 10px",
                marginBottom:6, fontSize:12, color:"#E2E8F0",
                borderLeft:`2px solid ${pr.color}`,
              }}>
                <div style={{ fontWeight:600, marginBottom:2 }}>{t.title}</div>
                <div style={{ color:"#4A5568", fontSize:10 }}>
                  {pr.label} · {t.deadlineDate === selected ? "⏰ Deadline" : "🟢 Start"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Calendar;