// ============================================================
// /lib/lab/simulations/chemistryDrawing.ts
// Pure canvas drawing functions for chemistry simulations.
// No React, no UI coupling. Each function is keyed by experiment id.
// Called every animation frame — must be fast and stateless.
// ============================================================

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  step: number;
  t: number;          // 0→1 eased progress within current step
  isDark: boolean;
  tick: number;       // raw Date.now() for continuous animations
}

// ─────────────────────────────────────────────────────────────
// Easing + interpolation helpers
// ─────────────────────────────────────────────────────────────

function easeOut(x: number): number {
  return 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * easeOut(Math.min(t, 1));
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

// ─────────────────────────────────────────────────────────────
// Shared drawing primitives
// ─────────────────────────────────────────────────────────────

function drawFlame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  tick: number
): void {
  const flicker = 0.88 + Math.sin(tick * 0.011) * 0.12;
  const w = 10 * flicker;
  const h = height * flicker;

  // Outer flame — orange
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.45, w, h, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(251,146,60,0.92)";
  ctx.fill();

  // Inner flame — yellow
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.55, w * 0.55, h * 0.65, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(253,224,71,0.95)";
  ctx.fill();

  // Core — white
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.6, w * 0.22, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
}

function drawBunsenBurner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isDark: boolean
): void {
  // Base
  ctx.fillStyle = isDark ? "#1e293b" : "#64748b";
  ctx.beginPath();
  ctx.roundRect(x - 20, y, 40, 24, 3);
  ctx.fill();

  // Barrel
  ctx.fillStyle = isDark ? "#334155" : "#475569";
  ctx.beginPath();
  ctx.roundRect(x - 10, y - 26, 20, 30, 2);
  ctx.fill();
}

