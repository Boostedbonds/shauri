"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

// Mountain peak is at y=480 in a 0-800 viewBox (60% down = 40% from top)
// This keeps it well below the title text which sits at ~30% of screen
// foreignObject centered on (720, 480): x=720-200=520, y=480-30=450
const PEAK_Y = 480;
const FO_W = 400;
const FO_H = 60;
const FO_X = 720 - FO_W / 2;   // = 520
const FO_Y = PEAK_Y - FO_H / 2; // = 450

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [warp, setWarp] = useState(false);
  const [showBtn, setShowBtn] = useState(false);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const board = "CBSE";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Reveal button after entrance delay
  useState(() => {
    const t = setTimeout(() => setShowBtn(true), 1100);
    return () => clearTimeout(t);
  });

  function handleEnter() {
    setWarp(true);
    setTimeout(() => setEntered(true), 900);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter student name");
    if (!studentClass) return setError("Please select class");
    if (code !== ACCESS_CODE) return setError("Invalid access code");

    const studentContext = {
      name: name.trim(),
      class: studentClass.replace("Class ", ""),
      board,
    };
    localStorage.setItem("shauri_student", JSON.stringify(studentContext));
    document.cookie = `shauri_name=${encodeURIComponent(studentContext.name)}; path=/`;
    document.cookie = `shauri_class=${encodeURIComponent(studentContext.class)}; path=/`;
    window.location.href = "/modes";
  }

  const getInputStyle = (fieldName: string): React.CSSProperties => ({
    ...inputStyle,
    border: focusedField === fieldName ? "1.5px solid #d4af37" : "1px solid #d4af37",
    boxShadow: focusedField === fieldName
      ? "0 0 0 3px rgba(212,175,55,0.25), 0 0 12px rgba(212,175,55,0.15)"
      : "none",
    background: focusedField === fieldName ? "#fffef8" : "#f8fafc",
    transition: "border 0.18s, box-shadow 0.18s, background 0.18s",
  });

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .ascent-btn {
          position: relative;
          padding: 13px 36px;
          border-radius: 999px;
          border: 1px solid rgba(255,215,0,0.5);
          overflow: hidden;
          color: #FFD700;
          letter-spacing: 0.3em;
          font-size: 13px;
          white-space: nowrap;
          background: rgba(0,8,20,0.65);
          cursor: pointer;
          font-family: inherit;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .ascent-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 18px rgba(255,215,0,0.35);
        }
        .ascent-btn:active { transform: scale(0.97); }
        .ascent-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -60%;
          width: 40%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,215,0,0.55), transparent);
          animation: shimmer 2.2s infinite;
        }
        .shauri-select { appearance: none; -webkit-appearance: none; }
        .shauri-select option { color: #0f172a !important; background: #f8fafc; }
      `}</style>

      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "linear-gradient(to top, #000814, #001d3d, #0a2540)",
              overflow: "hidden",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Stars */}
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                width: i % 5 === 0 ? 2 : 1,
                height: i % 5 === 0 ? 2 : 1,
                borderRadius: "50%",
                background: "white",
                opacity: Math.random() * 0.7 + 0.2,
                top: `${Math.random() * 60}%`,
                left: `${Math.random() * 100}%`,
              }} />
            ))}

            {/* Sun glow — centered at 30% from top */}
            <div style={{
              position: "absolute",
              top: "30%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 520,
              height: 520,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,215,120,1) 0%, rgba(255,180,60,0.6) 50%, transparent 80%)",
              filter: "blur(12px)",
            }} />

            {/* Title block — sits at 30% from top */}
            <div style={{
              position: "absolute",
              top: "30%",
              width: "100%",
              textAlign: "center",
              transform: "translateY(-50%)",
            }}>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                style={{
                  fontSize: "clamp(42px, 10vw, 76px)",
                  letterSpacing: "0.55em",
                  fontWeight: 700,
                  color: "#FFD700",
                  margin: 0,
                  textShadow: "0 0 20px rgba(255,215,120,0.9), 0 0 40px rgba(255,200,80,0.6), 0 2px 6px rgba(0,0,0,0.8)",
                }}
              >
                SHAURI
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                style={{ marginTop: 12, color: "#ffffff", letterSpacing: "0.15em", fontSize: "clamp(10px, 2vw, 14px)" }}
              >
                THE COURAGE TO MASTER THE FUTURE
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                style={{ color: "#FFD700", fontSize: "clamp(9px, 1.5vw, 13px)", letterSpacing: "0.15em", marginTop: 6, whiteSpace: "nowrap" }}
              >
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </motion.p>
            </div>

            {/*
              Full-viewport SVG.
              ViewBox: 0 0 1440 800
              Mountain peak at (720, 480) — that's 60% down the viewBox.
              At a typical 800px tall window, this maps to 480px from top,
              well below the title block which ends around ~55% (440px).
              The button foreignObject is centered exactly on (720, 480).
            */}
            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
            >
              {/* 
                Mountain path — peak at (720, 480).
                Wide, gentle slopes so it looks natural.
              */}
              <motion.path
                d="M0,800 C200,780 500,700 720,480 C940,700 1240,780 1440,800 L1440,800 L0,800 Z"
                fill="black"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              />

              {/*
                Button lives inside a foreignObject centered on the peak.
                x = 720 - 200 = 520
                y = 480 - 30  = 450
                width = 400, height = 60
              */}
              <foreignObject
                x={FO_X}
                y={FO_Y}
                width={FO_W}
                height={FO_H}
                style={{ overflow: "visible" }}
              >
                <div
                  // @ts-ignore
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: showBtn ? 1 : 0,
                    transform: showBtn ? "translateY(0)" : "translateY(8px)",
                    transition: "opacity 0.6s ease, transform 0.6s ease",
                  }}
                >
                  <button
                    className={`ascent-btn ${orbitron.className}`}
                    onClick={handleEnter}
                  >
                    BEGIN THE ASCENT
                  </button>
                </div>
              </foreignObject>
            </svg>

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

      {/* ACCESS SCREEN */}
      {entered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            background: "linear-gradient(to bottom, #e6d3a3, #d6c08d)",
            padding: "24px 16px",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{ textAlign: "center", marginBottom: 32 }}
          >
            <h1 style={{
              fontSize: "clamp(32px, 8vw, 52px)",
              letterSpacing: "0.4em",
              fontWeight: 700,
              color: "#0f172a",
              margin: 0,
              textShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}>SHAURI</h1>
            <p style={{ marginTop: 10, opacity: 0.65, fontSize: 13, letterSpacing: "0.05em", fontFamily: "inherit" }}>
              CBSE-Aligned. Adaptive. Built for your growth.
            </p>
          </motion.div>

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
                  const newChar = e.target.value.replace(/★/g, "");
                  setCode((prev) => prev + newChar);
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
              <p style={{ color: "#dc2626", fontSize: 12, margin: 0, textAlign: "center", letterSpacing: "0.04em", fontFamily: "inherit" }}>
                {error}
              </p>
            )}

            <motion.button
              type="submit"
              whileHover={{
                scale: 1.02,
                boxShadow: "0 0 0 3px rgba(212,175,55,0.3), 0 0 16px rgba(212,175,55,0.2)",
              }}
              whileTap={{ scale: 0.97 }}
              style={{ ...buttonStyle, fontFamily: "inherit", letterSpacing: "0.2em", fontSize: 13, fontWeight: 700, marginTop: 4 }}
            >
              STEP IN
            </motion.button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ marginTop: 36, opacity: 0.55, fontSize: 12, textAlign: "center", letterSpacing: "0.04em", fontFamily: "inherit" }}
          >
            Discipline today builds the confidence of tomorrow.
          </motion.p>
        </motion.div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
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

const buttonStyle: React.CSSProperties = {
  padding: "13px",
  borderRadius: 999,
  border: "1px solid #d4af37",
  background: "transparent",
  cursor: "pointer",
  color: "#0f172a",
  width: "100%",
};