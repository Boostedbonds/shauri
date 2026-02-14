"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ACCESS_CODE = "0330";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [error, setError] = useState("");
  const [entered, setEntered] = useState(false);
  const [warp, setWarp] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (code !== ACCESS_CODE) {
      setError("Invalid access code");
      return;
    }

    if (!name.trim()) {
      setError("Please enter student name");
      return;
    }

    if (!studentClass) {
      setError("Please select class");
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

    setTimeout(() => {
      window.location.href = "/modes";
    }, 50);
  }

  const handleEnter = () => {
    setWarp(true);
    setTimeout(() => setEntered(true), 900);
  };

  return (
    <>
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "linear-gradient(to top, #000814 0%, #001d3d 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              cursor: "pointer",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            onClick={handleEnter}
          >
            {/* Dawn Glow */}
            <motion.div
              style={{
                position: "absolute",
                bottom: "52%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "1100px",
                height: "700px",
                background:
                  "radial-gradient(circle at center, rgba(255,210,120,0.55), transparent 70%)",
                filter: "blur(100px)",
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "80%",
              }}
            >
              <defs>
                <filter id="ridgeGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background Layer (faint far mountains) */}
              <path
                d="
                  M0,620 
                  C200,580 400,560 600,540
                  C800,520 1000,540 1440,580
                  L1440,800 L0,800 Z
                "
                fill="rgba(0,0,0,0.35)"
              />

              {/* Mid Layer */}
              <path
                d="
                  M0,660
                  C180,610 340,590 480,580
                  C650,560 820,580 1000,610
                  C1150,630 1300,640 1440,660
                  L1440,800 L0,800 Z
                "
                fill="rgba(0,0,0,0.55)"
              />

              {/* Foreground Main Mountain */}
              <path
                d="
                  M0,700
                  C180,650 340,620 480,600
                  C600,580 670,540 720,480
                  C770,540 840,580 980,610
                  C1120,640 1250,660 1440,690
                  L1440,800 L0,800 Z
                "
                fill="#000000"
              />

              {/* Golden Ridge on Main Peak */}
              <path
                d="
                  M480,600
                  C600,580 670,540 720,480
                  C770,540 840,580 980,610
                "
                fill="none"
                stroke="#FFD166"
                strokeWidth="2.5"
                filter="url(#ridgeGlow)"
              />
            </svg>

            {/* Brand */}
            <motion.div
              style={{
                textAlign: "center",
                position: "relative",
                transform: "translateY(-20px)",
              }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.6 }}
            >
              <h1
                style={{
                  fontSize: "64px",
                  letterSpacing: "0.5em",
                  color: "#FFD166",
                  fontWeight: 600,
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: 24,
                  fontSize: "14px",
                  letterSpacing: "0.2em",
                  color: "#cbd5e1",
                }}
              >
                Aligned. Adaptive. Guiding Excellence.
              </p>

              {/* Summit Alignment */}
              <motion.p
                style={{
                  marginTop: 30,
                  fontSize: "12px",
                  letterSpacing: "0.3em",
                  color: "#FFD166",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                CLICK TO ENTER
              </motion.p>
            </motion.div>

            {warp && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "white",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(180deg, #f8fafc 0%, #e2f0ff 100%)",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: 48,
              borderRadius: 24,
              width: 480,
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: 28,
                  letterSpacing: "0.3em",
                  fontWeight: 600,
                }}
              >
                SHAURI
              </h2>
              <p style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>
                Aligned. Adaptive. Guiding Excellence.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              <input
                type="text"
                placeholder="Student Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: 14, borderRadius: 10, border: "1px solid #ccc" }}
              />

              <select
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                style={{ padding: 14, borderRadius: 10, border: "1px solid #ccc" }}
              >
                <option value="">Select Class</option>
                {[6, 7, 8, 9, 10, 11, 12].map((cls) => (
                  <option key={cls} value={cls}>
                    Class {cls}
                  </option>
                ))}
              </select>

              <input
                type="password"
                placeholder="Access Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ padding: 14, borderRadius: 10, border: "1px solid #ccc" }}
              />

              {error && (
                <div style={{ color: "red", fontSize: 13 }}>{error}</div>
              )}

              <button
                type="submit"
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Enter SHAURI
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
