"use client";

import { useState, useEffect, useRef } from "react";

export default function StaffPage() {
  const [mode, setMode]       = useState<"signin" | "signup">("signin");
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [error, setError]     = useState("");
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, go straight to dashboard
  useEffect(() => {
    const token = localStorage.getItem("shauri_teacher_token");
    const session = localStorage.getItem("shauri_teacher");
    if (token && session) window.location.href = "/teacher";
  }, []);

  async function submit() {
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email."); return; }
    if (pass.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError(""); setMsg("");
    try {
      const res  = await fetch("/api/teacher-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, email: email.trim(), password: pass }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Something went wrong."); setLoading(false); return; }
      if (mode === "signup" && data.needsConfirmation) { setMsg(data.message); setLoading(false); return; }
      if (data.accessToken) {
        localStorage.setItem("shauri_teacher_token", data.accessToken);
        localStorage.setItem("shauri_teacher", JSON.stringify({ email: email.trim(), loginAt: Date.now() }));
      }
      window.location.href = "/teacher";
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Orbitron:wght@600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#020818;}
        .sf-root{min-height:100dvh;background:#020818;font-family:'Nunito',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden;}
        .sf-canvas{position:absolute;inset:0;z-index:0;pointer-events:none;}

        /* Subtle grid */
        .sf-grid{position:absolute;inset:0;z-index:0;pointer-events:none;
          background-image:linear-gradient(rgba(79,195,247,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,195,247,0.03) 1px,transparent 1px);
          background-size:48px 48px;}

        .sf-wrap{position:relative;z-index:2;width:100%;max-width:420px;}

        /* Logo */
        .sf-logo{text-align:center;margin-bottom:36px;}
        .sf-logo-text{font-family:'Orbitron',sans-serif;font-size:clamp(18px,3vw,24px);font-weight:900;letter-spacing:0.45em;color:rgba(255,215,0,0.9);text-shadow:0 0 24px rgba(255,215,0,0.35);}
        .sf-logo-sub{font-size:10px;letter-spacing:0.2em;color:rgba(255,255,255,0.2);font-weight:700;text-transform:uppercase;margin-top:4px;}
        .sf-logo-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(255,215,0,0.6);margin:0 6px;vertical-align:middle;box-shadow:0 0 8px rgba(255,215,0,0.5);}

        /* Card */
        .sf-card{background:rgba(5,15,45,0.9);border:1px solid rgba(79,195,247,0.14);border-radius:24px;padding:36px 32px 30px;backdrop-filter:blur(24px);box-shadow:0 24px 80px rgba(0,0,0,0.6);}

        .sf-heading{margin-bottom:6px;}
        .sf-role{font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:rgba(79,195,247,0.6);margin-bottom:8px;}
        .sf-title{font-family:'Orbitron',sans-serif;font-size:clamp(18px,2.5vw,22px);font-weight:900;color:#e0f7fa;line-height:1.3;margin-bottom:6px;}
        .sf-subtitle{font-size:13px;color:rgba(128,203,196,0.7);font-weight:600;margin-bottom:24px;line-height:1.5;}

        /* Toggle */
        .sf-toggle{display:flex;background:rgba(255,255,255,0.04);border-radius:10px;padding:3px;margin-bottom:22px;border:1px solid rgba(79,195,247,0.1);}
        .sf-tab{flex:1;padding:9px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:'Nunito',sans-serif;transition:all 0.2s;}
        .sf-tab-on{background:rgba(2,119,189,0.55);color:#e0f7fa;font-weight:800;}
        .sf-tab-off{background:transparent;color:rgba(128,203,196,0.4);font-weight:600;}

        /* Fields */
        .sf-label{display:block;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:5px;color:rgba(224,247,250,0.45);}
        .sf-input{width:100%;padding:11px 14px;background:rgba(255,255,255,0.04);border:1.5px solid rgba(79,195,247,0.15);border-radius:10px;color:#e0f7fa;font-size:14px;font-family:'Nunito',sans-serif;outline:none;transition:all 0.2s;margin-bottom:14px;}
        .sf-input:focus{border-color:rgba(79,195,247,0.5);background:rgba(79,195,247,0.06);box-shadow:0 0 0 3px rgba(79,195,247,0.08);}
        .sf-input::placeholder{color:rgba(224,247,250,0.18);}

        /* Button */
        .sf-btn{width:100%;padding:13px;background:linear-gradient(135deg,#0277bd,#00acc1);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;letter-spacing:0.04em;transition:all 0.2s;box-shadow:0 4px 20px rgba(2,119,189,0.35);margin-top:2px;}
        .sf-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 28px rgba(2,119,189,0.45);}
        .sf-btn:disabled{opacity:0.5;cursor:not-allowed;}

        /* Error / success */
        .sf-error{font-size:12px;color:#ff8a80;font-weight:700;margin-bottom:12px;padding:8px 12px;background:rgba(255,138,128,0.07);border-radius:8px;border:1px solid rgba(255,138,128,0.18);}
        .sf-success{padding:16px;background:rgba(76,175,80,0.08);border:1px solid rgba(76,175,80,0.25);border-radius:12px;color:#a5d6a7;font-size:13px;font-weight:700;line-height:1.6;}

        /* Footer */
        .sf-footer{margin-top:20px;text-align:center;font-size:11px;color:rgba(79,195,247,0.22);font-weight:700;letter-spacing:0.06em;text-transform:uppercase;}
        .sf-back{display:block;text-align:center;margin-top:10px;font-size:12px;color:rgba(128,203,196,0.35);font-weight:700;cursor:pointer;text-decoration:none;transition:color 0.15s;}
        .sf-back:hover{color:rgba(128,203,196,0.7);}
      `}</style>

      <div className="sf-root">
        <canvas className="sf-canvas" ref={useStarfield()} />
        <div className="sf-grid" />

        <div className="sf-wrap">
          {/* Logo */}
          <div className="sf-logo">
            <div className="sf-logo-text">SHAURI</div>
            <div className="sf-logo-sub">
              <span className="sf-logo-dot"/>Staff Portal<span className="sf-logo-dot"/>
            </div>
          </div>

          {/* Card */}
          <div className="sf-card">
            <div className="sf-role">👩‍🏫 Teacher Access</div>
            <div className="sf-title">
              {msg ? "Check your inbox" : mode === "signin" ? "Welcome back" : "Create your account"}
            </div>
            <div className="sf-subtitle">
              {msg ? "Confirm your email to activate your account." : "Secure access to your class dashboard, OMR tools, and student progress."}
            </div>

            <div className="sf-toggle">
              <button className={`sf-tab ${mode==="signin"?"sf-tab-on":"sf-tab-off"}`}
                onClick={()=>{setMode("signin");setError("");setMsg("");}}>Sign In</button>
              <button className={`sf-tab ${mode==="signup"?"sf-tab-on":"sf-tab-off"}`}
                onClick={()=>{setMode("signup");setError("");setMsg("");}}>Create Account</button>
            </div>

            {msg ? (
              <div className="sf-success">
                ✅ {msg}
                <button onClick={()=>{setMode("signin");setMsg("");}}
                  style={{display:"block",marginTop:12,background:"none",border:"none",color:"#80cbc4",fontSize:12,fontWeight:700,cursor:"pointer",textDecoration:"underline",fontFamily:"Nunito,sans-serif"}}>
                  Go to Sign In →
                </button>
              </div>
            ) : (
              <>
                <label className="sf-label">School Email</label>
                <input className="sf-input" type="email" placeholder="teacher@school.edu"
                  value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                  onKeyDown={e=>e.key==="Enter"&&submit()} autoFocus />

                <label className="sf-label">
                  Password {mode==="signup"&&<span style={{fontSize:10,color:"rgba(128,203,196,0.35)",fontWeight:600}}> (min 6 chars)</span>}
                </label>
                <input className="sf-input" type="password" placeholder="••••••••"
                  value={pass} onChange={e=>{setPass(e.target.value);setError("");}}
                  onKeyDown={e=>e.key==="Enter"&&submit()} />

                {error && <div className="sf-error">⚠ {error}</div>}

                <button className="sf-btn" onClick={submit} disabled={loading}>
                  {loading ? "Please wait…" : mode==="signin" ? "Sign In →" : "Create Account →"}
                </button>
              </>
            )}

            <div className="sf-footer">🔒 Secured by Supabase Auth</div>
          </div>

          <a className="sf-back" href="/">← Back to student login</a>
        </div>
      </div>
    </>
  );
}

function useStarfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const stars = Array.from({length:200},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.2+0.2,a:Math.random()*0.6+0.1,phase:Math.random()*Math.PI*2,speed:Math.random()*0.004+0.001}));
    let f=0;
    function draw(){
      if(!ctx||!canvas)return;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const t=f*0.015;
      stars.forEach(s=>{
        const a=0.2+0.8*Math.abs(Math.sin(t*s.speed*8+s.phase));
        ctx.beginPath();ctx.arc(s.x*canvas.width,s.y*canvas.height,s.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${a*s.a})`;ctx.fill();
      });
      f++;requestAnimationFrame(draw);
    }
    draw();
    return()=>window.removeEventListener("resize",resize);
  },[]);
  return ref;
}