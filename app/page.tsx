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

    document.cookie = `shauri_name=${encodeURIComponent(
      studentContext.name
    )}; path=/; SameSite=Lax`;

    document.cookie = `shauri_class=${encodeURIComponent(
      studentContext.class
    )}; path=/; SameSite=Lax`;

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
      {/* ================= INTRO (FROZEN — UNTOUCHED) ================= */}
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

            {/* SUN */}
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
                  "radial-gradient(circle, rgba(255,215,120,0.55) 0%, rgba(255,215,120,0.32) 30%, rgba(255,215,120,0.18) 50%, rgba(255,215,120,0.08) 70%, transparent 90%)",
                filter: "blur(24px)",
                pointerEvents: "none",
                zIndex: 1,
              }}
              animate={{
                opacity: [0.8, 1, 0.8],
                scale: [1, 1.03, 1],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
              }}
            />

            {/* TITLE BLOCK */}
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

            {/* LIGHT BEAM */}
            <motion.div
              style={{
                position: "absolute",
                top: "34%",
                bottom: "27%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(160px, 20vw)",
                background:
                  "linear-gradient(to bottom, rgba(255,215,120,0.35), rgba(255,215,120,0.18), rgba(255,215,120,0.08), transparent)",
                filter: "blur(14px)",
                borderRadius: "80px",
                cursor: "pointer",
                zIndex: 3,
              }}
              animate={{
                opacity: [0.65, 1, 0.65],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
              onClick={handleEnter}
            />

            {/* MOUNTAIN */}
            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "75%",
                zIndex: 2,
              }}
            >
              <path
                d="M0,640 C200,600 350,580 550,560 C750,540 950,570 1440,620 L1440,800 L0,800 Z"
                fill="#061a2d"
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

            {/* BEGIN THE ASCENT */}
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
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              BEGIN THE ASCENT
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

      {/* ================= ACCESS PAGE ================= */}
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
          <h1
            style={{
              fontSize: "clamp(28px, 6vw, 42px)",
              letterSpacing: "0.45em",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "10px",
              textAlign: "center",
            }}
          >
            SHAURI
          </h1>

          <p
            style={{
              fontSize: "clamp(10px, 2.5vw, 13px)",
              letterSpacing: "0.30em",
              color: "#334155",
              marginBottom: "4px",
              textAlign: "center",
            }}
          >
            THE COURAGE TO MASTER THE FUTURE
          </p>

          <p
            style={{
              fontSize: "clamp(9px, 2.3vw, 11px)",
              letterSpacing: "0.26em",
              color: "#64748b",
              marginBottom: "28px",
              textAlign: "center",
            }}
          >
            CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: "16px",
              width: "100%",
              maxWidth: "340px",
            }}
          >
            <input
              placeholder="Student Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />

            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select Class</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <option key={c}>Class {c}</option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Access Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={inputStyle}
            />

            {error && (
              <div style={{ color: "red", fontSize: "13px" }}>{error}</div>
            )}

            <button style={buttonStyle}>STEP IN</button>
          </form>

          <p
            style={{
              marginTop: "22px",
              fontSize: "clamp(9px, 2vw, 10px)",
              letterSpacing: "0.18em",
              color: "#64748b",
              textAlign: "center",
              maxWidth: "420px",
            }}
          >
            Private. Secure. Used only to guide your learning journey. Never
            shared.
          </p>
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
