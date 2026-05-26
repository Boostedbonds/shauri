"use client";

import ThemeToggle from "./ThemeToggle";

/**
 * SHAURI Global Header
 *
 * Used by: ModeSelector and any page-level context (NOT inside active modes).
 * In-mode top bars (Learn, AV, Oral) render their own nav directly and
 * include their own ThemeToggle with variant="topbar".
 *
 * Visual DNA: cream glass on Dawn, deep navy on Night.
 * Uses --s-* semantic tokens so both themes are respected.
 */
export default function Header({ onLogout }: { onLogout?: () => void }) {
  return (
    <header style={{
      padding:          "0 24px",
      height:           56,
      background:       "var(--s-header-bg)",
      backdropFilter:   "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom:     "1px solid var(--s-header-border)",
      display:          "flex",
      justifyContent:   "space-between",
      alignItems:       "center",
      flexShrink:       0,
      transition:       "background 0.35s ease, border-color 0.35s ease",
    }}>
      {/* Wordmark */}
      <div>
        <h2 style={{
          margin:          0,
          fontFamily:      "'Orbitron', sans-serif",
          fontSize:        18,
          fontWeight:      700,
          letterSpacing:   "0.36em",
          textTransform:   "uppercase",
          color:           "var(--s-gold)",
          lineHeight:      1,
          transition:      "color 0.35s ease",
        }}>
          SHAURI
        </h2>
        <small style={{
          fontFamily:    "'Orbitron', sans-serif",
          fontSize:      9,
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color:         "var(--s-text-secondary)",
          display:       "block",
          marginTop:     3,
          lineHeight:    1,
          transition:    "color 0.35s ease",
        }}>
          Aligned · Adaptive · Elite
        </small>
      </div>

      {/* Right side: theme toggle + optional logout */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ThemeToggle variant="header" />

        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              padding:       "7px 16px",
              borderRadius:  8,
              border:        "1px solid var(--s-border)",
              background:    "transparent",
              color:         "var(--s-text-secondary)",
              cursor:        "pointer",
              fontFamily:    "'Orbitron', sans-serif",
              fontWeight:    600,
              fontSize:      10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              transition:    "border-color 0.15s, color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--s-gold)";
              e.currentTarget.style.color       = "var(--s-text-primary)";
              e.currentTarget.style.background  = "var(--s-gold-glow)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--s-border)";
              e.currentTarget.style.color       = "var(--s-text-secondary)";
              e.currentTarget.style.background  = "transparent";
            }}
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}