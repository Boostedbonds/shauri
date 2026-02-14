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
      {/* ================= INTRO SCREEN ================= */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            onClick={handleEnter}
          >
            <motion.div
              style={{
                position: "absolute",
                bottom: "42%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "800px",
                height: "500px",
                background:
                  "radial-gradient(circle at center, rgba(255,210,120,0.4), transparent 70%)",
                filter: "blur(120px)",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "75%",
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
                d="M0,730 
                   C200,690 400,660 620,620 
                   C680,590 710,550 720,500
                   C730,550 760,590 820,620
                   C1000,660 1200,700 1440,720 
                   L1440,800 L0,800 Z"
                fill="#000000"
              />
            </svg>

            <motion.div
              style={{ textAlign: "center", position: "relative" }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.6 }}
            >
              <h1
                style={{
                  fontSize: "64px",
                  letterSpacing: "0.5em",
                  fontWeight: 700,
                  color: "#D4AF37",
                  fontFamily: "Georgia, serif",
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

              <motion.p
                style={{
                  marginTop: 28,
                  fontSize: "12px",
                  letterSpacing: "0.3em",
                  color: "#D4AF37",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                BEGIN THE ASCENT
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

      {/* ================= ACCESS PAGE (Enhanced Only) ================= */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(to bottom, #0B1220 0%, #0F172A 60%, #111827 100%)",
            padding: "40px 20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Gold Mountain Transparent Background */}
          <motion.img
            src="/shauri-hero.png"
            alt="Shauri Background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.12 }}
            transition={{ duration: 2 }}
            style={{
              position: "absolute",
              top: "38%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "900px",
              maxWidth: "90%",
              pointerEvents: "none",
              filter: "drop-shadow(0 0 40px rgba(212,175,55,0.4))",
            }}
          />

          {/* Soft Gold Glow */}
          <div
            style={{
              position: "absolute",
              top: "38%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "900px",
              height: "600px",
              background:
                "radial-gradient(circle, rgba(212,175,55,0.15), transparent 70%)",
              filter: "blur(120px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ textAlign: "center", marginBottom: 50, zIndex: 2 }}>
            <h1
              style={{
                fontSize: "46px",
                letterSpacing: "0.35em",
                fontWeight: 700,
                color: "#D4AF37",
                fontFamily: "Georgia, serif",
              }}
            >
              SHAURI
            </h1>

            <p
              style={{
                marginTop: 14,
                fontSize: "14px",
                letterSpacing: "0.15em",
                color: "#cbd5e1",
              }}
            >
              Aligned. Adaptive. Guiding Excellence.
            </p>

            <p
              style={{
                marginTop: 18,
                fontSize: "13px",
                color: "#94a3b8",
              }}
            >
              CBSE-Aligned Learning Platform.
            </p>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{
              display: "grid",
              gap: 18,
              width: "380px",
              padding: 28,
              borderRadius: 18,
              backdropFilter: "blur(16px)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              zIndex: 2,
            }}
          >
            <input
              type="text"
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
              style={inputStyle}
            />

            {error && (
              <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: 14,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(to right, #D4AF37, #C89B2B)",
                color: "#0f172a",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 8px 25px rgba(212,175,55,0.45)",
              }}
            >
              ENTER SHAURI
            </motion.button>
          </motion.form>

          <p
            style={{
              marginTop: 28,
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "#64748b",
              zIndex: 2,
            }}
          >
            Crafted for Focused Minds.
          </p>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontSize: 14,
};
