"use client";

import { useState, useEffect, useRef } from "react";
import { grantAccess } from "../lib/session";

// ── Warp animation keyframes injected once ─────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Orbitron:wght@600;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .ag-root {
    min-height: 100dvh; width: 100%;
    background: #020818; font-family: 'Nunito', sans-serif;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; align-items: center;
  }
  .ag-canvas { position: absolute; inset: 0; z-index: 0; pointer-events: none; }

  /* ── Globe wrapper ── */
  .ag-scene {
    position: absolute; inset: 0; z-index: 1; pointer-events: none;
    display: flex; align-items: center; justify-content: center;
  }
  .ag-globe-group {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0s, filter 0s;
  }
  .ag-globe-group.warping {
    animation: warpZoom 1.6s cubic-bezier(0.4,0,0.2,1) forwards;
  }
  @keyframes warpZoom {
    0%   { transform: scale(1);    filter: brightness(1); }
    40%  { transform: scale(1.18); filter: brightness(1.3); }
    75%  { transform: scale(3.5);  filter: brightness(2.2) blur(2px); }
    100% { transform: scale(12);   filter: brightness(5) blur(8px); }
  }

  .ag-globe-svg {
    width: clamp(380px, 62vw, 740px);
    height: clamp(380px, 62vw, 740px);
    filter: drop-shadow(0 0 50px rgba(79,195,247,0.35)) drop-shadow(0 0 110px rgba(79,195,247,0.14));
    animation: globeGlow 6s ease-in-out infinite;
  }
  @keyframes globeGlow {
    0%,100% { filter: drop-shadow(0 0 50px rgba(79,195,247,0.28)) drop-shadow(0 0 100px rgba(79,195,247,0.1)); }
    50%      { filter: drop-shadow(0 0 80px rgba(79,195,247,0.5)) drop-shadow(0 0 160px rgba(79,195,247,0.22)); }
  }
  @keyframes globeSpin { from { transform: translateX(0); } to { transform: translateX(-50%); } }

  /* atmosphere */
  .ag-atm {
    position: absolute;
    width: clamp(430px, 70vw, 820px);
    height: clamp(430px, 70vw, 820px);
    border-radius: 50%;
    background: radial-gradient(circle, transparent 45%, rgba(79,195,247,0.05) 58%, rgba(79,195,247,0.12) 68%, transparent 78%);
    animation: atmPulse 5s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes atmPulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.03)} }

  /* orbit ring */
  .ag-orbit {
    position: absolute;
    width: clamp(460px, 76vw, 880px);
    height: clamp(460px, 76vw, 880px);
    border-radius: 50%;
    border: 1px solid rgba(100,200,255,0.13);
    animation: orbitSpin 26s linear infinite;
  }
  .ag-orbit::before { content:'🛰️'; position:absolute; top:-14px; left:50%; transform:translateX(-50%); font-size:18px; filter:drop-shadow(0 0 8px rgba(100,200,255,0.9)); }
  @keyframes orbitSpin { from{transform:rotateX(72deg) rotate(0deg)} to{transform:rotateX(72deg) rotate(360deg)} }

  /* ── Wordmark ── */
  .ag-wordmark {
    position: absolute; top: 32px; left: 50%; transform: translateX(-50%);
    z-index: 10; text-align: center; pointer-events: none;
  }
  .ag-wordmark-text {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(20px, 2.8vw, 28px);
    font-weight: 900; letter-spacing: 0.5em;
    color: rgba(255,215,0,0.93);
    text-shadow: 0 0 28px rgba(255,215,0,0.45);
  }
  .ag-wordmark-sub { font-size: 10px; letter-spacing: 0.22em; color: rgba(255,255,255,0.28); font-weight: 700; text-transform: uppercase; margin-top: 4px; }

  /* ── Login card — overlaps bottom of globe ── */
  .ag-card-wrap {
    position: relative; z-index: 10;
    width: 100%; display: flex; justify-content: center;
    padding: 0 20px 48px;
    margin-top: clamp(200px, 32vw, 420px);
  }
  .ag-card {
    width: 100%; max-width: 390px;
    background: rgba(2, 10, 36, 0.88);
    border: 1px solid rgba(79,195,247,0.2);
    border-radius: 24px; padding: 28px 28px 24px;
    backdrop-filter: blur(24px);
    box-shadow: 0 8px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,195,247,0.06);
    transition: opacity 0.3s;
  }
  .ag-card.hidden { opacity: 0; pointer-events: none; }

  .ag-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 14px; background: rgba(79,195,247,0.1); color: #4fc3f7; border: 1px solid rgba(79,195,247,0.22); }
  .ag-title { font-family: 'Orbitron', sans-serif; font-size: clamp(22px, 3vw, 28px); font-weight: 900; line-height: 1.25; color: #e0f7fa; margin-bottom: 8px; }
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
  .ag-btn-student:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(2,119,189,0.5); }
  .ag-btn-student:disabled { opacity: 0.7; cursor: not-allowed; }

  .ag-diff-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: rgba(224,247,250,0.35); font-family: 'Nunito', sans-serif; font-weight: 700; text-decoration: underline; margin-top: 10px; display: block; transition: color 0.15s; }
  .ag-diff-btn:hover { color: #4fc3f7; }
  .ag-error { font-size: 12px; color: #ff8a80; font-weight: 700; margin-bottom: 8px; padding: 7px 12px; background: rgba(255,138,128,0.08); border-radius: 8px; border: 1px solid rgba(255,138,128,0.2); }

  /* warp flash overlay */
  .ag-warp-flash {
    position: fixed; inset: 0; z-index: 100;
    background: radial-gradient(circle, #a8e6ff 0%, #4fc3f7 30%, #0277bd 60%, #020818 100%);
    opacity: 0; pointer-events: none;
    transition: opacity 0.3s;
  }
  .ag-warp-flash.active { opacity: 1; }

  @media (max-width: 640px) {
    .ag-globe-svg { width: clamp(300px, 94vw, 420px); height: clamp(300px, 94vw, 420px); }
    .ag-card-wrap { margin-top: clamp(200px, 72vw, 310px); }
  }
`;

// ── Starfield ──────────────────────────────────────────────────
function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize(); addEventListener("resize", resize);
    const stars = Array.from({ length: 320 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.2, a: Math.random() * 0.7 + 0.15, phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.005 + 0.001 }));
    const shoots: any[] = [];
    let f = 0;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = f * 0.015;
      stars.forEach(s => {
        const a = 0.2 + 0.8 * Math.abs(Math.sin(t * s.speed * 8 + s.phase));
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
    return () => removeEventListener("resize", resize);
  }, []);
  return <canvas ref={ref} className="ag-canvas" />;
}

// ── Realistic Rotating Globe ───────────────────────────────────
function Globe() {
  return (
    <svg className="ag-globe-svg" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="gc"><circle cx="250" cy="250" r="228"/></clipPath>
        {/* Deep realistic ocean */}
        <radialGradient id="og" cx="36%" cy="30%">
          <stop offset="0%"   stopColor="#1a6e9e"/>
          <stop offset="30%"  stopColor="#0d4f7a"/>
          <stop offset="65%"  stopColor="#073460"/>
          <stop offset="100%" stopColor="#021b3a"/>
        </radialGradient>
        {/* Specular highlight */}
        <radialGradient id="sg" cx="28%" cy="24%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.22)"/>
          <stop offset="45%"  stopColor="rgba(255,255,255,0.05)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
        {/* Edge vignette */}
        <radialGradient id="eg" cx="50%" cy="50%">
          <stop offset="55%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.65)"/>
        </radialGradient>
        {/* Atmosphere glow */}
        <radialGradient id="ag2" cx="50%" cy="50%">
          <stop offset="82%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="92%" stopColor="rgba(100,200,255,0.18)"/>
          <stop offset="100%" stopColor="rgba(79,195,247,0.05)"/>
        </radialGradient>
      </defs>

      {/* Ocean */}
      <circle cx="250" cy="250" r="230" fill="url(#og)"/>

      {/* Scrolling land layer */}
      <g clipPath="url(#gc)">
        <g style={{animation:"globeSpin 22s linear infinite", willChange:"transform"}}>
          {[0, 500].map(dx => (
            <g key={dx} transform={`translate(${dx - 250}, 28)`}>

              {/* ── AFRICA — recognisable horn, gulf of guinea, cape ── */}
              <path fill="#7a6535" opacity="0.95" d="
                M258,82 L272,78 L285,82 L293,92 L296,106 L294,120
                L300,135 L303,152 L301,168 L296,182 L300,196
                L298,212 L290,226 L278,238 L264,244 L250,242
                L238,234 L230,220 L228,206 L232,192 L238,178
                L235,164 L230,150 L228,136 L230,120 L236,106
                L242,94 Z
              "/>
              {/* Sahara lighter overlay */}
              <path fill="#c4a45a" opacity="0.55" d="M232,82 L292,82 L296,106 L294,120 L230,120 L236,106Z"/>
              {/* Madagascar */}
              <path fill="#6e7a40" opacity="0.9" d="M303,188 L312,182 L318,192 L316,210 L308,218 L300,212 L298,198Z"/>
              {/* Horn of Africa */}
              <path fill="#8a7040" opacity="0.9" d="M298,168 L310,162 L318,170 L312,180 L300,182Z"/>

              {/* ── EUROPE ── */}
              <path fill="#5a7a42" opacity="0.88" d="
                M208,36 L226,30 L244,34 L254,46 L250,60 L238,66
                L222,64 L210,54 Z
              "/>
              {/* Iberian */}
              <path fill="#7a7a40" opacity="0.85" d="M202,56 L216,52 L220,64 L212,72 L200,66Z"/>
              {/* Italy boot shape */}
              <path fill="#6a7a42" opacity="0.82" d="M238,66 L246,64 L250,76 L248,90 L240,94 L234,82 L232,70Z"/>
              {/* Scandinavia */}
              <path fill="#4a7a3a" opacity="0.82" d="M224,14 L236,10 L244,18 L240,34 L228,36 L218,26Z"/>
              <path fill="#4a7a3a" opacity="0.78" d="M240,10 L250,8 L254,18 L248,28 L238,26Z"/>
              {/* UK */}
              <path fill="#527842" opacity="0.8" d="M196,32 L206,28 L212,36 L206,46 L196,42Z"/>

              {/* ── ASIA — India, SE Asia, China proper ── */}
              <path fill="#5a6e3a" opacity="0.92" d="
                M280,22 L330,16 L374,20 L400,34 L410,50
                L406,68 L390,80 L366,86 L340,82 L316,74
                L298,62 L286,46 Z
              "/>
              {/* Central Asia steppes — sandy */}
              <path fill="#b09a56" opacity="0.5" d="M300,30 L370,24 L390,38 L386,54 L310,56 L294,44Z"/>
              {/* India subcontinent */}
              <path fill="#7a7040" opacity="0.92" d="
                M322,82 L342,78 L356,88 L358,108 L350,130
                L338,148 L322,154 L308,144 L304,124 L308,104Z
              "/>
              {/* Sri Lanka */}
              <path fill="#6a7a38" opacity="0.85" d="M334,158 L340,154 L344,162 L338,170 L330,166Z"/>
              {/* SE Asia peninsula */}
              <path fill="#4e7a38" opacity="0.88" d="M370,86 L390,82 L396,96 L388,114 L374,118 L364,106 L366,92Z"/>
              {/* China-ish eastward */}
              <path fill="#527840" opacity="0.88" d="M390,62 L416,56 L424,70 L418,86 L400,90 L386,82Z"/>
              {/* Japan */}
              <path fill="#4e7840" opacity="0.82" d="M416,60 L424,54 L430,62 L426,74 L416,74Z"/>
              <path fill="#4e7840" opacity="0.78" d="M424,46 L430,42 L436,50 L430,58 L422,54Z"/>
              {/* Arabian peninsula */}
              <path fill="#c4a448" opacity="0.85" d="M294,78 L314,74 L320,84 L314,104 L298,108 L290,94Z"/>

              {/* ── NORTH AMERICA ── */}
              <path fill="#5a7a42" opacity="0.9" d="
                M44,24 L82,18 L116,22 L134,38 L132,58 L118,74
                L96,84 L70,80 L48,66 L36,48 Z
              "/>
              {/* Rockies/desert SW — sandy */}
              <path fill="#b09656" opacity="0.45" d="M80,52 L112,46 L118,62 L104,72 L76,68Z"/>
              {/* Florida */}
              <path fill="#5a7a42" opacity="0.85" d="M112,78 L118,76 L120,88 L112,96 L106,88Z"/>
              {/* Greenland */}
              <path fill="#c8dce8" opacity="0.72" d="M142,6 L168,2 L182,12 L178,28 L158,34 L140,22Z"/>
              {/* Alaska */}
              <path fill="#4e7838" opacity="0.85" d="M28,20 L48,14 L56,22 L50,34 L32,34Z"/>
              {/* Cuba/Caribbean */}
              <path fill="#5a7a42" opacity="0.8" d="M110,96 L126,92 L130,100 L120,106 L108,104Z"/>

              {/* ── SOUTH AMERICA ── */}
              <path fill="#527a3e" opacity="0.92" d="
                M96,122 L120,116 L136,124 L142,142 L140,162
                L132,182 L120,200 L104,210 L88,204 L78,188
                L78,168 L84,148 L90,134Z
              "/>
              {/* Amazon basin — darker green */}
              <path fill="#3a6830" opacity="0.6" d="M88,138 L128,132 L134,152 L120,168 L84,160Z"/>
              {/* Andes ridge — grey-brown */}
              <path fill="#7a6a50" opacity="0.5" d="M82,130 L92,126 L96,200 L84,198 L76,170Z"/>
              {/* Patagonia */}
              <path fill="#7a7858" opacity="0.75" d="M92,196 L108,194 L112,216 L100,228 L86,218 L88,204Z"/>

              {/* ── AUSTRALIA ── */}
              <path fill="#a07840" opacity="0.92" d="
                M368,158 L404,152 L424,162 L428,180 L420,200
                L402,210 L380,212 L362,200 L356,182 Z
              "/>
              {/* Outback centre — red-ochre */}
              <path fill="#c07840" opacity="0.55" d="M372,164 L410,160 L418,178 L406,196 L370,192 L360,176Z"/>
              {/* New Zealand */}
              <path fill="#5a7a42" opacity="0.82" d="M430,196 L438,190 L444,200 L438,214 L428,210Z"/>
              <path fill="#5a7a42" opacity="0.78" d="M436,178 L442,172 L448,180 L444,192 L434,190Z"/>

              {/* ── ANTARCTICA ── */}
              <ellipse cx="250" cy="462" rx="130" ry="22" fill="rgba(210,235,255,0.5)"/>

              {/* ── ICE CAPS ── */}
              <ellipse cx="250" cy="6" rx="90" ry="20" fill="rgba(210,235,255,0.6)"/>

              {/* ── CLOUD WISPS ── */}
              <ellipse cx="170" cy="52" rx="34" ry="10" fill="rgba(255,255,255,0.15)"/>
              <ellipse cx="316" cy="38" rx="26" ry="8"  fill="rgba(255,255,255,0.12)"/>
              <ellipse cx="124" cy="132" rx="22" ry="6" fill="rgba(255,255,255,0.11)"/>
              <ellipse cx="386" cy="142" rx="30" ry="9" fill="rgba(255,255,255,0.13)"/>
              <ellipse cx="248" cy="198" rx="36" ry="9" fill="rgba(255,255,255,0.09)"/>
              <ellipse cx="60" cy="88" rx="24" ry="7"   fill="rgba(255,255,255,0.12)"/>
              <ellipse cx="340" cy="168" rx="20" ry="6" fill="rgba(255,255,255,0.1)"/>
            </g>
          ))}
        </g>
      </g>

      {/* Specular shine */}
      <circle cx="250" cy="250" r="228" fill="url(#sg)" clipPath="url(#gc)"/>
      {/* Edge darkening */}
      <circle cx="250" cy="250" r="228" fill="url(#eg)" clipPath="url(#gc)"/>
      {/* Atmosphere glow ring */}
      <circle cx="250" cy="250" r="228" fill="url(#ag2)"/>
      <circle cx="250" cy="250" r="234" fill="none" stroke="rgba(120,210,255,0.25)" strokeWidth="8"/>
      <circle cx="250" cy="250" r="242" fill="none" stroke="rgba(79,195,247,0.08)"  strokeWidth="14"/>
    </svg>
  );
}

// ── AccessGate ─────────────────────────────────────────────────
export default function AccessGate({ onSuccess }: { onSuccess: () => void }) {
  const [savedStudent, setSavedStudent] = useState<{name:string;class:string}|null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [name, setName]   = useState("");
  const [cls, setCls]     = useState("");
  const [code, setCode]   = useState("");
  const [error, setError] = useState("");
  const [warping, setWarping]   = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      if (s?.name && s?.class) setSavedStudent(s);
    } catch {}
  }, []);

  function continueAsSaved() {
    grantAccess();
    triggerWarp(() => onSuccess());
  }

  function submitStudent() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!cls)         { setError("Please select your class."); return; }
    if (code !== "0330") { setError("Invalid access code."); return; }
    localStorage.setItem("shauri_student", JSON.stringify({ name: name.trim(), class: cls, board: "CBSE" }));
    grantAccess();
    triggerWarp(() => onSuccess());
  }

  function triggerWarp(cb: () => void) {
    setWarping(true);
    // Flash white at peak of zoom
    setTimeout(() => setFlashing(true), 1100);
    // Navigate after flash
    setTimeout(() => { setFlashing(false); cb(); }, 1600);
  }

  return (
    <>
      <style>{styles}</style>

      {/* Warp flash overlay */}
      <div className={`ag-warp-flash ${flashing ? "active" : ""}`} />

      <div className="ag-root">
        <Starfield />

        {/* Globe scene — centered absolutely */}
        <div className="ag-scene">
          <div className={`ag-globe-group ${warping ? "warping" : ""}`}>
            <div className="ag-atm" />
            <div className="ag-orbit" />
            <Globe />
          </div>
        </div>

        {/* Wordmark */}
        <div className="ag-wordmark">
          <div className="ag-wordmark-text">SHAURI</div>
          <div className="ag-wordmark-sub">CBSE · Adaptive · AI-Powered</div>
        </div>

        {/* Login card */}
        <div className="ag-card-wrap">
          <div className={`ag-card ${warping ? "hidden" : ""}`}>
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
                <button className="ag-btn-student" onClick={submitStudent} disabled={warping}>
                  {warping ? "Launching…" : "Enter Shauri →"}
                </button>
                {showForm && <button className="ag-diff-btn" onClick={() => { setShowForm(false); setError(""); }}>← Back</button>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}