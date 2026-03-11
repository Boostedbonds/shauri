"use client";

import { useState, useEffect, useRef } from "react";
import { grantAccess } from "../lib/session";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Orbitron:wght@600;700;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  .ag-root {
    min-height: 100dvh; width: 100%;
    background: #000008; font-family: 'Nunito', sans-serif;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; align-items: center;
  }
  .ag-canvas { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
  .ag-warp-canvas { position: fixed; inset: 0; z-index: 50; pointer-events: none; opacity: 0; transition: opacity 0.1s; }
  .ag-warp-canvas.active { opacity: 1; }

  .ag-wordmark {
    position: relative; z-index: 10; text-align: center;
    padding-top: clamp(28px, 4vw, 44px);
    pointer-events: none;
  }
  .ag-wordmark-text {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(22px, 3vw, 30px);
    font-weight: 900; letter-spacing: 0.5em;
    color: rgba(255,215,0,0.95);
    text-shadow: 0 0 30px rgba(255,215,0,0.5), 0 0 60px rgba(255,215,0,0.2);
  }
  .ag-wordmark-sub { font-size: 10px; letter-spacing: 0.24em; color: rgba(255,255,255,0.3); font-weight: 700; text-transform: uppercase; margin-top: 4px; }

  .ag-portal-wrap {
    position: relative; z-index: 5; pointer-events: none;
    width: clamp(320px, 56vw, 640px);
    height: clamp(320px, 56vw, 640px);
    margin-top: clamp(-40px, -3vw, -60px);
    flex-shrink: 0;
  }
  .ag-portal-canvas { width: 100%; height: 100%; display: block; }

  .ag-card-wrap {
    position: relative; z-index: 10;
    width: 100%; display: flex; justify-content: center;
    padding: 0 20px 48px;
    margin-top: clamp(-80px, -8vw, -120px);
  }
  .ag-card {
    width: 100%; max-width: 390px;
    background: rgba(2, 4, 28, 0.9);
    border: 1px solid rgba(130,80,255,0.3);
    border-radius: 24px; padding: 28px 28px 24px;
    backdrop-filter: blur(28px);
    box-shadow: 0 8px 60px rgba(0,0,0,0.7), 0 0 40px rgba(100,50,255,0.08);
    transition: opacity 0.4s, transform 0.4s;
  }
  .ag-card.warping { opacity: 0; transform: scale(0.92); pointer-events: none; }

  .ag-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 14px; background: rgba(130,80,255,0.12); color: #b084ff; border: 1px solid rgba(130,80,255,0.28); }
  .ag-title { font-family: 'Orbitron', sans-serif; font-size: clamp(22px, 3vw, 28px); font-weight: 900; line-height: 1.25; color: #e8e0ff; margin-bottom: 8px; }
  .ag-sub { font-size: 13px; line-height: 1.6; margin-bottom: 20px; font-weight: 600; color: rgba(180,160,255,0.75); }

  .ag-profile-card { display: flex; align-items: center; gap: 12px; padding: 13px 15px; background: rgba(130,80,255,0.07); border: 1.5px solid rgba(130,80,255,0.22); border-radius: 14px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
  .ag-profile-card:hover { background: rgba(130,80,255,0.15); border-color: rgba(130,80,255,0.45); transform: translateY(-1px); }
  .ag-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8250ff, #b084ff); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: #fff; flex-shrink: 0; }
  .ag-profile-name { font-size: 14px; font-weight: 800; color: #e8e0ff; }
  .ag-profile-class { font-size: 11px; color: rgba(180,160,255,0.6); margin-top: 1px; }
  .ag-profile-arrow { margin-left: auto; font-size: 16px; color: #b084ff; }

  .ag-or-divider { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .ag-or-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
  .ag-or-text { font-size: 10px; color: rgba(255,255,255,0.22); font-weight: 700; letter-spacing: 0.1em; }

  .ag-field { margin-bottom: 11px; }
  .ag-label { display: block; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 5px; color: rgba(200,180,255,0.5); }
  .ag-input { width: 100%; padding: 10px 13px; background: rgba(255,255,255,0.04); border: 1.5px solid rgba(130,80,255,0.2); border-radius: 10px; color: #e8e0ff; font-size: 14px; font-family: 'Nunito', sans-serif; outline: none; transition: all 0.2s; }
  .ag-input:focus { border-color: rgba(130,80,255,0.6); background: rgba(130,80,255,0.07); box-shadow: 0 0 0 3px rgba(130,80,255,0.12); }
  .ag-input::placeholder { color: rgba(200,180,255,0.2); }
  .ag-select { appearance: none; cursor: pointer; background: #08041e !important; color: #e8e0ff !important; }
  .ag-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  .ag-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, #5a20cc, #8250ff); color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; font-family: 'Nunito', sans-serif; letter-spacing: 0.04em; transition: all 0.2s; margin-top: 4px; box-shadow: 0 4px 24px rgba(130,80,255,0.45); }
  .ag-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(130,80,255,0.6); }
  .ag-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .ag-diff-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: rgba(200,180,255,0.3); font-family: 'Nunito', sans-serif; font-weight: 700; text-decoration: underline; margin-top: 10px; display: block; transition: color 0.15s; }
  .ag-diff-btn:hover { color: #b084ff; }
  .ag-error { font-size: 12px; color: #ff8a80; font-weight: 700; margin-bottom: 8px; padding: 7px 12px; background: rgba(255,138,128,0.07); border-radius: 8px; border: 1px solid rgba(255,138,128,0.18); }

  @media (max-width: 640px) {
    .ag-portal-wrap { width: clamp(280px, 90vw, 380px); height: clamp(280px, 90vw, 380px); margin-top: -20px; }
    .ag-card-wrap { margin-top: clamp(-60px,-6vw,-80px); }
  }
`;

// ── Galaxy + Nebula background ─────────────────────────────────
function GalaxyCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize(); addEventListener("resize", resize);

    // Stars
    const stars = Array.from({ length: 420 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5 + 0.2,
      a: Math.random() * 0.9 + 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.004 + 0.001,
      hue: Math.random() < 0.15 ? `${180 + Math.random()*80}` : "255",
    }));

    // Nebula clouds — pre-defined positions
    const nebulae = [
      { x: 0.12, y: 0.18, rx: 0.22, ry: 0.14, color: "rgba(80,20,160,0.12)" },
      { x: 0.78, y: 0.25, rx: 0.18, ry: 0.20, color: "rgba(20,60,160,0.10)" },
      { x: 0.55, y: 0.75, rx: 0.25, ry: 0.15, color: "rgba(120,10,140,0.09)" },
      { x: 0.22, y: 0.72, rx: 0.16, ry: 0.18, color: "rgba(10,80,180,0.08)" },
      { x: 0.88, y: 0.70, rx: 0.14, ry: 0.16, color: "rgba(90,0,180,0.11)" },
    ];

    const shoots: any[] = [];
    let f = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw nebulae
      nebulae.forEach(n => {
        const grd = ctx.createRadialGradient(
          n.x * canvas.width, n.y * canvas.height, 0,
          n.x * canvas.width, n.y * canvas.height, n.rx * canvas.width
        );
        grd.addColorStop(0, n.color);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.ellipse(n.x * canvas.width, n.y * canvas.height, n.rx * canvas.width, n.ry * canvas.height, 0, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      });

      // Stars
      const t = f * 0.015;
      stars.forEach(s => {
        const a = 0.2 + 0.8 * Math.abs(Math.sin(t * s.speed * 8 + s.phase));
        ctx.beginPath(); ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue},80%,95%,${a * s.a})`; ctx.fill();
      });

      // Shooting stars
      if (Math.random() < 0.004) shoots.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * 0.6, vx: 4 + Math.random() * 6, vy: 1 + Math.random() * 3, life: 0, max: 30 + Math.random() * 30 });
      shoots.forEach((s, i) => {
        const p = s.life / s.max, a = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 8, s.y - s.vy * 8);
        g.addColorStop(0, `rgba(200,160,255,${a * 0.9})`); g.addColorStop(1, "rgba(200,160,255,0)");
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 8, s.y - s.vy * 8);
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

// ── Wormhole Portal Canvas ─────────────────────────────────────
function PortalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let f = 0;
    const W = 600; const H = 600;
    canvas.width = W; canvas.height = H;
    const cx = W / 2; const cy = H / 2;

    // Arc particles around the ring
    const particles = Array.from({ length: 120 }, (_, i) => ({
      angle: (i / 120) * Math.PI * 2,
      r: 180 + (Math.random() - 0.5) * 28,
      speed: (0.004 + Math.random() * 0.006) * (Math.random() < 0.5 ? 1 : -1),
      size: Math.random() * 2.5 + 0.8,
      brightness: Math.random() * 0.6 + 0.4,
      hue: 260 + Math.random() * 80,
    }));

    // Electric arc points
    const arcSegs = 48;

    function drawArc(radius: number, roughness: number, color: string, width: number, offset: number) {
      ctx.beginPath();
      for (let i = 0; i <= arcSegs; i++) {
        const a = (i / arcSegs) * Math.PI * 2 + offset;
        const jitter = (Math.random() - 0.5) * roughness;
        const r = radius + jitter;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const t = f * 0.018;

      // ── Dark void centre ──
      const voidGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 155);
      voidGrad.addColorStop(0, "rgba(0,0,8,1)");
      voidGrad.addColorStop(0.7, "rgba(4,0,20,0.95)");
      voidGrad.addColorStop(1, "rgba(20,0,60,0.4)");
      ctx.beginPath(); ctx.arc(cx, cy, 155, 0, Math.PI * 2);
      ctx.fillStyle = voidGrad; ctx.fill();

      // ── Gravitational lens rings ──
      for (let i = 5; i >= 1; i--) {
        const r = 120 + i * 8;
        const alpha = 0.03 + i * 0.015;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(160,100,255,${alpha})`; ctx.lineWidth = 2; ctx.stroke();
      }

      // ── Swirling energy streams inside void ──
      for (let s = 0; s < 6; s++) {
        const baseAngle = t * (s % 2 === 0 ? 0.7 : -0.5) + (s * Math.PI / 3);
        ctx.beginPath();
        for (let p = 0; p < 40; p++) {
          const frac = p / 40;
          const spiralAngle = baseAngle + frac * Math.PI * 1.4;
          const spiralR = frac * 130;
          const x = cx + Math.cos(spiralAngle) * spiralR;
          const y = cy + Math.sin(spiralAngle) * spiralR;
          p === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const streamAlpha = 0.12 + 0.08 * Math.sin(t + s);
        ctx.strokeStyle = `rgba(180,120,255,${streamAlpha})`; ctx.lineWidth = 1.2; ctx.stroke();
      }

      // ── Accretion disk glow ──
      for (let ring = 0; ring < 4; ring++) {
        const ringR = 158 + ring * 12;
        const ringAlpha = (0.18 - ring * 0.03) * (0.8 + 0.2 * Math.sin(t * 2 + ring));
        const ringGrad = ctx.createRadialGradient(cx, cy, ringR - 8, cx, cy, ringR + 8);
        ringGrad.addColorStop(0, `rgba(120,60,255,0)`);
        ringGrad.addColorStop(0.5, `rgba(160,80,255,${ringAlpha})`);
        ringGrad.addColorStop(1, `rgba(120,60,255,0)`);
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = ringGrad; ctx.lineWidth = 16; ctx.stroke();
      }

      // ── Electric arcs ──
      const arcPulse = 0.6 + 0.4 * Math.sin(t * 3);
      drawArc(178, 6 * arcPulse, `rgba(200,140,255,${0.5 * arcPulse})`, 1.5, t * 0.3);
      drawArc(184, 4 * arcPulse, `rgba(255,180,255,${0.3 * arcPulse})`, 1,   -t * 0.2);
      drawArc(172, 8 * arcPulse, `rgba(140,80,255,${0.35 * arcPulse})`, 2,    t * 0.5);

      // ── Ring particles ──
      particles.forEach(p => {
        p.angle += p.speed;
        const x = cx + Math.cos(p.angle) * p.r;
        const y = cy + Math.sin(p.angle) * p.r;
        const pa = p.brightness * (0.5 + 0.5 * Math.sin(t * 3 + p.angle * 4));
        ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},90%,80%,${pa})`; ctx.fill();
      });

      // ── Outer glow corona ──
      const coronaGrad = ctx.createRadialGradient(cx, cy, 175, cx, cy, 280);
      coronaGrad.addColorStop(0, `rgba(120,60,255,${0.14 + 0.06 * Math.sin(t)})`);
      coronaGrad.addColorStop(0.4, `rgba(80,20,200,0.06)`);
      coronaGrad.addColorStop(1, "rgba(40,0,120,0)");
      ctx.beginPath(); ctx.arc(cx, cy, 280, 0, Math.PI * 2);
      ctx.fillStyle = coronaGrad; ctx.fill();

      // ── Inner void depth lines ──
      for (let d = 0; d < 8; d++) {
        const da = (d / 8) * Math.PI * 2 + t * 0.15;
        const depth = 0.04 + 0.02 * Math.sin(t * 2 + d);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(da) * 140, cy + Math.sin(da) * 140);
        ctx.strokeStyle = `rgba(100,50,200,${depth})`; ctx.lineWidth = 1; ctx.stroke();
      }

      f++; requestAnimationFrame(draw);
    }
    draw();
  }, []);
  return <canvas ref={ref} className="ag-portal-canvas" />;
}

