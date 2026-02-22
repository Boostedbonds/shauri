"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

/* 🔥 Dynamic Line */
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

  function handleEnter() {
    setWarp(true);
    setTimeout(() => setEntered(true), 900);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter student name");
      return;
    }

    if (!studentClass) {
      setError("Please select class");
      return;
    }

    if (code !== ACCESS_CODE) {
      setError("Invalid access code");
      return;
    }

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
    <div
      className={orbitron.className}
      style={{
        width: "100%",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
              overflow: "hidden",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 🌅 SUN */}
            <motion.div
              style={{
                position: "absolute",
                top: "24%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(520px, 90vw)",
                height: "min(520px, 90vw)",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.95) 0%, rgba(255,200,80,0.7) 25%, rgba(255,170,40,0.45) 45%, rgba(255,140,0,0.25) 60%, rgba(255,120,0,0.12) 70%, transparent 85%)",
                filter: "blur(6px)",
                zIndex: 1,
              }}
              animate={{
                scale: [1, 1.04, 1],
                opacity: [0.9, 1, 0.9],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* 🌄 HORIZON BLENDING (NEW) */}
            <div
              style={{
                position: "absolute",
                bottom: "28%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "120%",
                height: "180px",
                background:
                  "radial-gradient(ellipse at center, rgba(255,180,80,0.35) 0%, rgba(255,140,40,0.18) 35%, rgba(255,120,0,0.08) 55%, transparent 75%)",
                filter: "blur(30px)",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />

            {/* SOFT GLOBAL GLOW */}
            <motion.div
              style={{
                position: "absolute",
                top: "26%",
                left: "50%",
                transform: "translate(-50%, -40%)",
                width: "min(720px, 140vw)",
                height: "min(720px, 140vw)",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.35) 0%, rgba(255,215,120,0.18) 40%, transparent 70%)",
                filter: "blur(28px)",
                pointerEvents: "none",
                zIndex: 1,
              }}
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
              }}
            />

            {/* TITLE */}
            <div
              style={{
                position: "absolute",
                top: "26%",
                width: "100%",
                textAlign: "center",
                zIndex: 4,
                padding: "0 20px",
              }}
            >
              <h1
                style={{
                  fontSize: "clamp(42px, 8vw, 72px)",
                  letterSpacing: "clamp(0.25em, 0.55em, 0.55em)",
                  fontWeight: 700,
                  color: "#D4AF37",
                  textShadow: "0 0 40px rgba(255,200,100,0.25)",
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: "14px",
                  fontSize: "clamp(11px, 2.5vw, 15px)",
                  letterSpacing: "0.30em",
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p
                style={{
                  marginTop: "6px",
                  fontSize: "clamp(10px, 2.3vw, 13px)",
                  letterSpacing: "0.28em",
                  color: "rgba(212,175,55,0.95)",
                }}
              >
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </p>
            </div>

            {/* 🌊 WAVES (slightly tuned) */}
            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "100%",
                zIndex: 2,
              }}
            >
              <path
                d="M0,640 C200,600 350,580 550,560 C750,540 950,570 1440,620 L1440,800 L0,800 Z"
                fill="#0a1f33"
              />
              <path
                d="M0,700 C200,650 400,620 600,600 C700,580 760,550 820,600 C1000,650 1200,680 1440,710 L1440,800 L0,800 Z"
                fill="#04121f"
              />
              <path
                d="M0,730 C200,690 400,660 620,620 C680,590 710,550 720,500 C730,550 760,590 820,620 C1000,660 1200,700 1440,720 L1440,800 L0,800 Z"
                fill="#000000"
              />
            </svg>

            {/* CTA */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "27.4%",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "clamp(10px, 2.2vw, 13px)",
                letterSpacing: "0.38em",
                color: "#D4AF37",
                cursor: "pointer",
                zIndex: 5,
                textAlign: "center",
                padding: "0 20px",
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              BEGIN THE ASCENT

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {getDynamicLine()}
              </div>
            </motion.div>

            {warp && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "white",
                  zIndex: 10,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FORM (UNCHANGED) */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            background:
              "linear-gradient(to bottom, #FFF3D9, #FFE4B3, #E6F2FF, #F8FAFC)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <h1 style={{ fontSize: "clamp(28px, 6vw, 42px)", letterSpacing: "0.45em", fontWeight: 700 }}>
            SHAURI
          </h1>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px", width: "100%", maxWidth: "340px" }}>
            <input placeholder="Student Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />

            <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} style={inputStyle}>
              <option value="">Select Class</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <option key={c}>Class {c}</option>
              ))}
            </select>

            <input type="password" placeholder="Access Code" value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />

            {error && <div style={{ color: "red", fontSize: "13px" }}>{error}</div>}

            <button style={buttonStyle}>STEP IN</button>
          </form>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #ccc",
  width: "100%",
  fontSize: "16px",
};

const buttonStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "999px",
  border: "1px solid #D4AF37",
  background: "white",
  letterSpacing: "0.25em",
  cursor: "pointer",
  fontSize: "14px",
  width: "100%",
};