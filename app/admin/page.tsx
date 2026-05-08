"use client";
import AdminGate from "../components/AdminGate";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SUBJECTS = ["General","Mathematics","Science","Physics","Chemistry","Biology","English","Hindi","SST","History","Geography","Civics","Economics"];
const CLASSES  = ["All","6","7","8","9","10","11","12"];

const ACCEPTED = ".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.docx,.pptx,.xlsx,.doc,.ppt,.xls";

const FILE_ICONS: Record<string,string> = {
  pdf:"📄", png:"🖼️", jpg:"🖼️", jpeg:"🖼️", webp:"🖼️", bmp:"🖼️", gif:"🖼️",
  docx:"📝", doc:"📝", pptx:"📊", ppt:"📊", xlsx:"📈", xls:"📈",
  txt:"📃", md:"📃", csv:"📋",
};
function fileIcon(name: string) { return FILE_ICONS[name.split(".").pop()?.toLowerCase()||""] || "📎"; }

type Student = { student_name:string; class:string; board:string; attempts:number; avg_score:number; last_active:string; subjects:string[]; };
type Attempt = { id:string; created_at:string; student_name:string; class:string; subject:string; marks_obtained:number; total_marks:number; percentage:number; mode:string; };
type KBEntry = { id:string; title:string; subject:string; class_level:string; tags:string[]; file_name?:string; file_type?:string; created_at:string; active:boolean; };

const S = {
  bg:"#fdf6e3", bgCard:"#ffffff", bgMuted:"#fdf9f0",
  border:"#e8d5a3", borderLight:"#f0e6c8",
  text:"#1a3a4a", textMuted:"#8a7a5a", textLight:"#b0a080",
  gold:"#c9a227", purple:"#5b6fa5", green:"#2d6a4f",
  red:"#c0392b", amber:"#b5830a", font:"'Courier New', monospace",
};

function scoreColor(p:number){ return p>=70?S.green:p>=45?S.amber:S.red; }

