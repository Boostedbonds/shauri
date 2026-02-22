"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

function getDynamicLine() {
  const hour = new Date().getHours();
  if (hour < 5) return "The system is quiet… but listening.";
  if (hour < 12) return "A fresh mind learns faster.";
  if (hour < 17) return "Focus sharpens understanding.";
  if (hour < 22) return "Consistency builds mastery.";
  return "Even now, progress is possible.";
}

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [warp, setWarp] = useState(false);

  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [activeField, setActiveField] = useState<string | null>(null);

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
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem("shauri_student", JSON.stringify(studentContext));

    document.cookie = `shauri_name=${encodeURIComponent(studentContext.name)}; path=/; SameSite=Lax`;
    document.cookie = `shauri_class=${encodeURIComponent(studentContext.class)}; path=/; SameSite=Lax`;

    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>

      {/* HERO */}
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
            {/* SUN */}
            <div
              style={{
                position: "absolute",
                top: "22%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "520px",
                height: "520px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.95) 0%, rgba(255,160,40,0.5) 50%, transparent 80%)",
                filter: "blur(10px)",
              }}
            />

            {/* TITLE */}
            <div style={{ position: "absolute", top: "22%", width: "100%", textAlign: "center", zIndex: 5 }}>
              <h1
                style={{
                  fontSize: "72px",
                  letterSpacing: "0.5em",
                  fontWeight: 700,
                  background: "linear-gradient(to bottom, #FFD700, #D4AF37, #A67C00)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow:
                    "0 0 15px rgba(255,215,120,0.4), 0 2px 4px rgba(0,0,0,0.7)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ marginTop: 10, color: "#fff" }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p style={{ color: "#FFD700" }}>
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </p>
            </div>

            {/* MOUNTAIN */}
            <svg viewBox="0 0 1440 800" style={{ position: "absolute", bottom: 0 }}>
              <path
                d="M0,730 C400,650 700,600 720,500 C740,600 1000,650 1440,720 L1440,800 L0,800 Z"
                fill="black"
              />
            </svg>

            {/* CTA */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "33%",
                left: "50%",
                transform: "translateX(-50%)",
                letterSpacing: "0.4em",
                color: "#D4AF37",
                cursor: "pointer",
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              BEGIN THE ASCENT
              <div style={{ fontSize: "12px", marginTop: 8 }}>
                {getDynamicLine()}
              </div>
            </motion.div>

            {warp && (
              <motion.div
                style={{ position: "absolute", inset: 0, background: "white" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACCESS PAGE (your upgraded one kept) */}
      {entered && (
        <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <h1>SHAURI</h1>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student Name" style={inputStyle}/>
            <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} style={inputStyle}>
              <option value="">Select Class</option>
              {[6,7,8,9,10,11,12].map(c => <option key={c}>Class {c}</option>)}
            </select>
            <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access Code" style={inputStyle}/>
            <button style={buttonStyle}>STEP IN</button>
          </form>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  padding: "12px",
  borderRadius: "999px",
  border: "1px solid #D4AF37",
};