// ── Hyperspace Warp Canvas ─────────────────────────────────────
function WarpCanvas({ active, onDone }: { active: boolean; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    doneRef.current = false;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    canvas.width = innerWidth; canvas.height = innerHeight;
    const cx = canvas.width / 2; const cy = canvas.height / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy) * 1.4;

    // Create streaks from center
    const streaks = Array.from({ length: 280 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const startR = Math.random() * 60;
      return {
        angle, r: startR,
        speed: 4 + Math.random() * 8,
        length: 20 + Math.random() * 60,
        width: Math.random() * 1.5 + 0.3,
        hue: 240 + Math.random() * 100,
        alpha: 0.4 + Math.random() * 0.6,
      };
    });

    let frame = 0;
    const totalFrames = 55;

    function draw() {
      if (!ctx || !canvas) return;
      const progress = frame / totalFrames;
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Background — darkens then flares to white
      const bgAlpha = progress < 0.75 ? 0.25 : (progress - 0.75) / 0.25;
      ctx.fillStyle = progress < 0.75
        ? `rgba(0,0,8,${0.2 + progress * 0.3})`
        : `rgba(200,180,255,${bgAlpha * 0.9})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (progress < 0.85) {
        streaks.forEach(s => {
          s.r += s.speed * (1 + eased * 6);
          if (s.r > maxR) { s.r = Math.random() * 20; s.speed = 4 + Math.random() * 8; }
          const tailR = Math.max(0, s.r - s.length * (1 + eased * 3));
          const x1 = cx + Math.cos(s.angle) * s.r;
          const y1 = cy + Math.sin(s.angle) * s.r;
          const x2 = cx + Math.cos(s.angle) * tailR;
          const y2 = cy + Math.sin(s.angle) * tailR;
          const g = ctx.createLinearGradient(x2, y2, x1, y1);
          const streakAlpha = s.alpha * (progress < 0.1 ? progress * 10 : 1);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(0.6, `hsla(${s.hue},90%,85%,${streakAlpha * 0.4})`);
          g.addColorStop(1, `hsla(${s.hue},100%,95%,${streakAlpha})`);
          ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1);
          ctx.strokeStyle = g; ctx.lineWidth = s.width * (1 + eased * 2); ctx.stroke();
        });
      }

      // Final white flash
      if (progress >= 0.8) {
        const flashA = (progress - 0.8) / 0.2;
        ctx.fillStyle = `rgba(230,210,255,${flashA})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      frame++;
      if (frame < totalFrames) {
        requestAnimationFrame(draw);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    }
    draw();
  }, [active]);

  return <canvas ref={ref} className={`ag-warp-canvas ${active ? "active" : ""}`} />;
}