export default function AdminPage() {
  const [tab,setTab]           = useState("overview");
  const [students,setStudents] = useState<Student[]>([]);
  const [attempts,setAttempts] = useState<Attempt[]>([]);
  const [kb,setKb]             = useState<KBEntry[]>([]);
  const [loading,setLoading]   = useState(false);
  const [search,setSearch]     = useState("");
  const [stats,setStats]       = useState({total:0,avgScore:0,todayActive:0,totalAttempts:0});
  const [kbTitle,setKbTitle]   = useState("");
  const [kbSubject,setKbSubject] = useState("General");
  const [kbClass,setKbClass]   = useState("All");
  const [kbContent,setKbContent] = useState("");
  const [kbTags,setKbTags]     = useState("");
  const [kbFile,setKbFile]     = useState<File|null>(null);
  const [kbSaving,setKbSaving] = useState(false);
  const [kbMsg,setKbMsg]       = useState("");
  const [kbMsgOk,setKbMsgOk]  = useState(false);
  const [extracting,setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{ fetchAll(); },[]);
  useEffect(()=>{ if(tab==="knowledge") fetchKB(); },[tab]);

  async function fetchAll() {
    setLoading(true);
    const {data} = await supabase
      .from("exam_attempts")
      .select("student_name,class,board,subject,marks_obtained,total_marks,percentage,created_at,mode,id")
      .order("created_at",{ascending:false}).limit(1000);
    const rows = data||[];
    setAttempts(rows as Attempt[]);
    const map:Record<string,Student>={};
    const today=new Date().toDateString();
    const todaySet=new Set<string>();
    rows.forEach((r:any)=>{
      const k=`${r.student_name}__${r.class}`;
      if(!map[k]) map[k]={student_name:r.student_name,class:r.class,board:r.board||"CBSE",attempts:0,avg_score:0,last_active:r.created_at,subjects:[]};
      map[k].attempts++;
      if(r.percentage) map[k].avg_score+=r.percentage;
      if(r.subject&&!map[k].subjects.includes(r.subject)) map[k].subjects.push(r.subject);
      if(new Date(r.created_at).toDateString()===today) todaySet.add(k);
    });
    const list=Object.values(map).map(s=>({...s,avg_score:s.attempts>0?Math.round(s.avg_score/s.attempts):0}));
    setStudents(list);
    setStats({total:list.length,avgScore:list.length>0?Math.round(list.reduce((a,s)=>a+s.avg_score,0)/list.length):0,todayActive:todaySet.size,totalAttempts:rows.length});
    setLoading(false);
  }

  async function fetchKB() {
    const res=await fetch("/api/admin/knowledge");
    const d=await res.json();
    setKb(d.knowledge||[]);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setKbFile(f);
    if (f) {
      setKbContent("");
      if (!kbTitle) setKbTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g," "));
    }
  }

  async function saveKB() {
    if (!kbTitle.trim()) { setKbMsg("Title is required"); setKbMsgOk(false); return; }
    if (!kbContent.trim() && !kbFile) { setKbMsg("Content or file is required"); setKbMsgOk(false); return; }
    setKbSaving(true);
    if (kbFile) setExtracting(true);
    setKbMsg(kbFile ? "Extracting content from file..." : "Saving...");
    setKbMsgOk(false);
    try {
      const form = new FormData();
      form.append("title",       kbTitle);
      form.append("subject",     kbSubject);
      form.append("class_level", kbClass);
      form.append("tags",        kbTags);
      if (kbFile)    form.append("file",    kbFile);
      else           form.append("content", kbContent);
      const res = await fetch("/api/admin/knowledge",{method:"POST",body:form});
      const d   = await res.json();
      if (d.ok) {
        setKbMsg(`Saved! ${d.contentLength ? `(${d.contentLength.toLocaleString()} chars extracted)` : ""} AI will now use this knowledge.`);
        setKbMsgOk(true);
        setKbTitle(""); setKbContent(""); setKbTags(""); setKbFile(null);
        if(fileRef.current) fileRef.current.value="";
        fetchKB();
      } else {
        setKbMsg("Error: "+(d.error||"unknown"));
        setKbMsgOk(false);
      }
    } catch(e:any){ setKbMsg("Error: "+e.message); setKbMsgOk(false); }
    setKbSaving(false); setExtracting(false);
  }

  async function deleteKB(id:string) {
    if(!confirm("Remove this entry?")) return;
    await fetch(`/api/admin/knowledge?id=${id}`,{method:"DELETE"});
    fetchKB();
  }

  const filtered=students.filter(s=>
    (s.student_name||"").toLowerCase().includes(search.toLowerCase())||
    (s.class||"").toLowerCase().includes(search.toLowerCase())
  );

  const card={background:S.bgCard,border:`1px solid ${S.border}`,borderRadius:16,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.04)"};
  const th={textAlign:"left" as const,padding:"10px 14px",fontSize:10,letterSpacing:2,color:S.textMuted,fontWeight:600};
  const tdS=(extra={})=>({padding:"11px 14px",...extra});
  const inp={width:"100%",background:S.bgMuted,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,fontFamily:S.font,color:S.text,outline:"none",boxSizing:"border-box" as const};
  const lbl={fontSize:10,letterSpacing:2,color:S.textMuted,display:"block" as const,marginBottom:6};

  const tabs=[
    {id:"overview",label:"Overview"},
    {id:"students",label:"Students"},
    {id:"activity",label:"Activity"},
    {id:"knowledge",label:"Knowledge Base"},
  ];

  return (
    <AdminGate>
      <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${S.bg} 0%,#fef9f0 50%,${S.bg} 100%)`,fontFamily:S.font}}>

        {/* Header */}
        <div style={{background:"rgba(255,255,255,0.75)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${S.border}`,padding:"18px 40px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h1 style={{fontSize:34,fontWeight:900,letterSpacing:8,color:S.text,margin:0}}>SHAURI</h1>
            <p style={{fontSize:11,letterSpacing:4,color:S.textMuted,margin:"2px 0 0"}}>ADMIN CONTROL PANEL</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <span style={{fontSize:11,letterSpacing:2,color:S.textMuted}}>{new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).toUpperCase()}</span>
            <button onClick={()=>{sessionStorage.clear();window.location.reload();}}
              style={{background:"transparent",border:`1px solid ${S.red}`,color:S.red,fontSize:11,letterSpacing:2,padding:"6px 16px",borderRadius:20,cursor:"pointer"}}>
              LOGOUT
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{background:"rgba(255,255,255,0.5)",borderBottom:`1px solid ${S.border}`,padding:"0 40px",display:"flex"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"13px 24px",fontSize:11,letterSpacing:3,fontFamily:S.font,background:"transparent",border:"none",
                borderBottom:tab===t.id?`3px solid ${S.gold}`:"3px solid transparent",
                color:tab===t.id?S.text:S.textMuted,fontWeight:tab===t.id?700:400,cursor:"pointer"}}>
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{padding:"28px 40px"}}>
          {loading&&<div style={{display:"flex",justifyContent:"center",padding:80}}><p style={{color:S.textMuted,letterSpacing:4,fontSize:12}}>LOADING DATA...</p></div>}

          {/* OVERVIEW */}
          {!loading&&tab==="overview"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:18,marginBottom:28}}>
                {[{l:"Total Students",v:stats.total,c:S.gold},{l:"Total Attempts",v:stats.totalAttempts,c:S.purple},{l:"Active Today",v:stats.todayActive,c:S.green},{l:"Avg Score",v:stats.avgScore+"%",c:"#8a4fa5"}].map((s,i)=>(
                  <div key={i} style={{...card,padding:22}}>
                    <p style={{fontSize:10,letterSpacing:3,color:S.textMuted,margin:"0 0 8px"}}>{s.l.toUpperCase()}</p>
                    <p style={{fontSize:38,fontWeight:900,color:s.c,margin:0}}>{s.v}</p>
                  </div>
                ))}
              </div>
              <div style={card}>
                <p style={{fontSize:11,letterSpacing:3,color:S.textMuted,margin:"0 0 18px"}}>RECENT ACTIVITY</p>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:`1px solid ${S.borderLight}`}}>
                    {["Student","Class","Subject","Score","Date"].map(h=><th key={h} style={th}>{h.toUpperCase()}</th>)}
                  </tr></thead>
                  <tbody>
                    {attempts.slice(0,15).map((a,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${S.bgMuted}`}}>
                        <td style={tdS({color:S.text,fontWeight:600})}>{a.student_name}</td>
                        <td style={tdS({color:S.purple})}>Class {a.class}</td>
                        <td style={tdS({color:S.textMuted})}>{a.subject}</td>
                        <td style={tdS()}>{a.percentage!=null?<span style={{color:scoreColor(a.percentage),fontWeight:700}}>{a.percentage}%</span>:<span style={{color:S.borderLight}}>—</span>}</td>
                        <td style={tdS({color:S.textMuted,fontSize:11})}>{new Date(a.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</td>
                      </tr>
                    ))}
                    {!attempts.length&&<tr><td colSpan={5} style={tdS({color:S.textMuted})}>No activity yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STUDENTS */}
          {!loading&&tab==="students"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <p style={{fontSize:11,letterSpacing:3,color:S.textMuted,margin:0}}>{filtered.length} STUDENTS ENROLLED</p>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or class..."
                  style={{background:"white",border:`1px solid ${S.border}`,color:S.text,borderRadius:24,padding:"9px 18px",fontSize:13,width:250,outline:"none",fontFamily:S.font}}/>
              </div>
              <div style={{...card,padding:0,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:`1px solid ${S.borderLight}`,background:S.bgMuted}}>
                    {["Student","Class","Board","Attempts","Avg Score","Subjects","Last Active"].map(h=><th key={h} style={th}>{h.toUpperCase()}</th>)}
                  </tr></thead>
                  <tbody>
                    {!filtered.length&&<tr><td colSpan={7} style={tdS({color:S.textMuted})}>No students found.</td></tr>}
                    {filtered.map((s,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${S.bgMuted}`}}>
                        <td style={tdS({color:S.text,fontWeight:700})}>{s.student_name}</td>
                        <td style={tdS({color:S.purple,fontWeight:600})}>Class {s.class}</td>
                        <td style={tdS({color:S.textMuted})}>{s.board}</td>
                        <td style={tdS({color:S.gold,fontWeight:700})}>{s.attempts}</td>
                        <td style={tdS()}><span style={{color:scoreColor(s.avg_score),fontWeight:700,fontSize:14}}>{s.avg_score}%</span></td>
                        <td style={tdS({color:S.textMuted,fontSize:11})}>{s.subjects.slice(0,2).join(", ")}{s.subjects.length>2?` +${s.subjects.length-2}`:""}</td>
                        <td style={tdS({color:S.textMuted,fontSize:11})}>{new Date(s.last_active).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ACTIVITY */}
          {!loading&&tab==="activity"&&(
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{borderBottom:`1px solid ${S.borderLight}`,background:S.bgMuted}}>
                  {["Student","Class","Subject","Marks","Score %","Mode","Date"].map(h=><th key={h} style={th}>{h.toUpperCase()}</th>)}
                </tr></thead>
                <tbody>
                  {!attempts.length&&<tr><td colSpan={7} style={tdS({color:S.textMuted})}>No attempts yet.</td></tr>}
                  {attempts.map((a,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${S.bgMuted}`}}>
                      <td style={tdS({color:S.text,fontWeight:600})}>{a.student_name}</td>
                      <td style={tdS({color:S.purple})}>Class {a.class}</td>
                      <td style={tdS({color:S.textMuted})}>{a.subject}</td>
                      <td style={tdS({color:S.text})}>{a.marks_obtained!=null?`${a.marks_obtained}/${a.total_marks}`:"—"}</td>
                      <td style={tdS()}>{a.percentage!=null?<span style={{color:scoreColor(a.percentage),fontWeight:700}}>{a.percentage}%</span>:<span style={{color:S.borderLight}}>—</span>}</td>
                      <td style={tdS()}>
                        <span style={{background:S.bgMuted,border:`1px solid ${S.border}`,color:S.textMuted,fontSize:10,letterSpacing:1,padding:"2px 8px",borderRadius:20}}>
                          {(a.mode||"examiner").toUpperCase()}
                        </span>
                      </td>
                      <td style={tdS({color:S.textMuted,fontSize:11})}>{new Date(a.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* KNOWLEDGE BASE */}
          {tab==="knowledge"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>

              {/* Upload form */}
              <div style={card}>
                <p style={{fontSize:11,letterSpacing:3,color:S.textMuted,margin:"0 0 6px"}}>ADD TO KNOWLEDGE BASE</p>
                <p style={{fontSize:12,color:S.textMuted,margin:"0 0 20px",lineHeight:1.7}}>
                  Upload any file or paste text. The AI automatically searches this knowledge base before every response and uses the most relevant content.
                </p>

                {/* Supported formats banner */}
                <div style={{background:S.bgMuted,border:`1px solid ${S.borderLight}`,borderRadius:10,padding:"10px 14px",marginBottom:18,fontSize:11,color:S.textMuted,lineHeight:1.8}}>
                  <strong style={{color:S.text}}>Supported formats:</strong><br/>
                  📄 PDF &nbsp;|&nbsp; 🖼️ Images (PNG, JPG, WEBP) &nbsp;|&nbsp; 📝 Word (DOCX) &nbsp;|&nbsp; 📊 PowerPoint (PPTX) &nbsp;|&nbsp; 📈 Excel (XLSX) &nbsp;|&nbsp; 📃 Text / Markdown / CSV
                  <br/><span style={{color:S.textLight}}>PDF, images and Office files are extracted automatically using Gemini AI.</span>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={lbl}>TITLE *</label>
                  <input value={kbTitle} onChange={e=>setKbTitle(e.target.value)} placeholder="e.g. Chapter 1 — Real Numbers Notes" style={inp}/>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <div>
                    <label style={lbl}>SUBJECT</label>
                    <select value={kbSubject} onChange={e=>setKbSubject(e.target.value)} style={{...inp,padding:"10px 14px"}}>
                      {SUBJECTS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>CLASS</label>
                    <select value={kbClass} onChange={e=>setKbClass(e.target.value)} style={{...inp,padding:"10px 14px"}}>
                      {CLASSES.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={lbl}>TAGS (comma separated)</label>
                  <input value={kbTags} onChange={e=>setKbTags(e.target.value)} placeholder="e.g. hcf, lcm, real numbers, chapter 1" style={inp}/>
                </div>

                {/* File drop zone */}
                <div style={{marginBottom:14}}>
                  <label style={lbl}>UPLOAD FILE</label>
                  <div style={{border:`2px dashed ${kbFile?S.green:S.border}`,borderRadius:12,padding:"20px 16px",textAlign:"center",background:kbFile?"#f0faf4":S.bgMuted,transition:"all 0.2s",cursor:"pointer"}}
                    onClick={()=>fileRef.current?.click()}>
                    {kbFile ? (
                      <div>
                        <p style={{fontSize:24,margin:"0 0 6px"}}>{fileIcon(kbFile.name)}</p>
                        <p style={{color:S.green,fontWeight:700,fontSize:13,margin:"0 0 2px"}}>{kbFile.name}</p>
                        <p style={{color:S.textMuted,fontSize:11,margin:0}}>{(kbFile.size/1024).toFixed(1)} KB — click to change</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{fontSize:28,margin:"0 0 8px"}}>📁</p>
                        <p style={{color:S.textMuted,fontSize:13,margin:"0 0 4px"}}>Click to choose file</p>
                        <p style={{color:S.textLight,fontSize:11,margin:0}}>PDF, Word, PowerPoint, Excel, Images, Text</p>
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept={ACCEPTED} onChange={onFileChange} style={{display:"none"}}/>
                  </div>
                  {kbFile&&(
                    <button onClick={()=>{setKbFile(null);if(fileRef.current)fileRef.current.value="";}}
                      style={{background:"transparent",border:"none",color:S.red,fontSize:11,cursor:"pointer",marginTop:4,fontFamily:S.font}}>
                      ✕ Remove file
                    </button>
                  )}
                </div>

                {/* Text area */}
                <div style={{marginBottom:18}}>
                  <label style={lbl}>OR PASTE CONTENT DIRECTLY</label>
                  <textarea value={kbContent} onChange={e=>{setKbContent(e.target.value);if(e.target.value){setKbFile(null);if(fileRef.current)fileRef.current.value="";}}}
                    placeholder="Paste notes, chapter summaries, explanations, NCERT content, custom rules..."
                    rows={6}
                    style={{...inp,resize:"vertical" as const}}/>
                </div>

                {kbMsg&&(
                  <div style={{background:kbMsgOk?"#f0faf4":"#fef2f2",border:`1px solid ${kbMsgOk?S.green:S.red}`,borderRadius:10,padding:"10px 14px",marginBottom:14}}>
                    <p style={{fontSize:12,color:kbMsgOk?S.green:S.red,margin:0,fontWeight:600}}>
                      {extracting?"⏳":kbMsgOk?"✅":"❌"} {kbMsg}
                    </p>
                  </div>
                )}

                <button onClick={saveKB} disabled={kbSaving}
                  style={{width:"100%",background:kbSaving?S.textLight:S.text,color:"white",border:"none",borderRadius:24,padding:"13px 0",fontSize:11,letterSpacing:3,fontFamily:S.font,cursor:kbSaving?"not-allowed":"pointer",fontWeight:700}}>
                  {kbSaving?(extracting?"EXTRACTING CONTENT...":"SAVING..."):"ADD TO KNOWLEDGE BASE"}
                </button>
              </div>

              {/* KB entries list */}
              <div style={card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                  <p style={{fontSize:11,letterSpacing:3,color:S.textMuted,margin:0}}>
                    KNOWLEDGE BASE &nbsp;
                    <span style={{background:S.gold,color:"white",borderRadius:10,padding:"2px 10px",fontSize:10}}>{kb.filter(k=>k.active).length}</span>
                  </p>
                  <button onClick={fetchKB}
                    style={{background:"transparent",border:`1px solid ${S.border}`,color:S.textMuted,fontSize:10,letterSpacing:2,padding:"4px 12px",borderRadius:12,cursor:"pointer",fontFamily:S.font}}>
                    REFRESH
                  </button>
                </div>

                {kb.length===0&&(
                  <div style={{textAlign:"center",padding:"50px 20px"}}>
                    <p style={{fontSize:40,marginBottom:8}}>📚</p>
                    <p style={{color:S.textMuted,fontSize:14,fontWeight:600}}>Knowledge base is empty</p>
                    <p style={{color:S.textLight,fontSize:12,lineHeight:1.6}}>Add your first entry on the left.<br/>The AI will start using it immediately in all chat sessions.</p>
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:600,overflowY:"auto"}}>
                  {kb.filter(k=>k.active).map(k=>(
                    <div key={k.id} style={{background:S.bgMuted,border:`1px solid ${S.borderLight}`,borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:16}}>{k.file_name?fileIcon(k.file_name):"📝"}</span>
                          <p style={{color:S.text,fontWeight:700,fontSize:13,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{k.title}</p>
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{background:S.bgCard,border:`1px solid ${S.border}`,color:S.purple,fontSize:10,padding:"2px 8px",borderRadius:10}}>{k.subject}</span>
                          <span style={{background:S.bgCard,border:`1px solid ${S.border}`,color:S.textMuted,fontSize:10,padding:"2px 8px",borderRadius:10}}>Class {k.class_level}</span>
                          {k.file_name&&<span style={{background:S.bgCard,border:`1px solid ${S.border}`,color:S.green,fontSize:10,padding:"2px 8px",borderRadius:10}}>{k.file_name}</span>}
                          {k.file_type&&k.file_type!=="text"&&<span style={{background:"#fef3cd",border:`1px solid ${S.gold}`,color:S.amber,fontSize:10,padding:"2px 8px",borderRadius:10}}>{k.file_type.toUpperCase()}</span>}
                        </div>
                        {k.tags?.length>0&&<p style={{color:S.textLight,fontSize:10,margin:"0 0 2px"}}>#{k.tags.join(" #")}</p>}
                        <p style={{color:S.textLight,fontSize:10,margin:0}}>{new Date(k.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
                      </div>
                      <button onClick={()=>deleteKB(k.id)}
                        style={{background:"transparent",border:`1px solid ${S.red}`,color:S.red,fontSize:10,padding:"4px 10px",borderRadius:10,cursor:"pointer",fontFamily:S.font,flexShrink:0}}>
                        REMOVE
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </AdminGate>
  );
}