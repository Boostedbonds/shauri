// ============================================================
// /lib/lab/simulations/physicsDrawing.ts
// Realistic animated canvas drawing for all 4 physics experiments.
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
// 1. OHM'S LAW — animated circuit with current flow particles
// ─────────────────────────────────────────────────────────────────

export function drawOhmsLaw(dc: DrawContext): void {
  const { ctx, step, t, isDark, tick } = dc;
  const W = 220, H = 226;

  ctx.save();

  const bg = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Circuit rectangle
  const left = 18, top = 22, right = 202, bottom = 180;
  const wire = isDark ? "#94a3b8" : "#475569";

  // Draw wires (step >= 0)
  ctx.strokeStyle = wire;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";

  // Top wire (left portion)
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(72, top); ctx.stroke();
  // Top wire (right portion, after switch)
  ctx.beginPath(); ctx.moveTo(108, top); ctx.lineTo(right, top); ctx.stroke();
  // Right wire
  ctx.beginPath(); ctx.moveTo(right, top); ctx.lineTo(right, bottom); ctx.stroke();
  // Bottom wire
  ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
  // Left wire
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.stroke();

  // Battery (left side, vertical)
  const batX = left, batMid = 101;
  // Long plate (+)
  ctx.strokeStyle = isDark ? "#f8fafc" : "#1e293b";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(batX - 8, batMid - 18); ctx.lineTo(batX + 8, batMid - 18); ctx.stroke();
  // Short plate (-)
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(batX - 5, batMid - 10); ctx.lineTo(batX + 5, batMid - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(batX - 8, batMid + 10); ctx.lineTo(batX + 8, batMid + 10); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(batX - 5, batMid + 18); ctx.lineTo(batX + 5, batMid + 18); ctx.stroke();
  ctx.font = "9px system-ui";
  ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
  ctx.textAlign = "center";
  ctx.fillText("6V", left, bottom + 14);

  // Switch (top left, step >= 0)
  ctx.strokeStyle = wire;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(72, top, 3, 0, Math.PI * 2); ctx.fillStyle = wire; ctx.fill();
  ctx.beginPath(); ctx.arc(108, top, 3, 0, Math.PI * 2); ctx.fill();
  if (step >= 3) {
    // closed switch
    ctx.beginPath(); ctx.moveTo(72, top); ctx.lineTo(108, top); ctx.stroke();
  } else {
    // open switch (angled)
    ctx.beginPath(); ctx.moveTo(72, top); ctx.lineTo(105, top - 12); ctx.stroke();
  }
  ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
  ctx.font = "8px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("K", 90, top - 16);

  // Rheostat (top middle)
  const rheoX = 130, rheoY = top;
  ctx.strokeStyle = isDark ? "#fbbf24" : "#b45309";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(rheoX - 22, rheoY - 9, 44, 18, 3);
  ctx.stroke();
  // Zigzag inside
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(rheoX - 16 + i * 8, rheoY - 4);
    ctx.lineTo(rheoX - 12 + i * 8, rheoY + 4);
    ctx.stroke();
  }
  ctx.fillStyle = isDark ? "#fbbf24" : "#b45309";
  ctx.font = "8px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Rheostat", rheoX, top - 13);

  // Ammeter circle (top right area)
  const amX = 185, amY = top;
  ctx.beginPath();
  ctx.arc(amX, amY, 12, 0, Math.PI * 2);
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.fillStyle = isDark ? "#0f172a" : "#f0fdf4";
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("A", amX, amY + 4);

  // Resistor (right side, vertical)
  const resX = right, resMid = 101;
  ctx.strokeStyle = isDark ? "#f97316" : "#ea580c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(resX - 10, resMid - 24, 20, 48, 3);
  ctx.stroke();
  ctx.fillStyle = isDark ? "#f97316" : "#ea580c";
  ctx.font = "9px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("R", resX + 13, resMid + 3);

  // Voltmeter (bottom, parallel to resistor) — appears step >= 2
  if (step >= 2) {
    const vmOpacity = lerp(0, 1, t);
    ctx.globalAlpha = vmOpacity;
    // Dashed parallel wires
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(right, resMid - 24); ctx.lineTo(right + 18, resMid - 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right + 18, resMid - 24); ctx.lineTo(right + 18, resMid + 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right, resMid + 24); ctx.lineTo(right + 18, resMid + 24); ctx.stroke();
    ctx.setLineDash([]);
    // VM circle
    const vmX = right + 18, vmY = resMid;
    ctx.beginPath(); ctx.arc(vmX, vmY, 11, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? "#0f172a" : "#fff1f2";
    ctx.fill();
    ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#ef4444"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
    ctx.fillText("V", vmX, vmY + 4);
    ctx.globalAlpha = 1;
  }

  // Current flow particles (step >= 3, circuit closed)
  if (step >= 3) {
    const speed = 0.00025;
    const perimeter = 2 * ((right - left) + (bottom - top));
    // 6 particles spaced evenly
    for (let i = 0; i < 6; i++) {
      const phase = ((tick * speed + i / 6) % 1) * perimeter;
      let px = 0, py = 0;
      const topLen = right - left;
      const rightLen = bottom - top;
      const botLen = right - left;
      const leftLen = bottom - top;

      if (phase < topLen) {
        px = left + phase; py = top;
      } else if (phase < topLen + rightLen) {
        px = right; py = top + (phase - topLen);
      } else if (phase < topLen + rightLen + botLen) {
        px = right - (phase - topLen - rightLen); py = bottom;
      } else {
        px = left; py = bottom - (phase - topLen - rightLen - botLen);
      }
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "#fbbf24" : "#f59e0b";
      ctx.fill();
    }
  }

  // Live reading display (step >= 4)
  if (step >= 4) {
    const voltage = lerp(2, 8, clamp((step - 4) + t, 0, 1));
    const resistance = 10;
    const current = voltage / resistance;
    ctx.fillStyle = isDark ? "rgba(30,41,59,0.9)" : "rgba(241,245,249,0.95)";
    ctx.beginPath(); ctx.roundRect(38, 188, 144, 28, 4); ctx.fill();
    ctx.fillStyle = isDark ? "#e2e8f0" : "#1e293b";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`V=${voltage.toFixed(1)}V  I=${current.toFixed(2)}A  R=${resistance}Ω`, 110, 206);
  }

  // Conclusion
  if (step >= 5) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("V = IR  verified ✔", 110, 220);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 2. CONCAVE MIRROR — animated ray diagram with moving screen
