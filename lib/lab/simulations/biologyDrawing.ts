// ============================================================
// /lib/lab/simulations/biologyDrawing.ts
// Realistic animated canvas drawing for all 5 biology experiments.
// Step-by-step, stateless, pure canvas.
// ============================================================

import type { DrawContext } from "./chemistryDrawing";

function easeOut(x: number): number {
  return 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * easeOut(Math.min(t, 1));
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

// ─────────────────────────────────────────────────────────────────
// 1. PHOTOSYNTHESIS — leaf with colour change animation
// ─────────────────────────────────────────────────────────────────

export function drawPhotosynthesis(dc: DrawContext): void {
  const { ctx, step, t, isDark, tick } = dc;
  const W = 220, H = 226;

  ctx.save();
  ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // ── Left leaf (sunlit) ──
  const drawLeaf = (
    cx: number, cy: number,
    fillColor: string,
    label: string,
    labelColor: string
  ) => {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = isDark ? "#166534" : "#15803d";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 36, 52, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // midrib
    ctx.strokeStyle = isDark ? "#166534" : "#15803d";
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx, cy - 50); ctx.lineTo(cx, cy + 50); ctx.stroke();
    // veins
    ctx.lineWidth = 0.7;
    [-20, -8, 8, 20].forEach(y => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + y);
      ctx.quadraticCurveTo(cx + 20, cy + y - 4, cx + 30, cy + y - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + y);
      ctx.quadraticCurveTo(cx - 20, cy + y - 4, cx - 30, cy + y - 2);
      ctx.stroke();
    });
    ctx.fillStyle = labelColor;
    ctx.font = "bold 9px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(label, cx, cy + 66);
  };

  // Sunlit leaf — turns blue-black at step 5
  let sunLeafColor = isDark ? "rgba(74,222,128,0.25)" : "rgba(134,239,172,0.6)";
  if (step >= 5) {
    const bb = lerp(0, 1, t);
    const r = Math.round(lerp(134, 20, bb));
    const g = Math.round(lerp(239, 20, bb));
    const b = Math.round(lerp(172, 60, bb));
    sunLeafColor = `rgba(${r},${g},${b},0.75)`;
  } else if (step === 4) {
    // de-greened — pale
    const pale = lerp(0, 1, t);
    const r = Math.round(lerp(134, 240, pale));
    const g = Math.round(lerp(239, 230, pale));
    const b = Math.round(lerp(172, 200, pale));
    sunLeafColor = `rgba(${r},${g},${b},0.6)`;
  }
  drawLeaf(58, 108, sunLeafColor,
    step >= 5 ? "Blue-black ✔" : "Sunlit Leaf",
    step >= 5 ? (isDark ? "#86efac" : "#15803d") : (isDark ? "#94a3b8" : "#475569")
  );

  // Black paper clip on sunlit leaf top (step 1)
  if (step >= 1 && step <= 2) {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(40, 60, 36, 14);
    ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
    ctx.font = "7px system-ui"; ctx.textAlign = "center";
    ctx.fillText("black paper", 58, 84);
  }

  // Dark leaf (right) — stays orange-brown at step 5
  let darkLeafColor = isDark ? "rgba(148,163,184,0.2)" : "rgba(226,232,240,0.6)";
  if (step >= 5) {
    const ob = lerp(0, 1, t);
    darkLeafColor = `rgba(${Math.round(lerp(226, 234, ob))},${Math.round(lerp(232, 135, ob))},${Math.round(lerp(240, 50, ob))},0.65)`;
  }
  drawLeaf(158, 108, darkLeafColor,
    step >= 5 ? "Orange-brown" : "Dark Leaf",
    step >= 5 ? (isDark ? "#fbbf24" : "#92400e") : (isDark ? "#94a3b8" : "#475569")
  );

  // Darkness cover on right leaf (steps 0-2)
  if (step <= 2) {
    ctx.fillStyle = "rgba(15,23,42,0.45)";
    ctx.beginPath();
    ctx.ellipse(158, 108, 36, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
    ctx.font = "7px system-ui"; ctx.textAlign = "center";
    ctx.fillText("dark", 158, 108);
  }

  // Sun (step 2)
  if (step >= 2) {
    const sunOp = lerp(0, 1, t);
    ctx.globalAlpha = sunOp;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath(); ctx.arc(58, 28, 14, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4 + tick * 0.001;
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(58 + Math.cos(angle) * 17, 28 + Math.sin(angle) * 17);
      ctx.lineTo(58 + Math.cos(angle) * 23, 28 + Math.sin(angle) * 23);
      ctx.stroke();
    }
    ctx.font = "8px system-ui"; ctx.fillStyle = "#fbbf24"; ctx.textAlign = "center";
    ctx.fillText("Sunlight", 58, 14);
    ctx.globalAlpha = 1;
  }

  // Iodine dropper (step 4)
  if (step >= 4) {
    ctx.fillStyle = isDark ? "rgba(120,80,20,0.5)" : "rgba(161,98,7,0.4)";
    ctx.strokeStyle = "#92400e"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(110, 50, 9, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(106, 64, 8, 20, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#92400e"; ctx.font = "7px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Iodine", 110, 36);
  }

  // VS divider
  ctx.fillStyle = isDark ? "#475569" : "#94a3b8";
  ctx.font = "bold 13px system-ui"; ctx.textAlign = "center";
  ctx.fillText("VS", 110, 115);

  if (step >= 5) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "10px system-ui"; ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("Sunlight needed for starch ✔", 110, 200);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 2. RESPIRATION — seeds → CO₂ bubbles → lime water turns milky
// ─────────────────────────────────────────────────────────────────

export function drawRespiration(dc: DrawContext): void {
  const { ctx, step, t, isDark, tick } = dc;
  const W = 220, H = 226;

  ctx.save();
  ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Conical flask (left)
  const fX = 60, fY = 80;
  ctx.fillStyle = isDark ? "rgba(134,239,172,0.08)" : "rgba(134,239,172,0.2)";
  ctx.strokeStyle = isDark ? "#4ade80" : "#16a34a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fX - 16, fY);
  ctx.lineTo(fX - 38, fY + 90);
  ctx.quadraticCurveTo(fX, fY + 112, fX + 38, fY + 90);
  ctx.lineTo(fX + 16, fY);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Flask neck
  ctx.beginPath(); ctx.roundRect(fX - 16, fY - 20, 32, 24, 2);
  ctx.fill(); ctx.stroke();

  // Seeds inside flask
  if (step >= 0) {
    const seedOpacity = step >= 1 ? 1 : lerp(0, 1, t);
    ctx.globalAlpha = seedOpacity;
    [[fX - 10, fY + 78], [fX, fY + 85], [fX + 12, fY + 80], [fX - 5, fY + 68], [fX + 8, fY + 70]].forEach(([sx, sy]) => {
      ctx.fillStyle = "#92400e";
      ctx.beginPath(); ctx.ellipse(sx, sy, 6, 4, Math.PI * 0.2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "7px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Germinating Seeds", fX, fY + 108);
  }

  // Rubber stopper (step >= 1)
  if (step >= 1) {
    ctx.fillStyle = isDark ? "#334155" : "#64748b";
    ctx.beginPath(); ctx.roundRect(fX - 18, fY - 26, 36, 10, 2); ctx.fill();
  }

  // Delivery tube (step >= 2)
  if (step >= 2) {
    const tubeOpacity = lerp(0, 1, t);
    ctx.globalAlpha = tubeOpacity;
    ctx.strokeStyle = isDark ? "#94a3b8" : "#64748b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fX + 6, fY - 20);
    ctx.bezierCurveTo(fX + 40, fY - 60, 150, fY - 60, 158, fY - 20);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // CO₂ bubbles in tube (step >= 3)
  if (step >= 3) {
    const bubbleCount = 5;
    for (let i = 0; i < bubbleCount; i++) {
      const phase = ((tick * 0.0015 + i * 0.22) % 1);
      // Interpolate along bezier approximation
      const bx = lerp(lerp(fX + 6, fX + 46, phase), lerp(150, 158, phase), phase);
      const by = lerp(lerp(fY - 20, fY - 65, phase), lerp(fY - 65, fY - 20, phase), phase);
      ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "rgba(134,239,172,0.6)" : "rgba(22,163,74,0.5)";
      ctx.fill();
    }
  }

  // Test tube with lime water (right)
  const tX = 160, tY = 80;
  // Lime water colour: clear → milky at step 4
  const milkiness = step >= 4 ? lerp(0, 0.85, t) : 0;
  const limeColor = isDark
    ? `rgba(${Math.round(lerp(20, 240, milkiness))},${Math.round(lerp(20, 240, milkiness))},${Math.round(lerp(20, 240, milkiness))},0.6)`
    : `rgba(${Math.round(lerp(254, 255, milkiness))},${Math.round(lerp(254, 255, milkiness))},${Math.round(lerp(230, 255, milkiness))},0.7)`;

  ctx.fillStyle = limeColor;
  ctx.strokeStyle = isDark ? "#94a3b8" : "#64748b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tX - 14, tY);
  ctx.lineTo(tX - 14, tY + 100);
  ctx.quadraticCurveTo(tX, tY + 118, tX + 14, tY + 100);
  ctx.lineTo(tX + 14, tY);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Test tube rim
  ctx.fillStyle = isDark ? "rgba(30,41,59,0.8)" : "rgba(241,245,249,0.8)";
  ctx.beginPath(); ctx.roundRect(tX - 15, tY - 12, 30, 16, 2); ctx.fill(); ctx.stroke();

  // Milky label
  if (step >= 4) {
    ctx.fillStyle = isDark ? "#fbbf24" : "#92400e";
    ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("Milky! CO₂", tX, tY + 130);
    ctx.fillText("confirmed", tX, tY + 141);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
    ctx.font = "8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Lime water", tX, tY + 130);
    ctx.fillText("(clear)", tX, tY + 141);
  }

  if (step >= 5) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "10px system-ui"; ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("CO₂ from respiration ✔", 110, 210);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 3. BINARY FISSION — animated Amoeba dividing
// ─────────────────────────────────────────────────────────────────

export function drawBinaryFission(dc: DrawContext): void {
  const { ctx, step, t, isDark, tick } = dc;
  const W = 220, H = 226;

  ctx.save();
  ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Microscope slide background
  ctx.fillStyle = isDark ? "rgba(186,230,253,0.05)" : "rgba(186,230,253,0.15)";
  ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(10, 20, 200, 165, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = isDark ? "#475569" : "#94a3b8";
  ctx.font = "7px system-ui"; ctx.textAlign = "center";
  ctx.fillText("Microscope Slide — Amoeba Binary Fission", 110, 16);

  const drawAmoeba = (
    cx: number, cy: number,
    rx: number, ry: number,
    color: string,
    nucleusRx: number, nucleusRy: number,
    tick2: number,
    wobble: boolean
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    if (wobble) {
      // Pseudopod wobble
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + tick2 * 0.001 * (i % 2 === 0 ? 1 : -1);
        const pLen = 12 + Math.sin(tick2 * 0.003 + i) * 5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * rx * 0.7, Math.sin(angle) * ry * 0.7);
        ctx.lineTo(Math.cos(angle) * (rx + pLen), Math.sin(angle) * (ry + pLen * 0.6));
        ctx.stroke();
      }
    }
    // Cell body
    ctx.fillStyle = color;
    ctx.strokeStyle = isDark ? "#94a3b8" : "#475569";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Nucleus
    ctx.fillStyle = isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)";
    ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, nucleusRx, nucleusRy, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  if (step <= 1) {
    // Single parent cell
    drawAmoeba(110, 100, 44, 38, isDark ? "rgba(134,239,172,0.2)" : "rgba(134,239,172,0.4)",
      18, 16, tick, step >= 1);
    ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
    ctx.font = "bold 9px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Parent Amoeba", 110, 155);
  } else if (step === 2) {
    // Elongating nucleus
    const stretch = lerp(1, 1.8, t);
    drawAmoeba(110, 100, 44, 38, isDark ? "rgba(134,239,172,0.2)" : "rgba(134,239,172,0.4)",
      18 * stretch, 14 / stretch, tick, false);
    ctx.fillStyle = "#6366f1"; ctx.font = "8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Nucleus elongating (karyokinesis)", 110, 155);
  } else if (step === 3) {
    // Cell elongating, two nuclei
    const elongate = lerp(1, 1.5, t);
    drawAmoeba(110, 100, 44 * elongate, 38 / elongate,
      isDark ? "rgba(134,239,172,0.2)" : "rgba(134,239,172,0.4)",
      14, 12, tick, false);
    // Two nuclei
    ctx.fillStyle = isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)";
    ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 1;
    const sep = lerp(0, 18, t);
    ctx.beginPath(); ctx.ellipse(110 - sep, 100, 12, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(110 + sep, 100, 12, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6366f1"; ctx.font = "8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Two nuclei forming", 110, 155);
  } else if (step === 4) {
    // Cytokinesis — pinching
    const pinch = lerp(0, 1, t);
    const pinchDepth = pinch * 22;
    ctx.fillStyle = isDark ? "rgba(134,239,172,0.2)" : "rgba(134,239,172,0.4)";
    ctx.strokeStyle = isDark ? "#94a3b8" : "#475569"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(110, 100, 60, 30, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Pinch mark
    ctx.strokeStyle = isDark ? "#4ade80" : "#16a34a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(110, 100 - 30); ctx.bezierCurveTo(110, 100 - 30 + pinchDepth, 110, 100 + 30 - pinchDepth, 110, 100 + 30); ctx.stroke();
    ctx.fillStyle = "#6366f1"; ctx.font = "8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Cytokinesis (cytoplasm dividing)", 110, 155);
  } else {
    // Two daughter cells
    const sep = lerp(0, 50, t);
    drawAmoeba(110 - sep, 100, 32, 28,
      isDark ? "rgba(134,239,172,0.25)" : "rgba(134,239,172,0.45)",
      14, 12, tick, true);
    drawAmoeba(110 + sep, 100, 32, 28,
      isDark ? "rgba(134,239,172,0.25)" : "rgba(134,239,172,0.45)",
      14, 12, tick + 1000, true);
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "bold 9px system-ui"; ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("2 identical daughter cells ✔", 110, 155);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 4. BUDDING IN YEAST — microscope view with bud growing
// ─────────────────────────────────────────────────────────────────

export function drawBuddingYeast(dc: DrawContext): void {
  const { ctx, step, t, isDark, tick } = dc;
  const W = 220, H = 226;

  ctx.save();
  ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Microscope slide
  ctx.fillStyle = isDark ? "rgba(254,249,195,0.06)" : "rgba(254,249,195,0.3)";
  ctx.strokeStyle = isDark ? "#334155" : "#d1d5db";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(10, 18, 200, 168, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = isDark ? "#475569" : "#94a3b8";
  ctx.font = "7px system-ui"; ctx.textAlign = "center";
  ctx.fillText("Microscope slide — Yeast (Methylene Blue stain)", 110, 14);

  const yeastColor = isDark ? "rgba(254,249,195,0.35)" : "rgba(254,249,195,0.8)";
  const yeastStroke = isDark ? "#fbbf24" : "#ca8a04";
  const nucColor = isDark ? "rgba(251,191,36,0.4)" : "rgba(251,191,36,0.6)";

  const drawYeastCell = (cx: number, cy: number, rx: number, ry: number, showNuc: boolean) => {
    ctx.fillStyle = yeastColor;
    ctx.strokeStyle = yeastStroke; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (showNuc) {
      ctx.fillStyle = nucColor; ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.45, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  };

  if (step <= 1) {
    // Just parent cells scattered
    [[70, 95], [150, 85], [110, 130], [80, 145], [145, 140]].forEach(([x, y], i) => {
      drawYeastCell(x, y, 18 + i * 2, 14 + i, i < 3);
    });
    ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
    ctx.font = "8px system-ui"; ctx.textAlign = "center";
    ctx.fillText(step >= 1 ? "Yeast cells visible (40×)" : "Yeast cells visible (10×)", 110, 176);
  } else if (step === 2) {
    // Stained cells
    [[70, 95], [150, 85], [110, 130], [80, 145], [145, 140]].forEach(([x, y], i) => {
      drawYeastCell(x, y, 18 + i * 2, 14 + i, true);
    });
    ctx.fillStyle = isDark ? "#60a5fa" : "#2563eb";
    ctx.font = "8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Methylene blue applied", 110, 176);
  } else {
    // Main parent cell with bud growing
    const budSize = step >= 4 ? lerp(0, step >= 5 ? 0.9 : 0.6, t) : lerp(0, 0.35, t);

    // Other background cells
    [[160, 82], [75, 148], [148, 148]].forEach(([x, y]) => drawYeastCell(x, y, 14, 11, true));

    // Parent cell
    drawYeastCell(90, 108, 26, 22, true);

    // Bud growing off parent
    const budRx = 26 * budSize;
    const budRy = 22 * budSize;
    const budX = 90 + 26 + budRx * 0.8;
    const budY = 108 - 12;
    if (budRx > 1) {
      drawYeastCell(budX, budY, budRx, budRy, budSize > 0.4);
      // Connection neck
      ctx.strokeStyle = yeastStroke; ctx.lineWidth = Math.max(1, budRx * 0.35);
      ctx.beginPath(); ctx.moveTo(90 + 22, 108 - 8); ctx.lineTo(budX - budRx * 0.9, budY); ctx.stroke();
    }

    // Detached daughter at step 5
    if (step >= 5) {
      const detachX = lerp(budX, budX + 28, t);
      const detachY = lerp(budY, budY - 18, t);
      drawYeastCell(detachX, detachY, 20 * 0.9, 18 * 0.9, true);
      ctx.fillStyle = isDark ? "#86efac" : "#15803d";
      ctx.font = "7px system-ui"; ctx.textAlign = "center";
      ctx.fillText("Daughter cell", detachX, detachY + 26);
    }

    ctx.fillStyle = isDark ? "#fbbf24" : "#92400e";
    ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
    ctx.fillText(step >= 5 ? "Bud detaches → new yeast ✔" : "Bud growing on parent cell", 110, 176);
  }

  if (step >= 5) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "10px system-ui"; ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("Asexual budding confirmed ✔", 110, 200);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 5. HOMOLOGOUS & ANALOGOUS — animated chart reveal
// ─────────────────────────────────────────────────────────────────

export function drawHomologous(dc: DrawContext): void {
  const { ctx, step, t, isDark } = dc;
  const W = 220, H = 226;

  ctx.save();
  ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = isDark ? "#e2e8f0" : "#1e293b";
  ctx.font = "bold 9px system-ui"; ctx.textAlign = "center";
  ctx.fillText("Homologous Organs", 110, 16);

  // Draw a simplified forelimb bone structure
  const drawForeliumb = (cx: number, color: string, label: string, opacity: number) => {
    ctx.globalAlpha = opacity;
    // Humerus
    ctx.fillStyle = color; ctx.strokeStyle = isDark ? "#64748b" : "#94a3b8"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.roundRect(cx - 7, 25, 14, 36, 4); ctx.fill(); ctx.stroke();
    // Radius
    ctx.beginPath(); ctx.roundRect(cx - 8, 64, 7, 28, 3); ctx.fill(); ctx.stroke();
    // Ulna
    ctx.beginPath(); ctx.roundRect(cx + 1, 64, 7, 28, 3); ctx.fill(); ctx.stroke();
    // Carpals
    ctx.beginPath(); ctx.roundRect(cx - 9, 95, 18, 9, 2); ctx.fill(); ctx.stroke();
    ctx.font = "7px system-ui"; ctx.textAlign = "center";
    ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
    ctx.fillText(label, cx, 115);
    ctx.globalAlpha = 1;
  };

  const boneColor = isDark ? "rgba(147,197,253,0.5)" : "rgba(147,197,253,0.7)";
  const positions = [28, 72, 116, 160];
  const labels = ["Human\nArm", "Horse\nLeg", "Whale\nFlipper", "Bat\nWing"];

  positions.forEach((cx, i) => {
    const visibleFrom = i + 1;
    const opacity = step >= visibleFrom ? (step === visibleFrom ? lerp(0, 1, t) : 1) : 0;
    if (opacity > 0) drawForeliumb(cx, boneColor, labels[i], opacity);
  });

  // Same bones label (step >= 4)
  if (step >= 4) {
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillStyle = isDark ? "rgba(30,41,59,0.9)" : "rgba(219,234,254,0.9)";
    ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(8, 118, 204, 16, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3b82f6"; ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("SAME bone plan → Divergent evolution (Common ancestor)", 110, 129);
    ctx.globalAlpha = 1;
  }

  // Divider
  ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(10, 140); ctx.lineTo(210, 140); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = isDark ? "#e2e8f0" : "#1e293b"; ctx.font = "bold 9px system-ui"; ctx.textAlign = "center";
  ctx.fillText("Analogous Organs", 110, 152);

  // Bird wing vs insect wing (step >= 5)
  if (step >= 5) {
    ctx.globalAlpha = lerp(0, 1, t);

    // Bird wing
    ctx.fillStyle = isDark ? "rgba(134,239,172,0.3)" : "rgba(134,239,172,0.5)";
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(50, 175);
    ctx.bezierCurveTo(30, 155, 80, 155, 90, 175);
    ctx.bezierCurveTo(80, 185, 30, 185, 50, 175);
    ctx.fill(); ctx.stroke();
    // Bone inside bird wing
    ctx.strokeStyle = "#15803d"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(52, 175); ctx.lineTo(84, 169); ctx.stroke();
    ctx.fillStyle = isDark ? "#86efac" : "#15803d"; ctx.font = "7px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Bird Wing", 65, 196);
    ctx.fillText("(bones)", 65, 205);

    // Insect wing
    ctx.fillStyle = isDark ? "rgba(254,249,195,0.2)" : "rgba(254,249,195,0.6)";
    ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(140, 175);
    ctx.bezierCurveTo(125, 155, 175, 153, 185, 170);
    ctx.bezierCurveTo(178, 185, 128, 188, 140, 175);
    ctx.fill(); ctx.stroke();
    // Vein pattern
    ctx.strokeStyle = "#92400e"; ctx.lineWidth = 0.7;
    [[142, 174, 172, 162], [142, 174, 168, 174], [142, 174, 165, 182]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.fillStyle = isDark ? "#fbbf24" : "#92400e"; ctx.font = "7px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Insect Wing", 160, 196);
    ctx.fillText("(chitin veins)", 160, 205);

    ctx.fillStyle = isDark ? "#f97316" : "#c2410c"; ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Same function, DIFFERENT structure", 110, 218);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// Registry
export type DrawFn = (dc: DrawContext) => void;

export const BIOLOGY_DRAW_REGISTRY: Record<string, DrawFn> = {
  "bio-photosynthesis": drawPhotosynthesis,
  "bio-respiration": drawRespiration,
  "bio-binary-fission": drawBinaryFission,
  "bio-budding-yeast": drawBuddingYeast,
  "bio-homologous": drawHomologous,
};

export function getBiologyDrawFn(experimentId: string): DrawFn | null {
  return BIOLOGY_DRAW_REGISTRY[experimentId] ?? null;
}