"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "600", "700"] });

type StudentContext = { name: string; class: string; board: string };

export default function ModeSelector() {
  const [student, setStudent] = useState<StudentContext | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shauri_student");
      if (!raw) { window.location.href = "/"; return; }
      const parsed = JSON.parse(raw);
      if (!parsed?.name || !parsed?.class) { window.location.href = "/"; return; }
      setStudent(parsed);
    } catch { window.location.href = "/"; }
  }, []);

  if (!student) return null;

  return (
    <div className={orbitron.className} style={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 45%, #E6F2FF 100%)",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .modes-main {
          flex: 1; width: 100%; max-width: 1400px;
          margin: 0 auto;
          padding: clamp(16px, 4vw, 40px) clamp(16px, 4vw, 32px) 48px;
          display: flex; flex-direction: column;
        }
        .about-link {
          font-size: clamp(10px, 2vw, 13px);
          letter-spacing: 0.18em; color: #5c6f82;
          text-decoration: none; display: block;
          margin-bottom: clamp(16px, 3vw, 28px);
        }
        .welcome-name {
          font-size: clamp(18px, 5.5vw, 42px);
          letter-spacing: clamp(0.06em, 2vw, 0.22em);
          color: #0a2540; font-weight: 600;
          margin-bottom: 8px; text-align: center;
          word-break: break-word;
        }
        .welcome-class {
          font-size: clamp(10px, 2.2vw, 14px);
          letter-spacing: 0.18em; color: #5c6f82;
          text-align: center;
          margin-bottom: clamp(20px, 4vw, 34px);
        }
        .choose-h2 {
          text-align: center;
          font-size: clamp(13px, 3.5vw, 30px);
          letter-spacing: clamp(0.06em, 2vw, 0.28em);
          color: #0a2540;
          margin-bottom: 8px;
        }
        .choose-sub {
          text-align: center;
          font-size: clamp(9px, 2vw, 14px);
          letter-spacing: clamp(0.05em, 1vw, 0.18em);
          color: #5c6f82;
          margin-bottom: clamp(20px, 4vw, 44px);
        }
        .cards-grid {
          display: grid;
          gap: clamp(12px, 3vw, 28px);
          grid-template-columns: 1fr;
        }
        @media (min-width: 560px) {
          .cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1100px) {
          .cards-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .mode-card {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          border: 1px solid rgba(212,175,55,0.35);
          text-decoration: none;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
          padding: clamp(16px, 3vw, 22px) clamp(14px, 3vw, 20px);
          transition: transform 0.15s, box-shadow 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .mode-card:active { transform: scale(0.97); }
        @media (min-width: 1100px) {
          .mode-card {
            flex-direction: column; align-items: flex-start;
            justify-content: space-between;
            min-height: 280px;
            padding: 28px 24px;
          }
        }
        .card-icon {
          font-size: clamp(32px, 7vw, 44px);
          flex-shrink: 0; line-height: 1;
        }
        .card-body { flex: 1; min-width: 0; }
        .card-title {
          font-size: clamp(10px, 2.5vw, 16px);
          letter-spacing: 0.12em; color: #D4AF37;
          margin-bottom: 6px; font-weight: 700;
        }
        .card-desc {
          font-size: clamp(11px, 2vw, 14px);
          color: #425466; line-height: 1.55;
          letter-spacing: 0;
        }
        .card-cta { display: none; }
        @media (min-width: 1100px) {
          .card-cta {
            display: block; margin-top: 22px; width: 100%;
            padding: 12px; border-radius: 999px;
            border: 1px solid #D4AF37; color: #0a2540;
            text-align: center; font-size: 13px;
            letter-spacing: 0.16em; font-family: inherit;
            text-decoration: none;
          }
        }
        .privacy {
          margin-top: clamp(28px, 5vw, 54px);
          text-align: center; font-size: clamp(9px, 1.8vw, 12px);
          letter-spacing: 0.04em; color: #6b7c8f; line-height: 1.6;
        }
      `}</style>

      <Header onLogout={() => (window.location.href = "/")} />

      <main className="modes-main">
        <a href="/about" className="about-link">ABOUT SHAURI</a>

        <h1 className="welcome-name">WELCOME, {student.name.toUpperCase()}</h1>
        <p className="welcome-class">CLASS {student.class} · {student.board}</p>

        <h2 className="choose-h2">CHOOSE YOUR LEARNING MODE</h2>
        <p className="choose-sub">SELECT YOUR PATH TO BEGIN THE ASCENT</p>

        <div className="cards-grid">
          <ModeCard icon="🧠" title="LEARN MODE"
            desc="Learn concepts with clear CBSE-aligned explanations and examples."
            href="/learn" cta="BEGIN LEARNING" />
          <ModeCard icon="🧪" title="EXAMINER MODE"
            desc="Practice full-length question papers in real exam conditions."
            href="/examiner" cta="BEGIN TEST" />
          <ModeCard icon="🗣️" title="ORAL MODE"
            desc="Strengthen recall, fluency, and spoken confidence."
            href="/oral" cta="BEGIN SPEAKING" />
          <ModeCard icon="📊" title="PROGRESS DASHBOARD"
            desc="Review strengths, identify gaps, and track your growth."
            href="/progress" cta="VIEW PROGRESS" />
        </div>

        <p className="privacy">
          Your learning data remains private and stays on this device unless you explicitly export or share it.
        </p>
      </main>
    </div>
  );
}

function ModeCard({ icon, title, desc, href, cta }: {
  icon: string; title: string; desc: string; href: string; cta: string;
}) {
  return (
    <a href={href} className="mode-card">
      <div className="card-icon">{icon}</div>
      <div className="card-body">
        <h3 className="card-title">{title}</h3>
        <p className="card-desc">{desc}</p>
      </div>
      <span className="card-cta">{cta}</span>
    </a>
  );
}