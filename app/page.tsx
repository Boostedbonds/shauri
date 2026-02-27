"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [warp, setWarp] = useState(false);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const board = "CBSE";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

            {/* Sun glow */}
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

            {/* Title */}
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
              KEY FIX: wrap SVG in a relative-positioned div that matches the SVG dimensions.
              The button is then absolutely positioned inside this wrapper at
              left: 50% (= x=720/1440) and top: 37.5% (= y=300/800).
              This is pure CSS — no JS measurement, no viewport offset issues.
            */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "55%",
              // no overflow:hidden so button can visually protrude upward if needed
            }}>
              <svg
                viewBox="0 0 1440 800"
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  display: "block",
                }}
              >
                <path
                  d="M0,750 C360,680 660,580 720,300 C780,580 1080,680 1440,750 L1440,800 L0,800 Z"
                  fill="black"
                />
              </svg>

              {/* Button sits exactly at the SVG peak: 50% from left, 37.5% from top */}
              <motion.div
                onClick={handleEnter}
                style={{
                  position: "absolute",
                  top: "37.5%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  cursor: "pointer",
                  zIndex: 10,
                  width: "max-content",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <div style={{
                  position: "relative",
                  padding: "14px 42px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,215,0,0.5)",
                  overflow: "hidden",
                  color: "#FFD700",
                  letterSpacing: "0.35em",
                  fontSize: "clamp(10px, 2vw, 14px)",
                  whiteSpace: "nowrap",
                  background: "rgba(0,8,20,0.55)",
                }}>
                  <motion.div
                    style={{
                      position: "absolute", top: 0, left: "-100%",
                      width: "100%", height: "100%",
                      background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)",
                    }}
                    animate={{ left: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  BEGIN THE ASCENT
                </div>
              </motion.div>
            </div>

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
          <style>{`
            .shauri-select { appearance: none; -webkit-appearance: none; }
            .shauri-select option { color: #0f172a !important; background: #f8fafc; }
          `}</style>

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