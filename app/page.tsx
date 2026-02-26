"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "600", "700"] });
const ACCESS_CODE = "0330";

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [warp, setWarp] = useState(false);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleEnter() { setWarp(true); setTimeout(() => setEntered(true), 900); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!name.trim()) return setError("Please enter student name");
    if (!studentClass) return setError("Please select class");
    if (code !== ACCESS_CODE) return setError("Invalid access code");
    const s = { name: name.trim(), class: studentClass, board: "CBSE" };
    localStorage.setItem("shauri_student", JSON.stringify(s));
    document.cookie = `shauri_name=${encodeURIComponent(s.name)}; path=/`;
    document.cookie = `shauri_class=${encodeURIComponent(s.class)}; path=/`;
    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ─── LANDING ─── */
        .land {
          position: fixed; inset: 0; overflow: hidden;
          background: linear-gradient(to top, #000814 0%, #001d3d 55%, #0a2540 100%);
        }
        .sun {
          position: absolute;
          top: 38%; left: 50%; transform: translate(-50%, -50%);
          width: clamp(240px, 50vw, 520px); height: clamp(240px, 50vw, 520px);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,215,120,1) 0%, rgba(255,180,60,0.6) 50%, transparent 80%);
          filter: blur(12px); pointer-events: none; z-index: 0;
        }

        /* DESKTOP default — original absolute positioning */
        .content {
          position: absolute;
          top: 38%; left: 50%; transform: translate(-50%, -50%);
          z-index: 2; width: 100%; padding: 0 20px;
          display: flex; flex-direction: column;
          align-items: center; text-align: center; gap: 12px;
        }
        .main-title {
          font-size: 76px; letter-spacing: 0.55em;
          font-weight: 700; color: #FFD700; line-height: 1; white-space: nowrap;
          text-shadow: 0 0 20px rgba(255,215,120,0.9), 0 0 40px rgba(255,200,80,0.6), 0 2px 6px rgba(0,0,0,0.8);
        }
        .tagline { color: #fff; font-size: 13px; letter-spacing: 0.15em; line-height: 1.5; opacity: 0.9; }
        .subtitle { color: #FFD700; font-size: 13px; letter-spacing: 0.15em; opacity: 0.85; line-height: 1.5; }

        .cta-wrap {
          position: absolute;
          bottom: clamp(220px, 20.8vw, 400px); left: 50%; transform: translateX(-50%);
          z-index: 2; cursor: pointer;
        }
        .cta-btn {
          position: relative; overflow: hidden;
          padding: 14px 42px; border-radius: 999px;
          border: 1px solid rgba(255,215,0,0.5);
          color: #FFD700; font-size: 13px; letter-spacing: 0.35em;
          white-space: nowrap; cursor: pointer; font-family: inherit;
        }
        .mountain {
          position: absolute; bottom: 0; left: 0; right: 0;
          z-index: 1; pointer-events: none; width: 100%;
        }

        /* ── MOBILE portrait ≤600px: switch to normal flow ── */
        @media (max-width: 600px) {
          .land { display: flex; flex-direction: column; align-items: center; }
          .sun {
            top: 0; left: 50%; transform: translateX(-50%);
            width: min(90vw, 300px); height: min(90vw, 300px);
          }
          .content {
            position: relative; top: auto; left: auto; transform: none;
            margin-top: max(14vh, 52px); gap: 8px;
          }
          .main-title { font-size: clamp(34px, 10.5vw, 54px); letter-spacing: 0.28em; }
          .tagline { font-size: clamp(9px, 2.3vw, 12px); letter-spacing: 0.08em; max-width: 290px; }
          .subtitle { font-size: clamp(8px, 2vw, 11px); letter-spacing: 0.06em; max-width: 270px; }
          .cta-wrap {
            position: relative; bottom: auto; left: auto; transform: none; margin-top: 18px;
          }
          .cta-btn { padding: 12px 30px; font-size: 11px; letter-spacing: 0.16em; }
          .mountain { position: absolute; height: clamp(80px, 18vh, 160px); }
        }

        /* Landscape phone */
        @media (orientation: landscape) and (max-height: 500px) {
          .content { top: 16%; gap: 5px; }
          .main-title { font-size: clamp(26px, 8vh, 46px); letter-spacing: 0.3em; }
          .tagline { font-size: clamp(7px, 1.6vh, 10px); }
          .subtitle { font-size: clamp(6px, 1.4vh, 9px); }
          .cta-wrap { bottom: 80px; }
          .cta-btn { padding: 8px 26px; font-size: 10px; letter-spacing: 0.14em; }
        }

        /* ─── ACCESS FORM ─── */
        .access-page {
          min-height: 100vh; min-height: 100dvh;
          display: flex; justify-content: center;
          align-items: center; flex-direction: column;
          background: linear-gradient(to bottom, #e6d3a3, #d6c08d);
          padding: 32px 20px; gap: 0;
        }
        .access-title {
          font-size: clamp(24px, 7.5vw, 48px);
          letter-spacing: clamp(0.16em, 3.5vw, 0.42em);
          font-weight: 700; color: #0f172a;
          text-shadow: 0 2px 4px rgba(0,0,0,0.15);
          text-align: center;
        }
        .access-sub {
          margin-top: 10px; margin-bottom: 28px;
          opacity: 0.7;
          font-size: clamp(10px, 2.4vw, 13px);
          letter-spacing: 0.06em; line-height: 1.5;
          text-align: center;
        }
        .access-form {
          display: grid; gap: 14px;
          width: 100%; max-width: 340px;
        }
        .a-input {
          padding: 14px 16px; border-radius: 14px;
          border: 1px solid #d4af37; width: 100%;
          background: #f8fafc;
          font-size: 16px; /* prevents iOS zoom */
          font-family: inherit; color: #0f172a;
          -webkit-appearance: none; appearance: none;
        }
        .a-input:focus {
          outline: none; border-color: #b8960a;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.2);
        }
        .a-btn {
          padding: 14px; border-radius: 999px;
          border: 1px solid #d4af37; background: transparent;
          cursor: pointer; font-size: 14px; font-family: inherit;
          letter-spacing: 0.16em; color: #0f172a; font-weight: 600;
          -webkit-appearance: none;
        }
        .a-btn:active { background: rgba(212,175,55,0.15); }
        .access-footer {
          margin-top: 32px; opacity: 0.6;
          font-size: clamp(9px, 1.9vw, 11px);
          text-align: center; line-height: 1.6;
          letter-spacing: 0.05em; max-width: 280px;
        }
        .err { color: #dc2626; margin-top: 10px; font-size: 13px; text-align: center; }
      `}</style>

      {/* ── LANDING ── */}
      <AnimatePresence>
        {!entered && (
          <motion.div className="land"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            <div className="sun" />

            {/* All text content */}
            <div className="content">
              <h1 className="main-title">SHAURI</h1>
              <p className="tagline">THE COURAGE TO MASTER THE FUTURE</p>
              <p className="subtitle">CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM</p>
            </div>

            {/* CTA — separate from content so it can be independently positioned */}
            <motion.div className="cta-wrap"
              onClick={handleEnter}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="cta-btn">
                <motion.div
                  style={{
                    position: "absolute", top: 0, left: "-100%",
                    width: "100%", height: "100%",
                    background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.55), transparent)",
                  }}
                  animate={{ left: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                BEGIN THE ASCENT
              </div>
            </motion.div>

            {/* Mountain — full width SVG, sits at bottom */}
            <svg className="mountain" viewBox="0 0 1440 800"
              preserveAspectRatio="xMidYMax slice">
              <path
                d="M0,730 C400,650 700,600 720,500 C740,600 1000,650 1440,720 L1440,800 L0,800 Z"
                fill="black" />
            </svg>

            {warp && (
              <motion.div style={{ position: "absolute", inset: 0, background: "white", zIndex: 99 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACCESS FORM ── */}
      {entered && (
        <div className="access-page">
          <h1 className="access-title">SHAURI</h1>
          <p className="access-sub">CBSE-Aligned. Adaptive. Built for your growth.</p>
          <form onSubmit={handleSubmit} className="access-form">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Student Name" className="a-input"
              autoComplete="name" autoCapitalize="words" />
            <select value={studentClass} onChange={e => setStudentClass(e.target.value)}
              className="a-input">
              <option value="">Select Class</option>
              {[6,7,8,9,10,11,12].map(c => (
                <option key={c} value={`Class ${c}`}>Class {c}</option>
              ))}
            </select>
            <input type="password" value={code} onChange={e => setCode(e.target.value)}
              placeholder="Access Code" className="a-input"
              autoComplete="current-password" />
            <button type="submit" className="a-btn">STEP IN</button>
          </form>
          {error && <p className="err">{error}</p>}
          <p className="access-footer">Discipline today builds the confidence of tomorrow.</p>
        </div>
      )}
    </div>
  );
}