function drawTestTubeHolder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isDark: boolean
): void {
  ctx.strokeStyle = isDark ? "#475569" : "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 50, y);
  ctx.lineTo(x + 50, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 44, y);
  ctx.lineTo(x - 44, y - 180);
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// 1. Neutralisation (HCl + NaOH)
// ─────────────────────────────────────────────────────────────

function getFlaskFill(step: number, t: number, isDark: boolean): string {
  const base = isDark ? "rgba(255,255,255,0.04)" : "rgba(240,249,255,0.6)";
  if (step === 0) return base;
  if (step === 1) return `rgba(236,72,153,${lerp(0, 0.58, t)})`;
  if (step === 2) return `rgba(236,72,153,${lerp(0.58, 0.4, t)})`;
  if (step === 3) return `rgba(236,72,153,${lerp(0.4, 0.15, t)})`;
  if (step >= 4) return isDark ? "rgba(255,255,255,0.04)" : "rgba(240,249,255,0.6)";
  return base;
}

export function drawNeutralisation(dc: DrawContext): void {
  const { ctx, step, t, isDark, tick } = dc;
  const cx = 110;

  ctx.save();

  // Stand
  ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, 20);
  ctx.lineTo(70, 210);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(50, 210);
  ctx.lineTo(170, 210);
  ctx.stroke();

  // Burette body
  ctx.fillStyle = isDark ? "rgba(30,41,59,0.8)" : "rgba(224,242,254,0.6)";
  ctx.strokeStyle = isDark ? "#475569" : "#94a3b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(96, 10, 28, 88, 3);
  ctx.fill();
  ctx.stroke();

  // HCl liquid in burette — appears at step 2
  if (step >= 2) {
    const fillH = lerp(0, 60, clamp((step - 2) + t, 0, 1));
    ctx.fillStyle = "rgba(59,130,246,0.28)";
    ctx.beginPath();
    ctx.roundRect(97, 11, 26, fillH, 3);
    ctx.fill();
  }

  // Burette tip
  ctx.strokeStyle = isDark ? "#475569" : "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(cx, 98);
  ctx.lineTo(cx, 112);
  ctx.stroke();

  // Falling drop animation (step 2–4)
  if (step >= 2 && step <= 4) {
    const dropProgress = (tick * 0.003) % 1;
    const dropY = 112 + dropProgress * 30;
    const opacity = dropProgress < 0.7 ? 0.8 : 0.8 * (1 - (dropProgress - 0.7) / 0.3);
    ctx.beginPath();
    ctx.arc(cx, dropY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(59,130,246,${opacity})`;
    ctx.fill();
  }

  // Flask body
  ctx.fillStyle = getFlaskFill(step, t, isDark);
  ctx.strokeStyle = isDark ? "#475569" : "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(88, 115);
  ctx.lineTo(65, 192);
  ctx.quadraticCurveTo(cx, 210, 155, 192);
  ctx.lineTo(132, 115);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Flask neck
  ctx.fillStyle = isDark ? "rgba(30,41,59,0.6)" : "rgba(240,249,255,0.6)";
  ctx.strokeStyle = isDark ? "#475569" : "#94a3b8";
  ctx.beginPath();
  ctx.roundRect(88, 100, 44, 18, 2);
  ctx.fill();
  ctx.stroke();

  // Warmth glow at step 5
  if (step >= 5) {
    const glow = lerp(0, 1, t);
    const grad = ctx.createRadialGradient(cx, 170, 10, cx, 170, 55);
    grad.addColorStop(0, `rgba(251,146,60,${glow * 0.22})`);
    grad.addColorStop(1, "rgba(251,146,60,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, 170, 55, 42, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Equation
  if (step >= 4) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("HCl + NaOH → NaCl + H₂O", cx, 218);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 2. Displacement (Zn + CuSO₄)
// ─────────────────────────────────────────────────────────────

export function drawDisplacement(dc: DrawContext): void {
  const { ctx, step, t, isDark } = dc;
  const cx = 110;

  ctx.save();

  drawTestTubeHolder(ctx, cx, 210, isDark);

  // Calculate solution colour — blue fades to clear
  const blueIntensity =
    step === 0 ? 1
    : step === 1 ? 1
    : step === 2 ? lerp(1, 0.88, t)
    : step === 3 ? lerp(0.88, 0.42, t)
    : step >= 4 ? lerp(0.42, 0.06, t)
    : 1;

  const r = Math.round(lerp(28, 219, 1 - blueIntensity));
  const g = Math.round(lerp(100, 234, 1 - blueIntensity));
  const b = Math.round(lerp(220, 254, 1 - blueIntensity));
  const solutionColor = `rgba(${r},${g},${b},0.65)`;

  // Tube body
  ctx.strokeStyle = isDark ? "#475569" : "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.fillStyle = solutionColor;
  ctx.beginPath();
  ctx.moveTo(78, 40);
  ctx.lineTo(78, 170);
  ctx.quadraticCurveTo(cx, 200, 142, 170);
  ctx.lineTo(142, 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tube rim
  ctx.fillStyle = isDark ? "rgba(30,41,59,0.7)" : "rgba(224,242,254,0.7)";
  ctx.strokeStyle = isDark ? "#475569" : "#94a3b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(76, 30, 68, 14, 2);
  ctx.fill();
  ctx.stroke();

  // Zinc granules (appear at step 2)
  if (step >= 2) {
    const granuleOpacity = lerp(0, 1, t);
    const granules = [
      { x: 100, y: 178, rx: 10, ry: 6 },
      { x: 118, y: 184, rx: 9, ry: 5.5 },
      { x: 134, y: 176, rx: 8, ry: 5 },
    ];

    granules.forEach((g) => {
      // Zinc base
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = isDark
        ? `rgba(148,163,184,${granuleOpacity})`
        : `rgba(176,184,196,${granuleOpacity})`;
      ctx.fill();
      ctx.strokeStyle = isDark ? "#64748b" : "#8b95a1";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Copper deposit (step >= 4)
      if (step >= 4) {
        const cuOpacity = lerp(0, 0.9, step >= 5 ? 1 : t);
        ctx.beginPath();
        ctx.ellipse(g.x, g.y - 1, g.rx * 0.7, g.ry * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,90,30,${cuOpacity * granuleOpacity})`;
        ctx.fill();
      }
    });
  }

  // Bubbles on zinc surface (step 2–3)
  if (step >= 2 && step <= 3) {
    for (let i = 0; i < 4; i++) {
      const bx = 95 + i * 12;
      const byBase = 170;
      const phase = (Date.now() * 0.002 + i * 0.7) % 1;
      const by = byBase - phase * 40;
      const radius = 2.5 + i * 0.5;
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? "rgba(148,163,184,0.5)" : "rgba(100,120,180,0.4)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // Equation
  if (step >= 5) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("Zn + CuSO₄ → ZnSO₄ + Cu", cx, 216);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 3. Decomposition (Pb(NO₃)₂)
// ─────────────────────────────────────────────────────────────

export function drawDecomposition(dc: DrawContext): void {
  const { ctx, step, t, isDark, tick } = dc;
  const cx = 110;

  ctx.save();

  // Bunsen burner (appears at step 2)
  if (step >= 2) {
    drawBunsenBurner(ctx, cx, 185, isDark);
    const flameH = lerp(0, 26, clamp((step - 2) + t, 0, 1));
    if (flameH > 2) {
      drawFlame(ctx, cx, 185, flameH, tick);
    }
  }

  // Stand
  ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 30);
  ctx.lineTo(60, 200);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(40, 200);
  ctx.lineTo(160, 200);
  ctx.stroke();

  // Clamp
  ctx.fillStyle = isDark ? "#475569" : "#94a3b8";
  ctx.beginPath();
  ctx.roundRect(60, 90, 55, 10, 2);
  ctx.fill();

  // Boiling tube — rotated ~-25°
  ctx.translate(cx, 115);
  ctx.rotate(-0.4);

  // Tube outline
  ctx.fillStyle = isDark ? "rgba(30,41,59,0.55)" : "rgba(240,249,255,0.55)";
  ctx.strokeStyle = isDark ? "#475569" : "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-20, -52, 40, 110, 18);
  ctx.fill();
  ctx.stroke();

  // Pb(NO₃)₂ crystals (step 0–1)
  if (step <= 2) {
    ctx.fillStyle = isDark ? "rgba(255,249,196,0.7)" : "rgba(253,246,178,0.85)";
    ctx.strokeStyle = isDark ? "#ca8a04" : "#a16207";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(-14, 36, 28, 16, 2);
    ctx.fill();
    ctx.stroke();
  }

  // Yellow PbO residue (step >= 4)
  if (step >= 4) {
    const pboOpacity = lerp(0, 0.85, t);
    ctx.fillStyle = `rgba(234,179,8,${pboOpacity})`;
    ctx.beginPath();
    ctx.roundRect(-14, 36, 28, 16, 2);
    ctx.fill();
  }

  // Brown NO₂ fumes at tube mouth (step >= 3)
  if (step >= 3) {
    const fumeOpacity = lerp(0, 0.75, t);
    const fumeCount = 6;
    for (let i = 0; i < fumeCount; i++) {
      const angle = (-0.6 + i * 0.24) * Math.PI;
      const dist = 18 + i * 14;
      const wave = Math.sin(tick * 0.008 + i) * 3;
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * dist * 0.35 + wave,
        -52 - dist * 0.5 - wave * 0.5,
        7 + i * 2,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(161,72,8,${fumeOpacity * (0.85 - i * 0.1)})`;
      ctx.fill();
    }
  }

  ctx.restore();

  // Equation
  if (step >= 4) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("2Pb(NO₃)₂ → 2PbO + 4NO₂ + O₂", cx, 218);
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────────────────────
// 4. pH Test (litmus)
// ─────────────────────────────────────────────────────────────

export function drawPHTest(dc: DrawContext): void {
  const { ctx, step, t, isDark } = dc;
  const cx = 110;

  ctx.save();

  // White tile
  ctx.fillStyle = isDark ? "rgba(30,41,59,0.6)" : "rgba(248,248,240,0.9)";
  ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(40, 160, 140, 44, 4);
  ctx.fill();
  ctx.stroke();

  // Red litmus strip
  const redStripColor = step >= 2
    ? `rgba(59,130,246,${lerp(0, 0.7, t)})`   // turns blue with NaOH
    : "rgba(220,38,38,0.75)";
  ctx.fillStyle = redStripColor;
  ctx.beginPath();
  ctx.roundRect(58, 140, 40, 24, 3);
  ctx.fill();

  // Blue litmus strip
  const blueStripColor = step >= 1
    ? `rgba(220,38,38,${lerp(0, 0.7, t)})`    // turns red with HCl
    : "rgba(59,130,246,0.75)";
  ctx.fillStyle = blueStripColor;
  ctx.beginPath();
  ctx.roundRect(118, 140, 40, 24, 3);
  ctx.fill();

  // HCl dropper
  ctx.fillStyle = isDark ? "rgba(186,230,253,0.4)" : "rgba(186,230,253,0.7)";
  ctx.strokeStyle = isDark ? "#0369a1" : "#0369a1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(78, 80, 13, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(72, 100, 12, 32, 2);
  ctx.fill();
  ctx.stroke();

  // NaOH dropper
  ctx.fillStyle = isDark ? "rgba(254,205,211,0.4)" : "rgba(254,205,211,0.7)";
  ctx.strokeStyle = isDark ? "#be123c" : "#be123c";
  ctx.beginPath();
  ctx.ellipse(138, 80, 13, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(132, 100, 12, 32, 2);
  ctx.fill();
  ctx.stroke();

  // Drop from HCl dropper (step 1)
  if (step >= 1) {
    ctx.beginPath();
    ctx.arc(78, 136 + lerp(0, 6, t), 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(59,130,246,0.6)";
    ctx.fill();
  }

  // Drop from NaOH dropper (step 2)
  if (step >= 2) {
    ctx.beginPath();
    ctx.arc(138, 136 + lerp(0, 6, t), 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(220,38,38,0.6)";
    ctx.fill();
  }

  // Labels
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
  ctx.fillText("HCl", 78, 58);
  ctx.fillText("NaOH", 138, 58);
  ctx.fillStyle = isDark ? "#cbd5e1" : "#334155";
  ctx.fillText("Red litmus", 78, 190);
  ctx.fillText("Blue litmus", 138, 190);

  if (step >= 3) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("Acid → blue litmus turns red", cx, 215);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 5. Magnesium burning
// ─────────────────────────────────────────────────────────────

export function drawMagnesiumBurning(dc: DrawContext): void {
  const { ctx, step, t, isDark, tick } = dc;
  const cx = 110;

  ctx.save();

  // China dish
  ctx.fillStyle = isDark ? "rgba(248,250,252,0.12)" : "rgba(248,250,252,0.9)";
  ctx.strokeStyle = isDark ? "#475569" : "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, 190, 55, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, 185, 55, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // MgO white ash (step >= 4)
  if (step >= 4) {
    const ashOpacity = lerp(0, 0.9, t);
    ctx.beginPath();
    ctx.ellipse(cx, 184, 30, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${ashOpacity})`;
    ctx.fill();
  }

  // Tongs
  ctx.strokeStyle = isDark ? "#64748b" : "#94a3b8";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 8, 160);
  ctx.lineTo(cx - 28, 200);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 8, 160);
  ctx.lineTo(cx + 28, 200);
  ctx.stroke();

  // Mg ribbon
  ctx.strokeStyle = isDark ? "#cbd5e1" : "#94a3b8";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, 160);
  ctx.lineTo(cx, 110 - (step >= 1 ? lerp(0, 10, t) : 0));
  ctx.stroke();

  // Bunsen burner (bottom)
  drawBunsenBurner(ctx, cx, 205, isDark);

  // Flame on ribbon tip (step >= 1)
  if (step >= 1) {
    const flameH = lerp(0, 32, clamp(t * 1.5, 0, 1));
    if (step >= 2 && flameH > 3) {
      // Dazzling white flash
      const flicker = 0.9 + Math.sin(tick * 0.018) * 0.1;
      ctx.beginPath();
      ctx.ellipse(cx, 100, 22 * flicker, 30 * flicker, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,220,0.85)";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, 98, 14 * flicker, 22 * flicker, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();

      // Glow radiate
      const grad = ctx.createRadialGradient(cx, 100, 5, cx, 100, 50);
      grad.addColorStop(0, "rgba(255,255,200,0.35)");
      grad.addColorStop(1, "rgba(255,255,200,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, 100, 50, 50, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (flameH > 2) {
      drawFlame(ctx, cx, 110, flameH, tick);
    }
  }

  // Bunsen flame
  if (step >= 0) {
    drawFlame(ctx, cx, 205, 18, tick);
  }

  if (step >= 3) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("2Mg + O₂ → 2MgO", cx, 218);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// Draw function registry
// ─────────────────────────────────────────────────────────────

export type DrawFn = (dc: DrawContext) => void;

export const DRAW_REGISTRY: Record<string, DrawFn> = {
  "chem-neutralisation": drawNeutralisation,
  "chem-displacement": drawDisplacement,
  "chem-decomposition": drawDecomposition,
  "chem-ph-test": drawPHTest,
  "chem-combination": drawMagnesiumBurning,
};

export function getDrawFn(experimentId: string): DrawFn | null {
  return DRAW_REGISTRY[experimentId] ?? null;
}