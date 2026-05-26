"use client";

/**
 * SHAURI Theme Toggle
 *
 * Two variants:
 *   variant="header"   — for cream page headers (ModeSelector, etc.)
 *   variant="topbar"   — for navy mode topbars (Learn, AV, Oral)
 *
 * Behavior:
 *   · Animated pill toggle: ☀ DAWN ↔ 🌙 NIGHT
 *   · Smooth 350ms CSS transition (handled by globals.css)
 *   · No text labels in compact mode (icon only on small screens)
 */

import React from "react";
import { useTheme } from "./ThemeProvider";

type Variant = "header" | "topbar";

export default function ThemeToggle({ variant = "header" }: { variant?: Variant }) {
  const { toggle, isDawn } = useTheme();

  const isHeader  = variant === "header";

  // ── Styles per variant ──────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          0,
    borderRadius: 999,
    padding:      "3px",
    cursor:       "pointer",
    border:       isHeader
      ? "1px solid rgba(212,175,55,0.40)"
      : "1px solid rgba(212,175,55,0.22)",
    background:   isHeader
      ? "rgba(255,255,255,0.50)"
      : "rgba(255,255,255,0.06)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    transition:   "background 0.35s ease, border-color 0.35s ease",
    userSelect:   "none",
    flexShrink:   0,
  };

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display:      "inline-flex",
    alignItems:   "center",
    gap:          5,
    padding:      "5px 11px",
    borderRadius: 999,
    fontSize:     10,
    fontFamily:   "'Orbitron', sans-serif",
    fontWeight:   700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    transition:   "background 0.25s ease, color 0.25s ease",
    background:   active
      ? (isHeader ? "rgba(212,175,55,0.18)" : "rgba(212,175,55,0.16)")
      : "transparent",
    color: active
      ? (isHeader ? "#0a2540" : "#d4af37")
      : (isHeader ? "#94a3b8" : "rgba(255,255,255,0.30)"),
    whiteSpace: "nowrap",
  });

  const iconStyle: React.CSSProperties = {
    fontSize: 13,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
  };

  return (
    <button
      onClick={toggle}
      style={containerStyle}
      aria-label={`Switch to ${isDawn ? "Night" : "Dawn"} theme`}
      title={`Switch to ${isDawn ? "Night" : "Dawn"} theme`}
    >
      {/* Dawn option */}
      <span style={pillStyle(isDawn)}>
        <span style={iconStyle}>☀️</span>
        <span className="shauri-toggle-label">Dawn</span>
      </span>

      {/* Night option */}
      <span style={pillStyle(!isDawn)}>
        <span style={iconStyle}>🌙</span>
        <span className="shauri-toggle-label">Night</span>
      </span>

      <style>{`
        /* Hide labels on very small screens, show icons only */
        @media (max-width: 480px) {
          .shauri-toggle-label { display: none; }
        }
      `}</style>
    </button>
  );
}