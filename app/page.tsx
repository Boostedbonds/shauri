"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

    const ctx = {
      name: name.trim(),
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem("shauri_student", JSON.stringify(ctx));

    document.cookie = `shauri_name=${encodeURIComponent(ctx.name)}; path=/; SameSite=Lax`;
    document.cookie = `shauri_class=${encodeURIComponent(ctx.class)}; path=/; SameSite=Lax`;

    window.location.href = "/modes";
  }

  return (
    <div className={spaceGrotesk.className}>

      {/* ================= INTRO ================= */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background:
                "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
              overflow: "hidden",
            }}
          >

            {/* SUN — perfectly aligned with summit tip */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                left: "50%",
                bottom: "50%",
                transform: "translate(-50%, 50%)",
                width: "480px",
                height: "480px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,230,150,0.95) 0%, rgba(255,220,140,0.65) 20%, rgba(255,220,140,0.35) 40%, rgba(255,220,140,0.15) 55%, rgba(255,220,140,0.06) 65%, transparent 75%)",
                filter: "blur(6px)",
                cursor: "pointer",
                zIndex: 1,
              }}
              animate={{
                opacity: [0.7, 1, 0.7],
                scale: [0.97, 1.06, 0.97],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
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

            {/* BEGIN THE ASCENT — summit tip */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                left: "50%",
                bottom: "50%",
                transform: "translate(-50%, 140%)",
                zIndex: 3,
                cursor: "pointer",
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
                textShadow: [
                  "0 0 8px rgba(255,215,120,0.5)",
                  "0 0 20px rgba(255,215,120,1)",
                  "0 0 8px rgba(255,215,120,0.5)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.32em",
                  color: "rgba(255,215,120,0.95)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                BEGIN THE ASCENT
              </div>
            </motion.div>

            {/* TITLE */}
            <div
              style={{
                position: "absolute",
                top: "32%",
                width: "100%",
                textAlign: "center",
                zIndex: 3,
              }}
            >
              <h1
                style={{
                  fontSize: "64px",
                  letterSpacing: "0.55em",
                  fontWeight: 600,
                  color: "#D4AF37",
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: 20,
                  letterSpacing: "0.28em",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Aligned. Adaptive. Guiding Excellence.
              </p>

              <p
                style={{
                  marginTop: 10,
                  letterSpacing: "0.22em",
                  fontSize: "12px",
                  color: "rgba(212,175,55,0.85)",
                }}
              >
                CBSE-Aligned Adaptive Learning Platform
              </p>
            </div>

            {/* TRANSITION */}
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

      {/* ================= ACCESS ================= */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(to bottom, #FFF3D9, #FFE4B3, #E6F2FF, #F8FAFC)",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              letterSpacing: "0.55em",
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            SHAURI
          </h1>

          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: 30,
              display: "grid",
              gap: 16,
              width: 320,
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
              {[6,7,8,9,10,11,12].map(c => (
                <option key={c} value={`Class ${c}`}>Class {c}</option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Access Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={inputStyle}
            />

            {error && <div style={{color:"red"}}>{error}</div>}

            <button type="submit" style={buttonStyle}>
              STEP IN
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ccc",
};

const buttonStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 999,
  border: "1px solid #D4AF37",
  background: "white",
  letterSpacing: "0.25em",
  cursor: "pointer",
};
