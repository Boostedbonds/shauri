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
    <div className={spaceGrotesk.className}>
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleEnter}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <h1
                style={{
                  fontSize: "64px",
                  letterSpacing: "0.55em",
                  fontWeight: 600,
                  color: "#D4AF37",
                  textAlign: "center",
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: 28,
                  textAlign: "center",
                  letterSpacing: "0.28em",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                Aligned. Adaptive. Guiding Excellence.
              </p>

              <p
                style={{
                  marginTop: 18,
                  textAlign: "center",
                  letterSpacing: "0.22em",
                  fontSize: "12px",
                  color: "rgba(212,175,55,0.7)",
                }}
              >
                for CBSE minds
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

          <p
            style={{
              marginTop: 16,
              letterSpacing: "0.28em",
              fontSize: "15px",
              color: "rgba(30,41,59,0.82)",
            }}
          >
            Aligned. Adaptive. Guiding Excellence.
          </p>

          <p
            style={{
              marginTop: 12,
              letterSpacing: "0.22em",
              fontSize: "12px",
              color: "rgba(212,175,55,0.8)",
            }}
          >
            for CBSE minds
          </p>

          {/* form unchanged */}

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
              marginTop: 28,
              padding: "16px 34px",
              borderRadius: "999px",
              border: "1px solid rgba(212,175,55,0.7)",
              background: "rgba(255,255,255,0.75)",
              fontWeight: 600,
              letterSpacing: "0.28em",
              cursor: "pointer",
            }}
          >
            STEP IN
          </motion.button>

          <p
            style={{
              marginTop: 30,
              fontSize: 11,
              letterSpacing: "0.24em",
              color: "#64748b",
            }}
          >
            Crafted for Focused Minds.
          </p>
        </div>
      )}
    </div>
  );
}
