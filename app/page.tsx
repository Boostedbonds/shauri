"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ACCESS_CODE = "0330";

const futuristicFont =
  "'Space Grotesk', 'Inter', 'Segoe UI', system-ui, sans-serif";

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

    document.cookie = `shauri_name=${encodeURIComponent(
      studentContext.name
    )}; path=/; SameSite=Lax`;

    document.cookie = `shauri_class=${encodeURIComponent(
      studentContext.class
    )}; path=/; SameSite=Lax`;

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
              background:
                "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
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
                d="M0,730 C200,690 400,660 620,620 C680,590 710,550 720,500 C730,550 760,590 820,620 C1000,660 1200,700 1440,720 L1440,800 L0,800 Z"
                fill="#000000"
              />
            </svg>

            <motion.div
              style={{ textAlign: "center", position: "relative" }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.6 }}
            >
              {/* FUTURISTIC SHAURI TITLE */}
              <h1
                style={{
                  fontSize: "64px",
                  letterSpacing: "0.55em",
                  fontWeight: 600,
                  color: "#D4AF37",
                  fontFamily: futuristicFont,
                  textRendering: "optimizeLegibility",
                }}
              >
                SHAURI
              </h1>

              {/* TAGLINE */}
              <p
                style={{
                  marginTop: 24,
                  fontSize: "14px",
                  letterSpacing: "0.22em",
                  color: "rgba(203,213,225,0.85)",
                  fontFamily: futuristicFont,
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
                  fontFamily: futuristicFont,
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

      {/* ================= ACCESS PAGE ================= */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 40%, #E6F2FF 85%, #F8FAFC 100%)",
            padding: "40px 20px",
            position: "relative",
          }}
        >
          {/* HEADER */}
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <h1
              style={{
                fontSize: "48px",
                letterSpacing: "0.55em",
                fontWeight: 600,
                color: "#1e293b",
                fontFamily: futuristicFont,
              }}
            >
              SHAURI
            </h1>

            <p
              style={{
                marginTop: 16,
                fontSize: "15px",
                letterSpacing: "0.22em",
                color: "rgba(30,41,59,0.75)",
                fontFamily: futuristicFont,
              }}
            >
              Aligned. Adaptive. Guiding Excellence.
            </p>

            <p
              style={{
                marginTop: 12,
                fontSize: "13px",
                color: "rgba(30,41,59,0.6)",
                fontFamily: futuristicFont,
              }}
            >
              CBSE-Aligned Learning Platform
            </p>
          </div>

          {/* FORM */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{
              display: "grid",
              gap: 18,
              width: "380px",
              padding: 28,
              borderRadius: 18,
              backdropFilter: "blur(14px)",
              background: "rgba(255,255,255,0.85)",
              boxShadow: "0 25px 70px rgba(255,180,80,0.25)",
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
              <div style={{ color: "#dc2626", fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* TOUCH PAD */}
            <motion.button
              type="submit"
              animate={{
                boxShadow: [
                  "0 0 12px rgba(212,175,55,0.2)",
                  "0 0 28px rgba(212,175,55,0.5)",
                  "0 0 12px rgba(212,175,55,0.2)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              whileHover={{
                scale: 1.08,
                boxShadow: "0 0 50px rgba(212,175,55,0.8)",
              }}
              whileTap={{
                scale: 0.94,
                boxShadow: "0 0 70px rgba(212,175,55,1)",
              }}
              style={{
                padding: "16px 34px",
                borderRadius: "999px",
                border: "1px solid rgba(212,175,55,0.7)",
                background: "rgba(255,255,255,0.75)",
                color: "#1e293b",
                fontWeight: 600,
                letterSpacing: "0.28em",
                fontFamily: futuristicFont,
                cursor: "pointer",
              }}
            >
              STEP IN
            </motion.button>
          </motion.form>

          <p
            style={{
              marginTop: 28,
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "#64748b",
              fontFamily: futuristicFont,
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
  border: "1px solid #e2e8f0",
  background: "rgba(255,255,255,0.9)",
  fontSize: 14,
};