// ─────────────────────────────────────────────────────────────────

export function drawConcaveMirror(dc: DrawContext): void {
  const { ctx, step, t, isDark } = dc;
  const W = 220, H = 226;
  const axisY = 113;
  const mirrorX = 36;
  const poleY = axisY;

  ctx.save();
  ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Principal axis
  ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(10, axisY); ctx.lineTo(W - 10, axisY); ctx.stroke();
  ctx.setLineDash([]);

  // Concave mirror arc
  ctx.strokeStyle = isDark ? "#60a5fa" : "#2563eb";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(mirrorX + 60, axisY, 60, Math.PI * 0.72, Math.PI * 1.28);
  ctx.stroke();
  // Hatching behind mirror
  ctx.strokeStyle = isDark ? "#1e3a5f" : "#bfdbfe";
  ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(mirrorX - 2, axisY + i * 12);
    ctx.lineTo(mirrorX - 12, axisY + i * 12 + 8);
    ctx.stroke();
  }

  // Labels C and F
  const C = mirrorX + 120;
  const F = mirrorX + 60;
  ctx.fillStyle = "#ef4444";
  ctx.font = "bold 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("C", C, axisY - 10);
  ctx.beginPath(); ctx.arc(C, axisY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ef4444"; ctx.fill();

  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("F", F, axisY - 10);
  ctx.beginPath(); ctx.arc(F, axisY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#22c55e"; ctx.fill();

  // Parallel incident rays (step >= 1)
  if (step >= 1) {
    const rayOpacity = lerp(0, 1, t);
    ctx.globalAlpha = rayOpacity;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    [-28, -14, 0, 14, 28].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(W - 15, axisY + offset);
      ctx.lineTo(mirrorX + 2, axisY + offset);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  // Reflected rays converging to F (step >= 2)
  if (step >= 2) {
    const refOpacity = lerp(0, 1, t);
    ctx.globalAlpha = refOpacity;
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    [-28, -14, 14, 28].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(mirrorX + 2, axisY + offset);
      ctx.lineTo(F, axisY);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(mirrorX + 2, axisY);
    ctx.lineTo(F, axisY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Screen moving to focus position (step >= 3)
  if (step >= 3) {
    const screenX = lerp(W - 30, F, clamp(t, 0, 1));
    ctx.fillStyle = isDark ? "#fef3c7" : "#fffbeb";
    ctx.strokeStyle = isDark ? "#fbbf24" : "#d97706";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(screenX - 3, axisY - 40, 6, 80, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isDark ? "#fbbf24" : "#92400e";
    ctx.font = "8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Screen", screenX, axisY + 52);
  }

  // Sharp image dot at F (step >= 4)
  if (step >= 4) {
    ctx.beginPath(); ctx.arc(F, axisY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444"; ctx.globalAlpha = lerp(0, 1, t); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = isDark ? "#fca5a5" : "#b91c1c";
    ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Sharp image!", F, axisY + 62);
  }

  // Measurement arrow (step >= 4)
  if (step >= 4) {
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mirrorX, axisY + 75); ctx.lineTo(F, axisY + 75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mirrorX, axisY + 70); ctx.lineTo(mirrorX, axisY + 80); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(F, axisY + 70); ctx.lineTo(F, axisY + 80); ctx.stroke();
    ctx.fillStyle = "#22c55e"; ctx.font = "9px system-ui"; ctx.textAlign = "center";
    ctx.fillText("f (focal length)", (mirrorX + F) / 2, axisY + 88);
  }

  // Result
  if (step >= 5) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "10px system-ui"; ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("f = R/2 confirmed ✔", 110, 218);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 3. CONVEX LENS — animated ray diagram
// ─────────────────────────────────────────────────────────────────

export function drawConvexLens(dc: DrawContext): void {
  const { ctx, step, t, isDark } = dc;
  const W = 220, H = 226;
  const axisY = 110;
  const lensX = 110;
  const F = 60; // focal length in pixels
  const focalPt = lensX + F;

  ctx.save();
  ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Principal axis
  ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
  ctx.setLineDash([6, 4]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(8, axisY); ctx.lineTo(W - 8, axisY); ctx.stroke();
  ctx.setLineDash([]);

  // Convex lens shape
  ctx.fillStyle = isDark ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.2)";
  ctx.strokeStyle = isDark ? "#38bdf8" : "#0284c7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(lensX, axisY, 12, 70, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
  ctx.font = "8px system-ui"; ctx.textAlign = "center";
  ctx.fillText("Convex Lens", lensX, axisY - 78);

  // F points
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 10px system-ui";
  ctx.fillText("F", focalPt, axisY - 8);
  ctx.beginPath(); ctx.arc(focalPt, axisY, 3, 0, Math.PI * 2); ctx.fillStyle = "#22c55e"; ctx.fill();
  // F on left side
  ctx.fillStyle = "#22c55e"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
  ctx.fillText("F", lensX - F, axisY - 8);
  ctx.beginPath(); ctx.arc(lensX - F, axisY, 3, 0, Math.PI * 2); ctx.fill();

  // Parallel incident rays from left (step >= 1)
  if (step >= 1) {
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.5;
    [-30, -18, -6, 6, 18, 30].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(8, axisY + offset);
      ctx.lineTo(lensX - 12, axisY + offset);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  // Converging rays to focal point (step >= 2)
  if (step >= 2) {
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    [-30, -18, -6, 6, 18, 30].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(lensX + 12, axisY + offset);
      ctx.lineTo(focalPt, axisY);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Screen sliding to focal point (step >= 3)
  if (step >= 3) {
    const screenX = lerp(W - 15, focalPt, clamp(t, 0, 1));
    ctx.fillStyle = isDark ? "#fef3c7" : "#fffbeb";
    ctx.strokeStyle = isDark ? "#fbbf24" : "#d97706";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(screenX - 3, axisY - 38, 6, 76, 2); ctx.fill(); ctx.stroke();
  }

  // Bright spot at F (step >= 4)
  if (step >= 4) {
    const glow = lerp(0, 1, t);
    const grad = ctx.createRadialGradient(focalPt, axisY, 0, focalPt, axisY, 18);
    grad.addColorStop(0, `rgba(255,200,50,${glow * 0.9})`);
    grad.addColorStop(1, "rgba(255,200,50,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(focalPt, axisY, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(focalPt, axisY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "white"; ctx.fill();
  }

  // Measurement
  if (step >= 4) {
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lensX, axisY + 72); ctx.lineTo(focalPt, axisY + 72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lensX, axisY + 67); ctx.lineTo(lensX, axisY + 77); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(focalPt, axisY + 67); ctx.lineTo(focalPt, axisY + 77); ctx.stroke();
    ctx.fillStyle = "#22c55e"; ctx.font = "9px system-ui"; ctx.textAlign = "center";
    ctx.fillText("f (focal length)", (lensX + focalPt) / 2, axisY + 86);
  }

  if (step >= 5) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "10px system-ui"; ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("P = 1/f(m) confirmed ✔", 110, 218);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 4. MAGNETIC FIELD LINES — animated compass + field lines
// ─────────────────────────────────────────────────────────────────

export function drawMagneticField(dc: DrawContext): void {
  const { ctx, step, t, isDark, tick } = dc;
  const W = 220, H = 226;
  const cx = 110, cy = 113;
  const magW = 70, magH = 26;

  ctx.save();
  ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Bar magnet
  // N half (red)
  ctx.fillStyle = "#ef4444";
  ctx.beginPath(); ctx.roundRect(cx - magW, cy - magH / 2, magW, magH, [4, 0, 0, 4]); ctx.fill();
  // S half (blue)
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath(); ctx.roundRect(cx, cy - magH / 2, magW, magH, [0, 4, 4, 0]); ctx.fill();
  // Border
  ctx.strokeStyle = isDark ? "#64748b" : "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(cx - magW, cy - magH / 2, magW * 2, magH, 4); ctx.stroke();
  // Labels
  ctx.fillStyle = "white"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center";
  ctx.fillText("N", cx - magW / 2, cy + 5);
  ctx.fillText("S", cx + magW / 2, cy + 5);

  // Field lines (step >= 1 to 5, each step reveals more lines)
  const linesVisible = step >= 1 ? Math.min(step, 5) : 0;
  const lineOpacity = step >= 1 ? lerp(0, 1, t) : 0;

  const fieldLines = [
    // Top arcs
    { scale: 0.6, flip: -1 },
    { scale: 1.0, flip: -1 },
    { scale: 1.5, flip: -1 },
    // Bottom arcs
    { scale: 0.6, flip: 1 },
    { scale: 1.0, flip: 1 },
    { scale: 1.5, flip: 1 },
  ];

  fieldLines.slice(0, linesVisible * 2).forEach((line, idx) => {
    const opacity = idx < (linesVisible - 1) * 2 ? lineOpacity : lineOpacity * lerp(0, 1, t);
    ctx.globalAlpha = opacity * 0.75;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.3;
    const ry = line.scale * 38 * line.flip;
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.5, magW * (0.5 + line.scale * 0.6), Math.abs(ry) * 1.2, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    // Arrow on field line
    if (opacity > 0.5) {
      const arrowX = cx - magW * 0.3;
      const arrowY = cy + ry * 0.5 - Math.abs(ry) * 1.2;
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY - 4);
      ctx.lineTo(arrowX + 6, arrowY);
      ctx.lineTo(arrowX, arrowY + 4);
      ctx.closePath();
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;

  // Animated compass (step >= 2)
  if (step >= 2) {
    const compassAngle = lerp(Math.PI * 0.5, -0.35, clamp((step - 2) + t, 0, 1));
    const compX = cx + magW + 38, compY = cy - 45;

    ctx.beginPath(); ctx.arc(compX, compY, 14, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? "#1e293b" : "white";
    ctx.fill();
    ctx.strokeStyle = isDark ? "#475569" : "#cbd5e1"; ctx.lineWidth = 1.5; ctx.stroke();

    // Needle
    ctx.save(); ctx.translate(compX, compY); ctx.rotate(compassAngle);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(4, 0); ctx.lineTo(0, 2); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath(); ctx.moveTo(0, 11); ctx.lineTo(4, 0); ctx.lineTo(0, -2); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
    ctx.font = "8px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Compass", compX, compY + 24);
  }

  // Dots being marked (step >= 3)
  if (step >= 3) {
    const dots = [
      { x: cx - magW - 20, y: cy - 30 },
      { x: cx - magW - 35, y: cy - 52 },
      { x: cx - magW - 20, y: cy - 72 },
      { x: cx + 10, y: cy - 80 },
    ];
    dots.slice(0, Math.min(step - 1, dots.length)).forEach(dot => {
      ctx.beginPath(); ctx.arc(dot.x, dot.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#6366f1"; ctx.fill();
    });
  }

  // Density label at poles (step >= 4)
  if (step >= 4) {
    ctx.fillStyle = isDark ? "#fbbf24" : "#92400e";
    ctx.font = "8px system-ui"; ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("Dense (strong)", cx - magW / 2, cy - magH / 2 - 8);
    ctx.fillText("Dense (strong)", cx + magW / 2, cy - magH / 2 - 8);
    ctx.globalAlpha = 1;
  }

  if (step >= 5) {
    ctx.fillStyle = isDark ? "#86efac" : "#15803d";
    ctx.font = "10px system-ui"; ctx.textAlign = "center";
    ctx.globalAlpha = lerp(0, 1, t);
    ctx.fillText("N→S outside, never cross ✔", 110, 218);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// Registry
export type DrawFn = (dc: DrawContext) => void;

export const PHYSICS_DRAW_REGISTRY: Record<string, DrawFn> = {
  "phys-ohms-law": drawOhmsLaw,
  "phys-concave-mirror": drawConcaveMirror,
  "phys-convex-lens": drawConvexLens,
  "phys-magnetic-field": drawMagneticField,
};

export function getPhysicsDrawFn(experimentId: string): DrawFn | null {
  return PHYSICS_DRAW_REGISTRY[experimentId] ?? null;
}