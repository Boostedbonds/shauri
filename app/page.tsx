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
      {/* ================= CINEMATIC INTRO ================= */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              overflow: "hidden",
              background: "linear-gradient(to top, #000814 0%, #001d3d 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              cursor: "pointer",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            onClick={handleEnter}
          >
            {/* Golden Horizon Glow */}
            <div
              style={{
                position: "absolute",
                bottom: "35%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "800px",
                height: "400px",
                background:
                  "radial-gradient(circle at center, rgba(255,204,102,0.6), transparent 70%)",
                filter: "blur(60px)",
              }}
            />

            {/* Mountain Silhouette */}
            <svg
              viewBox="0 0 1440 400"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "40%",
              }}
            >
              <path
                d="M0,300 L200,200 L350,260 L500,150 L650,280 L800,180 L950,260 L1100,150 L1250,220 L1440,180 L1440,400 L0,400 Z"
                fill="#000000"
              />
            </svg>

            {/* Brand Content */}
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

              <motion.p
                style={{
                  marginTop: 40,
                  fontSize: "12px",
                  letterSpacing: "0.3em",
                  color: "#FFD166",
                }}
                animate={{ opacity: [0.3, 1, 0.3] }}
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

      {/* ================= LIGHT WORLD ================= */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(180deg, #f8fafc 0%, #e2f0ff 100%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "1000px",
              height: "600px",
              background:
                "radial-gradient(circle at top, rgba(255,215,120,0.35), transparent 65%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: 48,
              borderRadius: 24,
              width: 480,
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              position: "relative",
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
