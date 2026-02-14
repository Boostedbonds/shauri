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
              backgroundImage: `
                linear-gradient(rgba(0,10,25,0.85), rgba(0,15,40,0.9)),
                url("/mountain.jpg")
              `,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundBlendMode: "overlay",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              overflow: "hidden",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            onClick={handleEnter}
          >
            {/* Dawn Glow at Peak */}
            <motion.div
              style={{
                position: "absolute",
                top: "38%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "700px",
                height: "400px",
                background:
                  "radial-gradient(circle at center, rgba(255,210,120,0.45), transparent 70%)",
                filter: "blur(100px)",
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            {/* Grain */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><filter id=\"noise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23noise)\" opacity=\"0.04\"/></svg>')",
                mixBlendMode: "overlay",
                pointerEvents: "none",
              }}
            />

            <motion.div
              style={{ textAlign: "center", position: "relative" }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.6 }}
            >
              <h1
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "68px",
                  letterSpacing: "0.45em",
                  color: "#D4AF37",
                  fontWeight: 700,
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: 26,
                  fontSize: "14px",
                  letterSpacing: "0.25em",
                  color: "#cbd5e1",
                }}
              >
                Aligned. Adaptive. Guiding Excellence.
              </p>

              <motion.p
                style={{
                  marginTop: 32,
                  fontSize: "12px",
                  letterSpacing: "0.35em",
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

      {/* ACCESS PAGE UNCHANGED */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(to bottom, #FFF4D6 0%, #EAF3FF 55%, #F8FAFC 100%)",
            position: "relative",
            overflow: "hidden",
            padding: "40px 20px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "44px",
                letterSpacing: "0.3em",
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              SHAURI
            </h1>

            <p
              style={{
                marginTop: 14,
                fontSize: "14px",
                letterSpacing: "0.15em",
                color: "#475569",
              }}
            >
              Aligned. Adaptive. Guiding Excellence.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: 18,
              width: "360px",
            }}
          >
            <input
              type="text"
              placeholder="Student Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "rgba(255,255,255,0.75)",
              }}
            />

            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "rgba(255,255,255,0.75)",
              }}
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
              style={{
                padding: 14,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "rgba(255,255,255,0.75)",
              }}
            />

            {error && (
              <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>
            )}

            <button
              type="submit"
              style={{
                padding: 14,
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(to right, #F6C56F, #E8A93B)",
                color: "#1e293b",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Enter SHAURI
            </button>
          </form>
        </div>
      )}
    </>
  );
}
