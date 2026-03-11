"use client";

import { useState, useEffect, useRef } from "react";
import { grantAccess } from "../lib/session";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Orbitron:wght@600;700;900&display=swap');

  .ag-root {
    min-height: 100dvh; width: 100%;
    background: #020818; font-family: 'Nunito', sans-serif;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; align-items: center;
  }
  .ag-canvas { position: absolute; inset: 0; z-index: 0; pointer-events: none; }

  .ag-globe-wrap {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -54%);
    z-index: 1; pointer-events: none;
  }
  .ag-globe-svg {
    width: clamp(340px, 58vw, 700px);
    height: clamp(340px, 58vw, 700px);
    filter: drop-shadow(0 0 55px rgba(79,195,247,0.38)) drop-shadow(0 0 120px rgba(79,195,247,0.15));
    animation: globeGlow 6s ease-in-out infinite;
  }
  @keyframes globeGlow {
    0%,100% { filter: drop-shadow(0 0 50px rgba(79,195,247,0.3)) drop-shadow(0 0 100px rgba(79,195,247,0.12)); }
    50%      { filter: drop-shadow(0 0 80px rgba(79,195,247,0.5)) drop-shadow(0 0 160px rgba(79,195,247,0.2)); }
  }
  @keyframes globeSpin { from { transform: translateX(0); } to { transform: translateX(-50%); } }

  .ag-atmosphere {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%,-54%);
    width: clamp(390px, 65vw, 790px);
    height: clamp(390px, 65vw, 790px);
    border-radius: 50%;
    background: radial-gradient(circle, transparent 46%, rgba(79,195,247,0.05) 60%, rgba(79,195,247,0.11) 70%, transparent 80%);
    animation: atmospherePulse 5s ease-in-out infinite;
    pointer-events: none; z-index: 1;
  }
  @keyframes atmospherePulse { 0%,100%{opacity:0.7;transform:translate(-50%,-54%) scale(1)} 50%{opacity:1;transform:translate(-50%,-54%) scale(1.03)} }

  .ag-orbit {
    position: absolute; top: 50%; left: 50%;
    width: clamp(420px, 70vw, 840px);
    height: clamp(420px, 70vw, 840px);
    transform: translate(-50%,-54%) rotateX(72deg);
    border-radius: 50%;
    border: 1px solid rgba(100,200,255,0.14);
    pointer-events: none; z-index: 1;
    animation: orbitSpin 24s linear infinite;
  }
  .ag-orbit::before { content:'🛰️'; position:absolute; top:-13px; left:50%; transform:translateX(-50%); font-size:18px; filter:drop-shadow(0 0 8px rgba(100,200,255,0.9)); }
  @keyframes orbitSpin { from{transform:translate(-50%,-54%) rotateX(72deg) rotate(0deg)} to{transform:translate(-50%,-54%) rotateX(72deg) rotate(360deg)} }

  .ag-wordmark {
    position: absolute; top: 28px; left: 50%; transform: translateX(-50%);
    z-index: 10; text-align: center; pointer-events: none;
  }
  .ag-wordmark-text {
    font-family: 'Orbitron', sans-serif; font-size: clamp(16px,2.2vw,22px);
    font-weight: 900; letter-spacing: 0.5em; color: rgba(255,215,0,0.92);
    text-shadow: 0 0 24px rgba(255,215,0,0.4);
  }
  .ag-wordmark-sub { font-size: 9px; letter-spacing: 0.22em; color: rgba(255,255,255,0.25); font-weight: 700; text-transform: uppercase; margin-top: 3px; }

  .ag-card-wrap {
    position: relative; z-index: 10;
    margin-top: clamp(280px, 46vw, 560px);
    width: 100%; display: flex; justify-content: center;
    padding: 0 20px 60px;
  }
  .ag-card {
    width: 100%; max-width: 390px;
    background: rgba(2, 12, 40, 0.84);
    border: 1px solid rgba(79,195,247,0.18);
    border-radius: 22px; padding: 28px 28px 24px;
    backdrop-filter: blur(20px);
    box-shadow: 0 8px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(79,195,247,0.05);
  }

  .ag-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 14px; background: rgba(79,195,247,0.1); color: #4fc3f7; border: 1px solid rgba(79,195,247,0.22); }
  .ag-title { font-family: 'Orbitron', sans-serif; font-size: clamp(22px, 3vw, 30px); font-weight: 900; line-height: 1.25; color: #e0f7fa; margin-bottom: 8px; }
  .ag-sub { font-size: 13px; line-height: 1.6; margin-bottom: 20px; font-weight: 600; color: #80cbc4; }

  .ag-profile-card { display: flex; align-items: center; gap: 12px; padding: 13px 15px; background: rgba(79,195,247,0.07); border: 1.5px solid rgba(79,195,247,0.22); border-radius: 14px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
  .ag-profile-card:hover { background: rgba(79,195,247,0.14); border-color: rgba(79,195,247,0.45); transform: translateY(-1px); }
  .ag-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #4fc3f7, #00bcd4); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: #fff; flex-shrink: 0; }
  .ag-profile-name { font-size: 14px; font-weight: 800; color: #e0f7fa; }
  .ag-profile-class { font-size: 11px; color: #80cbc4; margin-top: 1px; }
  .ag-profile-arrow { margin-left: auto; font-size: 16px; color: #4fc3f7; }

  .ag-or-divider { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .ag-or-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
  .ag-or-text { font-size: 10px; color: rgba(255,255,255,0.25); font-weight: 700; letter-spacing: 0.1em; }

  .ag-field { margin-bottom: 11px; }
  .ag-label { display: block; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 5px; color: rgba(224,247,250,0.5); }
  .ag-input { width: 100%; padding: 10px 13px; background: rgba(255,255,255,0.05); border: 1.5px solid rgba(79,195,247,0.18); border-radius: 10px; color: #e0f7fa; font-size: 14px; font-family: 'Nunito', sans-serif; outline: none; transition: all 0.2s; box-sizing: border-box; }
  .ag-input:focus { border-color: rgba(79,195,247,0.55); background: rgba(79,195,247,0.07); box-shadow: 0 0 0 3px rgba(79,195,247,0.1); }
  .ag-input::placeholder { color: rgba(224,247,250,0.22); }
  .ag-select { appearance: none; cursor: pointer; background: #0a1628 !important; color: #e0f7fa !important; }
  .ag-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  .ag-btn-student { width: 100%; padding: 13px; background: linear-gradient(135deg, #0277bd, #00acc1); color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; font-family: 'Nunito', sans-serif; letter-spacing: 0.04em; transition: all 0.2s; margin-top: 4px; box-shadow: 0 4px 20px rgba(2,119,189,0.4); }
  .ag-btn-student:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(2,119,189,0.5); }

  .ag-diff-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: rgba(224,247,250,0.35); font-family: 'Nunito', sans-serif; font-weight: 700; text-decoration: underline; margin-top: 10px; display: block; transition: color 0.15s; }
  .ag-diff-btn:hover { color: #4fc3f7; }
  .ag-error { font-size: 12px; color: #ff8a80; font-weight: 700; margin-bottom: 8px; padding: 7px 12px; background: rgba(255,138,128,0.08); border-radius: 8px; border: 1px solid rgba(255,138,128,0.2); }

  @media (max-width: 640px) {
    .ag-globe-svg { width: clamp(280px, 90vw, 400px); height: clamp(280px, 90vw, 400px); }
    .ag-card-wrap { margin-top: clamp(220px, 78vw, 340px); }
    .ag-card { padding: 22px 18px 20px; }
  }
`;

function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const stars = Array.from({ length: 320 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.2, a: Math.random() * 0.8 + 0.2, phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.005 + 0.001 }));
    const shoots: any[] = [];
    let f = 0;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = f * 0.015;
      stars.forEach(s => {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(t * s.speed * 8 + s.phase));
        ctx.beginPath(); ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a * s.a})`; ctx.fill();
      });
      if (Math.random() < 0.003) shoots.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * 0.5, vx: 5 + Math.random() * 5, vy: 1.5 + Math.random() * 2, life: 0, max: 35 + Math.random() * 25 });
      shoots.forEach((s, i) => {
        const p = s.life / s.max, a = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 7, s.y - s.vy * 7);
        g.addColorStop(0, `rgba(255,255,255,${a * 0.85})`); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 7, s.y - s.vy * 7);
        ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
        s.x += s.vx; s.y += s.vy; s.life++;
        if (s.life >= s.max) shoots.splice(i, 1);
      });
      f++; requestAnimationFrame(draw);
    }
    draw();
    return () => window.removeEventListener("resize", resize);
  }, []);
  return <canvas ref={ref} className="ag-canvas" />;
}

function RotatingGlobe() {
  return (
    <div className="ag-globe-wrap">
      <svg className="ag-globe-svg" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="gc"><circle cx="250" cy="250" r="228"/></clipPath>
          <radialGradient id="og" cx="38%" cy="33%">
            <stop offset="0%" stopColor="#1e7cb8"/>
            <stop offset="35%" stopColor="#0d5490"/>
            <stop offset="70%" stopColor="#073a6a"/>
            <stop offset="100%" stopColor="#021e42"/>
          </radialGradient>
          <radialGradient id="sg" cx="30%" cy="26%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)"/>
            <stop offset="50%" stopColor="rgba(255,255,255,0.04)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
          </radialGradient>
          <radialGradient id="eg" cx="50%" cy="50%">
            <stop offset="58%" stopColor="rgba(0,0,0,0)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.6)"/>
          </radialGradient>
        </defs>

        {/* Ocean */}
        <circle cx="250" cy="250" r="230" fill="url(#og)"/>

        {/* Continents — scrolling */}
        <g clipPath="url(#gc)">
          <g style={{animation:"globeSpin 20s linear infinite"}}>
            {[0,500].map(dx=>(
              <g key={dx} transform={`translate(${dx-250},30)`}>
                {/* Africa */}
                <path fill="#3d7a35" opacity="0.93" d="M265,95 L282,90 L294,100 L298,118 L296,138 L303,155 L305,175 L300,195 L292,212 L282,228 L270,238 L256,235 L246,222 L242,206 L245,188 L250,172 L247,155 L241,140 L238,122 L242,106 L252,97Z"/>
                {/* Madagascar */}
                <path fill="#4a8a3e" opacity="0.85" d="M300,190 L308,185 L312,198 L308,215 L299,218 L295,205Z"/>
                {/* Europe */}
                <path fill="#4f8844" opacity="0.88" d="M215,42 L232,36 L248,40 L256,52 L250,64 L236,68 L220,62 L212,52ZM236,68 L254,64 L263,75 L258,88 L244,90 L232,82 L228,70Z"/>
                {/* Scandinavia */}
                <path fill="#558844" opacity="0.82" d="M228,20 L236,16 L242,24 L238,36 L228,36 L222,28Z"/>
                {/* Asia */}
                <path fill="#4a7c3a" opacity="0.91" d="M290,22 L340,16 L378,24 L400,38 L408,56 L400,72 L382,82 L358,86 L332,80 L308,72 L294,58 L288,40ZM340,82 L368,86 L385,100 L382,118 L365,124 L346,118 L338,104ZM380,108 L395,112 L400,128 L390,138 L375,135 L368,120Z"/>
                {/* India */}
                <path fill="#4d8040" opacity="0.88" d="M330,100 L346,98 L355,112 L350,135 L338,148 L325,142 L318,125 L322,110Z"/>
                {/* North America */}
                <path fill="#528644" opacity="0.88" d="M52,28 L88,22 L118,28 L132,46 L128,66 L112,80 L90,88 L66,82 L48,68 L42,50ZM90,88 L112,92 L118,110 L106,125 L88,128 L76,116 L80,100Z"/>
                {/* Greenland */}
                <path fill="#6a9e58" opacity="0.72" d="M148,8 L170,5 L182,14 L178,30 L160,34 L146,24Z"/>
                {/* South America */}
                <path fill="#4d8040" opacity="0.89" d="M105,128 L126,122 L140,132 L144,152 L140,172 L130,190 L116,202 L100,196 L92,180 L94,160 L100,144Z"/>
                {/* Australia */}
                <path fill="#5c8a48" opacity="0.86" d="M374,162 L406,156 L424,168 L426,188 L414,203 L394,207 L374,198 L366,182ZM414,208 L424,210 L422,224 L412,226 L406,216Z"/>
                {/* Japan */}
                <path fill="#558a46" opacity="0.8" d="M400,68 L408,64 L414,72 L410,82 L402,82Z"/>
                {/* UK */}
                <path fill="#508840" opacity="0.78" d="M202,38 L210,34 L216,42 L210,50 L202,48Z"/>
                {/* Clouds */}
                <ellipse cx="180" cy="55" rx="30" ry="9" fill="rgba(255,255,255,0.16)"/>
                <ellipse cx="320" cy="40" rx="24" ry="7" fill="rgba(255,255,255,0.13)"/>
                <ellipse cx="130" cy="135" rx="20" ry="6" fill="rgba(255,255,255,0.11)"/>
                <ellipse cx="385" cy="145" rx="28" ry="8" fill="rgba(255,255,255,0.14)"/>
                <ellipse cx="245" cy="195" rx="32" ry="8" fill="rgba(255,255,255,0.09)"/>
                <ellipse cx="68" cy="90" rx="22" ry="6" fill="rgba(255,255,255,0.12)"/>
                {/* Ice caps */}
                <ellipse cx="250" cy="8" rx="80" ry="18" fill="rgba(200,235,255,0.55)"/>
                <ellipse cx="250" cy="462" rx="120" ry="20" fill="rgba(200,235,255,0.45)"/>
              </g>
            ))}
          </g>
        </g>

        {/* Shine */}
        <circle cx="250" cy="250" r="228" fill="url(#sg)" clipPath="url(#gc)"/>
        {/* Edge dark */}
        <circle cx="250" cy="250" r="228" fill="url(#eg)" clipPath="url(#gc)"/>
        {/* Atmosphere glow */}
        <circle cx="250" cy="250" r="232" fill="none" stroke="rgba(120,210,255,0.28)" strokeWidth="7"/>
        <circle cx="250" cy="250" r="240" fill="none" stroke="rgba(79,195,247,0.1)" strokeWidth="12"/>
      </svg>
    </div>
  );
}

export default function AccessGate({ onSuccess }: { onSuccess: () => void }) {
  const [savedStudent, setSavedStudent] = useState<{name:string;class:string}|null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [name, setName]   = useState("");
  const [cls, setCls]     = useState("");
  const [code, setCode]   = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      if (s?.name && s?.class) setSavedStudent(s);
    } catch {}
  }, []);

  function continueAsSaved() { grantAccess(); onSuccess(); }

  function submitStudent() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!cls)         { setError("Please select your class."); return; }
    if (code !== "0330") { setError("Invalid access code."); return; }
    localStorage.setItem("shauri_student", JSON.stringify({ name: name.trim(), class: cls, board: "CBSE" }));
    grantAccess(); onSuccess();
  }

  return (
    <>
      <style>{styles}</style>
      <div className="ag-root">
        <Starfield />
        <div className="ag-atmosphere" />
        <div className="ag-orbit" />
        <RotatingGlobe />

        <div className="ag-wordmark">
          <div className="ag-wordmark-text">SHAURI</div>
          <div className="ag-wordmark-sub">CBSE · Adaptive · AI-Powered</div>
        </div>

        <div className="ag-card-wrap">
          <div className="ag-card">
            <div className="ag-badge">🚀 Student Login</div>

            {savedStudent && !showForm ? (
              <>
                <h2 className="ag-title">Welcome back,<br />{savedStudent.name.split(" ")[0]}!</h2>
                <p className="ag-sub">Continue your journey from where you left off.</p>
                <div className="ag-profile-card" onClick={continueAsSaved}>
                  <div className="ag-avatar">{savedStudent.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="ag-profile-name">{savedStudent.name}</div>
                    <div className="ag-profile-class">Class {savedStudent.class} · CBSE</div>
                  </div>
                  <span className="ag-profile-arrow">→</span>
                </div>
                <div className="ag-or-divider">
                  <div className="ag-or-line"/><span className="ag-or-text">or</span><div className="ag-or-line"/>
                </div>
                <button className="ag-diff-btn" onClick={() => setShowForm(true)}>Sign in as a different student</button>
              </>
            ) : (
              <>
                <h2 className="ag-title">Begin your<br />ascent</h2>
                <p className="ag-sub">Your AI tutor, exams & progress — all in one place.</p>
                <div className="ag-field">
                  <label className="ag-label">Your Name</label>
                  <input className="ag-input" placeholder="e.g. Arjun Sharma" value={name}
                    onChange={e => { setName(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && submitStudent()} />
                </div>
                <div className="ag-row ag-field">
                  <div>
                    <label className="ag-label">Class</label>
                    <select className="ag-input ag-select" value={cls} onChange={e => { setCls(e.target.value); setError(""); }}>
                      <option value="">Select</option>
                      {[6,7,8,9,10,11,12].map(c => <option key={c} value={String(c)}>Class {c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="ag-label">Access Code</label>
                    <input className="ag-input" placeholder="••••" type="password" value={code}
                      onChange={e => { setCode(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && submitStudent()} />
                  </div>
                </div>
                {error && <div className="ag-error">⚠ {error}</div>}
                <button className="ag-btn-student" onClick={submitStudent}>Enter Shauri →</button>
                {showForm && <button className="ag-diff-btn" onClick={() => { setShowForm(false); setError(""); }}>← Back</button>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}