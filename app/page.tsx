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

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>

      {/* ── LANDING SCREEN ── */}
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
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: i % 5 === 0 ? 2 : 1,
                  height: i % 5 === 0 ? 2 : 1,
                  borderRadius: "50%",
                  background: "white",
                  opacity: Math.random() * 0.7 + 0.2,
                  top: `${Math.random() * 60}%`,
                  left: `${Math.random() * 100}%`,
                }}
              />
            ))}

            {/* SUN glow */}
            <div
              style={{
                position: "absolute",
                top: "22%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 520,
                height: 520,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,1) 0%, rgba(255,180,60,0.6) 50%, transparent 80%)",
                filter: "blur(12px)",
              }}
            />

            {/* TITLE */}
            <div
              style={{
                position: "absolute",
                top: "22%",
                width: "100%",
                textAlign: "center",
                transform: "translateY(-50%)",
              }}
            >
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
                  textShadow:
                    "0 0 20px rgba(255,215,120,0.9), 0 0 40px rgba(255,200,80,0.6), 0 2px 6px rgba(0,0,0,0.8)",
                }}
              >
                SHAURI
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                style={{
                  marginTop: 12,
                  color: "#ffffff",
                  letterSpacing: "0.15em",
                  fontSize: "clamp(10px, 2vw, 14px)",
                }}
              >
                THE COURAGE TO MASTER THE FUTURE
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                style={{
                  color: "#FFD700",
                  fontSize: "clamp(9px, 1.5vw, 13px)",
                  letterSpacing: "0.15em",
                  marginTop: 6,
                  whiteSpace: "nowrap",
                }}
              >
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </motion.p>
            </div>

            {/* MOUNTAIN */}
            <svg
              viewBox="0 0 1440 800"
              style={{ position: "absolute", bottom: 0, width: "100%" }}
            >
              <path
                d="M0,730 C400,650 700,600 720,500 C740,600 1000,650 1440,720 L1440,800 L0,800 Z"
                fill="black"
              />
            </svg>

            {/* CTA BUTTON — positioned at mountain peak */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "28%",
                left: "50%",
                transform: "translateX(-50%)",
                cursor: "pointer",
                zIndex: 10,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <div
                style={{
                  position: "relative",
                  padding: "14px 42px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,215,0,0.5)",
                  overflow: "hidden",
                  color: "#FFD700",
                  letterSpacing: "0.35em",
                  fontSize: "clamp(10px, 2vw, 14px)",
                  whiteSpace: "nowrap",
                }}
              >
                {/* Running gold shimmer */}
                <motion.div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)",
                  }}
                  animate={{ left: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                BEGIN THE ASCENT
              </div>
            </motion.div>

            {/* WARP flash */}
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

      {/* ── ACCESS / LOGIN SCREEN ── */}
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
            <h1
              style={{
                fontSize: "clamp(32px, 8vw, 52px)",
                letterSpacing: "0.4em",
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                textShadow: "0 2px 4px rgba(0,0,0,0.15)",
              }}
            >
              SHAURI
            </h1>
            <p style={{ marginTop: 10, opacity: 0.65, fontSize: 13, letterSpacing: "0.05em" }}>
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
            {/* Name */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Student Name"
              style={inputStyle}
            />

            {/* Class */}
            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={{ ...inputStyle, color: studentClass ? "#0f172a" : "#94a3b8" }}
            >
              <option value="" disabled>Select Class</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <option key={c} value={`Class ${c}`}>Class {c}</option>
              ))}
            </select>

            {/* Access Code — star masked */}
            <input
              type="text"
              inputMode="numeric"
              value={"★".repeat(code.length)}
              onChange={(e) => {
                if (e.target.value.length < code.length) {
                  setCode((prev) => prev.slice(0, -1));
                } else {
                  const newChar = e.target.value.replace(/★/g, "");
                  setCode((prev) => prev + newChar);
                }
              }}
              placeholder="Access Code"
              style={{ ...inputStyle, letterSpacing: "0.4em", fontSize: 18 }}
            />

            {error && (
              <p style={{ color: "#dc2626", fontSize: 12, margin: 0, textAlign: "center", letterSpacing: "0.04em" }}>
                {error}
              </p>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                ...buttonStyle,
                fontFamily: "inherit",
                letterSpacing: "0.2em",
                fontSize: 13,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              STEP IN
            </motion.button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ marginTop: 36, opacity: 0.55, fontSize: 12, textAlign: "center", letterSpacing: "0.04em" }}
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