// ── AccessGate ─────────────────────────────────────────────────
export default function AccessGate({ onSuccess }: { onSuccess: () => void }) {
  const [savedStudent, setSavedStudent] = useState<{name:string;class:string}|null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [name, setName]   = useState("");
  const [cls, setCls]     = useState("");
  const [code, setCode]   = useState("");
  const [error, setError] = useState("");
  const [warping, setWarping] = useState(false);
  const cbRef = useRef<() => void>(() => {});

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      if (s?.name && s?.class) setSavedStudent(s);
    } catch {}
  }, []);

  function triggerWarp(cb: () => void) {
    cbRef.current = cb;
    setWarping(true);
  }

  function continueAsSaved() { grantAccess(); triggerWarp(() => onSuccess()); }

  function submitStudent() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!cls)         { setError("Please select your class."); return; }
    if (code !== "0330") { setError("Invalid access code."); return; }
    localStorage.setItem("shauri_student", JSON.stringify({ name: name.trim(), class: cls, board: "CBSE" }));
    grantAccess();
    triggerWarp(() => onSuccess());
  }

  return (
    <>
      <style>{styles}</style>
      <WarpCanvas active={warping} onDone={() => cbRef.current()} />

      <div className="ag-root">
        <GalaxyCanvas />

        <div className="ag-wordmark">
          <div className="ag-wordmark-text">SHAURI</div>
          <div className="ag-wordmark-sub">CBSE · Adaptive · AI-Powered</div>
        </div>

        <div className="ag-portal-wrap">
          <PortalCanvas />
        </div>

        <div className="ag-card-wrap">
          <div className={`ag-card ${warping ? "warping" : ""}`}>
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
                <button className="ag-btn" onClick={submitStudent} disabled={warping}>
                  {warping ? "Entering warp…" : "Enter Shauri →"}
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