import { useState, useMemo } from "react";
import { MONTHS, DOWS } from "../../constants/appConstants";
import { isDone, P, todayStr } from "../../utils/helpers";
import { useTheme } from "../../contexts/ThemeContext";

function Calendar({ tasks, sectionId }) {
  const { theme } = useTheme();
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [month,    setMonth]    = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);
  const today = todayStr();

  const sectionTasks = useMemo(()=>
    tasks.filter((t)=>t.sectionId===sectionId&&!isDone(t)),[tasks,sectionId]);

  const dateMap = useMemo(()=>{
    const m={};
    sectionTasks.forEach((t)=>{
      [t.deadlineDate,t.startDate].filter(Boolean).forEach((d)=>{
        if(!m[d]) m[d]=[];
        if(!m[d].includes(t)) m[d].push(t);
      });
    });
    return m;
  },[sectionTasks]);

  const firstDay   = new Date(year,month,1).getDay();
  const daysInMon  = new Date(year,month+1,0).getDate();
  const daysInPrev = new Date(year,month,0).getDate();
  const totalCells = firstDay+daysInMon;
  const trailing   = totalCells%7===0?0:7-(totalCells%7);

  const prev=()=>{if(month===0){setMonth(11);setYear((y)=>y-1);}else setMonth((m)=>m-1);};
  const next=()=>{if(month===11){setMonth(0);setYear((y)=>y+1);}else setMonth((m)=>m+1);};

  const selectedTasks=selected?tasks.filter((t)=>
    t.sectionId===sectionId&&!isDone(t)&&(t.deadlineDate===selected||t.startDate===selected)
  ):[];

  const navBtn={background:"none",border:"none",color:theme.textMuted,fontSize:18,cursor:"pointer",padding:"2px 8px",borderRadius:6,transition:"all 0.15s"};

  return (
    <div style={{
      background:theme.bgCard, border:`1px solid ${theme.border}`,
      borderRadius:16, padding:18, position:"sticky", top:80,
      transition:"background 0.3s ease",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <button onClick={prev} style={navBtn}
          onMouseEnter={(e)=>{e.currentTarget.style.color=theme.text;e.currentTarget.style.background=theme.bgHover;}}
          onMouseLeave={(e)=>{e.currentTarget.style.color=theme.textMuted;e.currentTarget.style.background="none";}}
        >‹</button>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:15, color:theme.text }}>{MONTHS[month]} {year}</div>
        <button onClick={next} style={navBtn}
          onMouseEnter={(e)=>{e.currentTarget.style.color=theme.text;e.currentTarget.style.background=theme.bgHover;}}
          onMouseLeave={(e)=>{e.currentTarget.style.color=theme.textMuted;e.currentTarget.style.background="none";}}
        >›</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {DOWS.map((d)=>(
          <div key={d} style={{ textAlign:"center", fontSize:9, color:theme.textMuted, fontWeight:700, padding:"4px 0", letterSpacing:"0.06em" }}>{d}</div>
        ))}

        {Array.from({length:firstDay},(_,i)=>(
          <div key={"p"+i} style={{ textAlign:"center", padding:"5px 2px", fontSize:11, color:theme.textFaint, minHeight:32, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span>{daysInPrev-firstDay+1+i}</span>
          </div>
        ))}

        {Array.from({length:daysInMon},(_,i)=>{
          const d=i+1;
          const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dayTasks=dateMap[dateStr]||[];
          const isToday=dateStr===today;
          const isSel=dateStr===selected;
          const hasTasks=dayTasks.length>0;
          return (
            <div key={d} onClick={()=>hasTasks&&setSelected(isSel?null:dateStr)}
              style={{
                textAlign:"center", padding:"5px 2px", borderRadius:7, fontSize:12,
                minHeight:32, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                cursor:hasTasks?"pointer":"default",
                color:isSel?"#fff":isToday?theme.red:hasTasks?theme.text:theme.textDim,
                background:isSel?theme.red:isToday?theme.redDim:"transparent",
                fontWeight:isToday?700:400, transition:"all 0.15s",
              }}
              onMouseEnter={(e)=>{if(hasTasks&&!isSel)e.currentTarget.style.background=theme.bgHover;}}
              onMouseLeave={(e)=>{if(!isSel)e.currentTarget.style.background=isToday?theme.redDim:"transparent";}}
            >
              <span>{d}</span>
              {hasTasks&&(
                <span style={{
                  background:isSel||isToday?"#fff":theme.red,
                  color:isSel||isToday?theme.red:"#fff",
                  borderRadius:10,fontSize:8,fontWeight:700,padding:"1px 4px",lineHeight:1.4,
                }}>{dayTasks.length}</span>
              )}
            </div>
          );
        })}

        {Array.from({length:trailing},(_,i)=>(
          <div key={"n"+i} style={{ textAlign:"center", padding:"5px 2px", fontSize:11, color:theme.textFaint, minHeight:32, display:"flex", flexDirection:"column", alignItems:"center" }}>
            <span>{i+1}</span>
          </div>
        ))}
      </div>

      {selected&&selectedTasks.length>0&&(
        <div style={{ marginTop:14, borderTop:`1px solid ${theme.border}`, paddingTop:12 }}>
          <div style={{ fontSize:10, color:theme.textMuted, fontWeight:700, marginBottom:8, letterSpacing:"0.07em", textTransform:"uppercase" }}>
            📅 {new Date(selected+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
          </div>
          {selectedTasks.map((t)=>{
            const pr=P(t.priority);
            return (
              <div key={t.id} style={{ background:theme.bgHover, borderRadius:8, padding:"8px 10px", marginBottom:6, fontSize:12, color:theme.text, borderLeft:`2px solid ${pr.color}` }}>
                <div style={{ fontWeight:600, marginBottom:2 }}>{t.title}</div>
                <div style={{ color:theme.textMuted, fontSize:10 }}>
                  {pr.label} · {t.deadlineDate===selected?"⏰ Deadline":"🟢 Start"}
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
