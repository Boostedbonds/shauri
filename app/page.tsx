"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

export default function HomePage() {
  const [entered, setEntered]       = useState(false);
  const [warp, setWarp]             = useState(false);
  const [showBtn, setShowBtn]       = useState(false);
  const [name, setName]             = useState("");
  const [studentClass, setStudentClass] = useState("");
  const board = "CBSE";
  const [code, setCode]             = useState("");
  const [error, setError]           = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // ── Measure viewport (SSR-safe) ─────────────────────────────
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  useEffect(() => {
    function measure() { setVw(window.innerWidth); setVh(window.innerHeight); }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Reveal CTA button after animations finish
  useEffect(() => {
    const t = setTimeout(() => setShowBtn(true), 1100);
    return () => clearTimeout(t);
  }, []);

  const ready = vw > 0;
  // Portrait = phone held vertically
  const isPortrait = ready && vw < 600 && vh > vw;

  // ── SVG coordinate system ────────────────────────────────────
  // viewBox is always 1440 × 900; preserveAspectRatio="none"
  // stretches it to fill the screen exactly.
  // We compute PEAK_Y as a % of SVG_H so it always lands:
  //   • below the title block  (~top 40% on portrait, ~top 35% on desktop)
  //   • with clear sky gap between title and mountain
  const SVG_W = 1440;
  const SVG_H = 900;

  // Title lives at top 30% → ends ~38%.
  // Peak at 62% on portrait, 58% on desktop → always below title.
  const peakFraction = isPortrait ? 0.63 : 0.58;
  const PEAK_X = SVG_W / 2;
  const PEAK_Y = SVG_H * peakFraction;

  // Mountain: triangle from bottom-left and bottom-right to the peak
  const mountainPath = `M0,${SVG_H} L${PEAK_X},${PEAK_Y} L${SVG_W},${SVG_H} Z`;

  // Button positioned via CSS (no SVG foreignObject) — fully iOS Safari compatible

  // Beam: from top of SVG down to peak
  const BEAM_TOP_Y = 0;

  // ── Handlers ────────────────────────────────────────────────
  function handleEnter() {
    setWarp(true);
    setTimeout(() => setEntered(true), 900);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim())  return setError("Please enter student name");
    if (!studentClass) return setError("Please select class");
    if (code !== ACCESS_CODE) return setError("Invalid access code");
    const ctx = { name: name.trim(), class: studentClass.replace("Class ", ""), board };
    localStorage.setItem("shauri_student", JSON.stringify(ctx));
    document.cookie = `shauri_name=${encodeURIComponent(ctx.name)}; path=/`;
    document.cookie = `shauri_class=${encodeURIComponent(ctx.class)}; path=/`;
    window.location.href = "/modes";
  }

  const getInputStyle = (field: string): React.CSSProperties => ({
    ...inputBase,
    border: focusedField === field ? "1.5px solid #d4af37" : "1px solid #d4af37",
    boxShadow: focusedField === field
      ? "0 0 0 3px rgba(212,175,55,0.25), 0 0 12px rgba(212,175,55,0.15)"
      : "none",
    background: focusedField === field ? "#fffef8" : "#f8fafc",
    transition: "border 0.18s, box-shadow 0.18s, background 0.18s",
  });

  return (
    <div className={orbitron.className} style={{ minHeight: "100dvh" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.12; }
          50%       { opacity: 0.80; }
        }
        @keyframes glowBreathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1.00); opacity: 0.82; }
          50%       { transform: translate(-50%, -50%) scale(1.06); opacity: 1.00; }
        }
        @keyframes beamPulse {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 1.00; }
        }

        .ascent-btn {
          position: relative;
          padding: 12px 30px;
          border-radius: 999px;
          border: 1px solid rgba(255, 215, 0, 0.55);
          overflow: hidden;
          color: #FFD700;
          letter-spacing: 0.22em;
          font-size: clamp(10px, 2.8vw, 13px);
          white-space: nowrap;
          background: rgba(0, 8, 20, 0.72);
          cursor: pointer;
          font-family: inherit;
          transition: transform 0.15s, box-shadow 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .ascent-btn:hover  { transform: scale(1.05); box-shadow: 0 0 20px rgba(255,215,0,0.38); }
        .ascent-btn:active { transform: scale(0.97); }
        .ascent-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -60%;
          width: 40%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,215,0,0.55), transparent);
          animation: shimmer 2.4s infinite;
        }

        .shauri-select { appearance: none; -webkit-appearance: none; }
        .shauri-select option { color: #0f172a !important; background: #f8fafc; }
      `}</style>

      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed", inset: 0,
              background: "linear-gradient(to top, #000814 0%, #001428 30%, #001d3d 65%, #0a2540 100%)",
              overflow: "hidden",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* ── Stars ── */}
            {ready && Array.from({ length: isPortrait ? 38 : 60 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                // Deterministic placement via seeded math (no random on server)
                top:  `${2 + (i * 11.7 + 3) % 54}%`,
                left: `${(i * 19.3 + 7) % 100}%`,
                width:  i % 6 === 0 ? 2.5 : 1.5,
                height: i % 6 === 0 ? 2.5 : 1.5,
                borderRadius: "50%",
                background: "#fff",
                animationName: "twinkle",
                animationDuration: `${2.0 + (i % 5) * 0.65}s`,
                animationDelay:    `${(i % 9) * 0.28}s`,
                animationIterationCount: "infinite",
                animationTimingFunction: "ease-in-out",
                animationDirection: "alternate",
              }} />
            ))}

            {/* ── Sun / glow orb ── */}
            {/* Centred at 30% from top — translate(-50%,-50%) puts centre on that point */}
            <div style={{
              position: "absolute",
              top: "30%", left: "50%",
              transform: "translate(-50%, -50%)",
              width:  isPortrait ? "min(260px, 72vw)" : 520,
              height: isPortrait ? "min(260px, 72vw)" : 520,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,215,120,1) 0%, rgba(255,175,50,0.55) 45%, transparent 72%)",
              animationName: "glowBreathe",
              animationDuration: "4s",
              animationIterationCount: "infinite",
              animationTimingFunction: "ease-in-out",
            }} />

            {/* ── Title block ── */}
            {/* Vertically centred at 30% — same as glow so title sits in the sun */}
            <div style={{
              position: "absolute",
              top: "30%", width: "100%",
              textAlign: "center",
              transform: "translateY(-50%)",
              zIndex: 10,
              padding: "0 16px",
              pointerEvents: "none",
            }}>
              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                style={{
                  fontSize: isPortrait ? "clamp(36px, 14vw, 60px)" : "clamp(44px, 10vw, 78px)",
                  letterSpacing: isPortrait ? "0.38em" : "0.55em",
                  fontWeight: 700,
                  color: "#FFD700",
                  margin: 0, lineHeight: 1,
                  textShadow: "0 0 22px rgba(255,215,120,0.95), 0 0 44px rgba(255,200,80,0.65), 0 2px 8px rgba(0,0,0,0.85)",
                }}
              >
                SHAURI
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                style={{
                  marginTop: 10,
                  color: "#fff",
                  letterSpacing: isPortrait ? "0.07em" : "0.15em",
                  fontSize: isPortrait ? "clamp(8px, 2.8vw, 11px)" : "clamp(10px, 2vw, 14px)",
                  opacity: 0.9,
                }}
              >
                THE COURAGE TO MASTER THE FUTURE
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.95, duration: 0.6 }}
                style={{
                  marginTop: 5,
                  color: "#FFD700",
                  fontSize: isPortrait ? "clamp(7px, 2.2vw, 10px)" : "clamp(9px, 1.5vw, 12px)",
                  letterSpacing: isPortrait ? "0.06em" : "0.14em",
                  opacity: 0.75,
                }}
              >
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </motion.p>
            </div>

            {/* ── SVG: Mountain + beam + button ── */}
            {ready && (
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="none"
                style={{
                  position: "absolute", inset: 0,
                  width: "100%", height: "100%",
                  overflow: "visible",
                }}
              >
                {/* ── Beam of hope: tapered gold light rising from peak ── */}
                <defs>
                  {/* Vertical fade: bright at peak base, invisible at top */}
                  <linearGradient id="beamFade" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="rgba(255,215,80,0.55)" />
                    <stop offset="60%" stopColor="rgba(255,215,80,0.12)" />
                    <stop offset="100%" stopColor="rgba(255,215,80,0)" />
                  </linearGradient>
                  {/* Glow layer: softer, wider */}
                  <linearGradient id="beamGlow" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="rgba(255,200,60,0.22)" />
                    <stop offset="50%" stopColor="rgba(255,200,60,0.06)" />
                    <stop offset="100%" stopColor="rgba(255,200,60,0)" />
                  </linearGradient>
                  <filter id="beamBlur">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                </defs>

                {/* Outer soft glow — wide trapezoid, blurred */}
                <motion.polygon
                  points={`${PEAK_X - (isPortrait ? 60 : 80)},0 ${PEAK_X + (isPortrait ? 60 : 80)},0 ${PEAK_X + 4},${PEAK_Y} ${PEAK_X - 4},${PEAK_Y}`}
                  fill="url(#beamGlow)"
                  filter="url(#beamBlur)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 1.4 }}
                  style={{
                    animationName: "beamPulse",
                    animationDuration: "4s",
                    animationIterationCount: "infinite",
                    animationTimingFunction: "ease-in-out",
                  }}
                />

                {/* Inner bright core — narrow trapezoid */}
                <motion.polygon
                  points={`${PEAK_X - (isPortrait ? 18 : 24)},0 ${PEAK_X + (isPortrait ? 18 : 24)},0 ${PEAK_X + 2},${PEAK_Y} ${PEAK_X - 2},${PEAK_Y}`}
                  fill="url(#beamFade)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1.2 }}
                  style={{
                    animationName: "beamPulse",
                    animationDuration: "3.5s",
                    animationIterationCount: "infinite",
                    animationTimingFunction: "ease-in-out",
                  }}
                />

                {/* Mountain silhouette */}
                <motion.path
                  d={mountainPath}
                  fill="black"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.9 }}
                />

                {/* Button rendered outside SVG for iOS Safari compatibility */}
              </svg>
            )}

            {/* ── CTA Button — CSS absolute, iOS Safari safe ── */}
            {ready && (
              <div style={{
                position: "absolute",
                top: `calc(${peakFraction * 100}% - 52px)`,
                left: "50%",
                transform: showBtn
                  ? "translateX(-50%) translateY(0px)"
                  : "translateX(-50%) translateY(12px)",
                zIndex: 20,
                opacity: showBtn ? 1 : 0,
                transition: "opacity 0.65s ease, transform 0.65s ease",
                pointerEvents: showBtn ? "auto" : "none",
              }}>
                <button
                  className={`ascent-btn ${orbitron.className}`}
                  onClick={handleEnter}
                >
                  BEGIN THE ASCENT
                </button>
              </div>
            )}

            {/* Warp flash to white on enter */}
            {warp && (
              <motion.div
                style={{ position: "absolute", inset: 0, background: "white", zIndex: 20 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          ACCESS SCREEN (after "Begin the Ascent")
         ══════════════════════════════════════════════ */}
      {entered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            minHeight: "100dvh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            background: "linear-gradient(160deg, #ede0c0 0%, #d9c48a 55%, #c9ae70 100%)",
            padding: "24px 20px",
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{ textAlign: "center", marginBottom: 32 }}
          >
            <h1 style={{
              fontSize: "clamp(28px, 10vw, 52px)",
              letterSpacing: "0.38em",
              fontWeight: 700, color: "#0f172a",
              margin: 0,
              textShadow: "0 2px 4px rgba(0,0,0,0.12)",
            }}>
              SHAURI
            </h1>
            <p style={{
              marginTop: 10, opacity: 0.6,
              fontSize: "clamp(10px, 2.8vw, 13px)",
              letterSpacing: "0.04em",
              fontFamily: "inherit",
            }}>
              CBSE-Aligned. Adaptive. Built for your growth.
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            style={{ display: "grid", gap: 14, width: "100%", maxWidth: 300 }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              placeholder="Student Name"
              style={getInputStyle("name")}
            />

            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              onFocus={() => setFocusedField("class")}
              onBlur={() => setFocusedField(null)}
              className="shauri-select"
              style={{
                ...getInputStyle("class"),
                color: studentClass ? "#0f172a" : "#94a3b8",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23b8a060' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                paddingRight: 36,
              }}
            >
              <option value="" disabled style={{ color: "#94a3b8" }}>Select Class</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <option key={c} value={`Class ${c}`}>Class {c}</option>
              ))}
            </select>

            {/* Masked access code */}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={"★".repeat(code.length)}
              onFocus={() => setFocusedField("code")}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => {
                if (e.target.value.length < code.length) {
                  setCode((prev) => prev.slice(0, -1));
                } else {
                  setCode((prev) => prev + e.target.value.replace(/★/g, ""));
                }
              }}
              placeholder="Access Code"
              style={{
                ...getInputStyle("code"),
                letterSpacing: code.length > 0 ? "0.45em" : "0.02em",
                fontSize: code.length > 0 ? 18 : 14,
              }}
            />

            {error && (
              <p style={{
                color: "#dc2626", fontSize: 12, margin: 0,
                textAlign: "center", letterSpacing: "0.04em", fontFamily: "inherit",
              }}>{error}</p>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02, boxShadow: "0 0 0 3px rgba(212,175,55,0.3), 0 0 16px rgba(212,175,55,0.2)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "13px", borderRadius: 999,
                border: "1px solid #d4af37",
                background: "transparent", cursor: "pointer",
                color: "#0f172a", width: "100%",
                fontFamily: "inherit", letterSpacing: "0.2em",
                fontSize: 13, fontWeight: 700, marginTop: 4,
              }}
            >
              STEP IN
            </motion.button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: 36, opacity: 0.45, fontSize: 12,
              textAlign: "center", letterSpacing: "0.04em",
              fontFamily: "inherit", maxWidth: 280,
            }}
          >
            Discipline today builds the confidence of tomorrow.
          </motion.p>
        </motion.div>
      )}
    </div>
  );
}

// ── Shared base styles ───────────────────────────────────────
const inputBase: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d4af37",
  width: "100%",
  background: "#f8fafc",
  fontSize: 14,
  color: "#0f172a",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  letterSpacing: "0.02em",
};