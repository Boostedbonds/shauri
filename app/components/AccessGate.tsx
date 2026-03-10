"use client";
import { useState } from "react";
import { grantAccess } from "../lib/session";

// ── Types ─────────────────────────────────────────────────────
type Side = "student" | "teacher";

// ── Styles ────────────────────────────────────────────────────
const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .ag-root {
    min-height: 100vh;
    background: #f0f4ff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .ag-window {
    width: 100%;
    max-width: 860px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
    min-height: 520px;
  }

  /* ── Student side ── */
  .ag-student {
    background: #ffffff;
    padding: 44px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-right: 1px solid #e8edf5;
    position: relative;
  }

  /* ── Teacher side ── */
  .ag-teacher {
    background: linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0f2044 100%);
    padding: 44px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .ag-teacher::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 220px; height: 220px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
  }
  .ag-teacher::after {
    content: '';
    position: absolute;
    bottom: -40px; left: -40px;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%);
  }

  /* ── Shared panel styles ── */
  .ag-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 16px;
    width: fit-content;
  }
  .ag-badge-student {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }
  .ag-badge-teacher {
    background: rgba(99,102,241,0.15);
    color: #a5b4fc;
    border: 1px solid rgba(99,102,241,0.25);
  }

  .ag-title {
    font-size: 26px;
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 6px;
  }
  .ag-title-student { color: #0f172a; }
  .ag-title-teacher { color: #f1f5f9; }

  .ag-sub {
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 28px;
  }
  .ag-sub-student { color: #64748b; }
  .ag-sub-teacher { color: #94a3b8; }

  /* ── Form ── */
  .ag-field { margin-bottom: 14px; }
  .ag-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 6px;
  }
  .ag-label-student { color: #64748b; }
  .ag-label-teacher { color: #94a3b8; }

  .ag-input {
    width: 100%;
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    font-family: inherit;
  }
  .ag-input-student {
    border: 1.5px solid #e2e8f0;
    background: #f8fafc;
    color: #0f172a;
  }
  .ag-input-student:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
    background: #fff;
  }
  .ag-input-student::placeholder { color: #cbd5e1; }

  .ag-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .ag-select {
    width: 100%;
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 14px;
    outline: none;
    cursor: pointer;
    font-family: inherit;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }
  .ag-select-student {
    border: 1.5px solid #e2e8f0;
    background-color: #f8fafc;
    color: #0f172a;
  }
  .ag-select-student:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
    background-color: #fff;
  }

  /* ── Buttons ── */
  .ag-btn {
    width: 100%;
    padding: 13px;
    border-radius: 12px;
    border: none;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    letter-spacing: 0.02em;
  }
  .ag-btn-student {
    background: #2563eb;
    color: #fff;
  }
  .ag-btn-student:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
  .ag-btn-student:active { transform: none; }

  /* ── Error ── */
  .ag-error {
    font-size: 12px;
    font-weight: 600;
    color: #dc2626;
    margin-top: -8px;
    margin-bottom: 10px;
    padding: 8px 12px;
    background: #fef2f2;
    border-radius: 8px;
    border: 1px solid #fecaca;
  }

  /* ── Teacher coming soon ── */
  .ag-coming-soon {
    position: relative;
    z-index: 1;
  }
  .ag-features {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 28px;
  }
  .ag-feature {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
  }
  .ag-feature-icon {
    font-size: 18px;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .ag-feature-text {
    font-size: 13px;
    color: #cbd5e1;
    line-height: 1.4;
  }
  .ag-feature-text strong {
    display: block;
    color: #f1f5f9;
    font-weight: 600;
    margin-bottom: 2px;
    font-size: 13px;
  }

  .ag-notify-wrap { margin-bottom: 16px; }
  .ag-notify-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #94a3b8;
    margin-bottom: 6px;
  }
  .ag-notify-row {
    display: flex;
    gap: 8px;
  }
  .ag-notify-input {
    flex: 1;
    padding: 10px 13px;
    border-radius: 10px;
    font-size: 13px;
    border: 1.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.06);
    color: #f1f5f9;
    outline: none;
    font-family: inherit;
    transition: border-color 0.2s;
  }
  .ag-notify-input::placeholder { color: #475569; }
  .ag-notify-input:focus { border-color: rgba(99,102,241,0.5); }
  .ag-notify-btn {
    padding: 10px 16px;
    border-radius: 10px;
    border: none;
    background: #4f46e5;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: background 0.2s;
  }
  .ag-notify-btn:hover { background: #4338ca; }
  .ag-notify-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .ag-soon-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.3);
    color: #a5b4fc;
    font-size: 12px;
    font-weight: 600;
  }

  .ag-divider {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ag-divider-line {
    position: absolute;
    left: 0; right: 0;
    height: 1px;
    background: #e8edf5;
  }
  .ag-divider-label {
    position: relative;
    background: #fff;
    padding: 0 10px;
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* ── Shauri brand strip at top ── */
  .ag-brand {
    text-align: center;
    margin-bottom: 28px;
  }
  .ag-brand-name {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 0.3em;
    color: #0f172a;
  }
  .ag-brand-tag {
    font-size: 10px;
    color: #94a3b8;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-top: 2px;
  }

  /* ── Notify success ── */
  .ag-notify-success {
    padding: 10px 14px;
    background: rgba(74,222,128,0.1);
    border: 1px solid rgba(74,222,128,0.2);
    border-radius: 10px;
    color: #4ade80;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
  }

  /* ── Mobile: stack vertically ── */
  @media (max-width: 600px) {
    .ag-window {
      grid-template-columns: 1fr;
      border-radius: 20px;
    }
    .ag-student {
      border-right: none;
      border-bottom: 1px solid #e8edf5;
      padding: 32px 28px;
    }
    .ag-teacher { padding: 32px 28px; }
    .ag-title { font-size: 22px; }
  }
`;

// ── Component ─────────────────────────────────────────────────
export default function AccessGate({ onSuccess }: { onSuccess: () => void }) {
  // Student state
  const [name, setName]         = useState("");
  const [cls, setCls]           = useState("");
  const [code, setCode]         = useState("");
  const [error, setError]       = useState("");

  // Teacher notify state
  const [email, setEmail]       = useState("");
  const [notified, setNotified] = useState(false);
  const [notifying, setNotifying] = useState(false);

  function submitStudent() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!cls)         { setError("Please select your class."); return; }
    if (code !== "0330") { setError("Invalid access code."); return; }

    // Save student context — same shape as before
    if (typeof window !== "undefined") {
      localStorage.setItem("shauri_student", JSON.stringify({
        name: name.trim(),
        class: cls,
        board: "CBSE",
      }));
    }

    grantAccess();
    onSuccess();
  }

  async function notifyTeacher() {
    if (!email.trim() || !email.includes("@")) return;
    setNotifying(true);
    // Store email locally — in production this would POST to an API
    try {
      const existing = JSON.parse(localStorage.getItem("shauri_teacher_waitlist") || "[]");
      existing.push({ email: email.trim(), date: new Date().toISOString() });
      localStorage.setItem("shauri_teacher_waitlist", JSON.stringify(existing));
    } catch {}
    await new Promise(r => setTimeout(r, 800)); // simulate API
    setNotified(true);
    setNotifying(false);
  }

  return (
    <>
      <style>{styles}</style>
      <div className="ag-root">
        <div className="ag-window">

          {/* ── LEFT: Student ── */}
          <div className="ag-student">
            <div className="ag-brand">
              <div className="ag-brand-name">SHAURI</div>
              <div className="ag-brand-tag">CBSE Adaptive Learning</div>
            </div>

            <div className="ag-badge ag-badge-student">
              👤 Student Login
            </div>

            <h2 className="ag-title ag-title-student">
              Begin your<br />learning journey
            </h2>
            <p className="ag-sub ag-sub-student">
              Practice exams, oral sessions, AI teacher — all in one place.
            </p>

            <div className="ag-field">
              <label className="ag-label ag-label-student">Your Name</label>
              <input
                className="ag-input ag-input-student"
                placeholder="e.g. Arjun Sharma"
                value={name}
                onChange={e => { setName(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && submitStudent()}
              />
            </div>

            <div className="ag-field ag-row">
              <div>
                <label className="ag-label ag-label-student">Class</label>
                <select
                  className="ag-select ag-select-student ag-input"
                  value={cls}
                  onChange={e => { setCls(e.target.value); setError(""); }}
                >
                  <option value="">Select</option>
                  {[6,7,8,9,10,11,12].map(c => (
                    <option key={c} value={String(c)}>Class {c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ag-label ag-label-student">Access Code</label>
                <input
                  className="ag-input ag-input-student"
                  placeholder="••••"
                  type="password"
                  value={code}
                  onChange={e => { setCode(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && submitStudent()}
                />
              </div>
            </div>

            {error && <div className="ag-error">⚠ {error}</div>}

            <button className="ag-btn ag-btn-student" onClick={submitStudent}>
              Enter Shauri →
            </button>

            <p style={{ fontSize: 11, color: "#cbd5e1", textAlign: "center", marginTop: 14 }}>
              Access code from your school or teacher
            </p>
          </div>

          {/* ── RIGHT: Teacher ── */}
          <div className="ag-teacher">
            <div className="ag-coming-soon">
              <div className="ag-badge ag-badge-teacher">
                👩‍🏫 Teacher Portal
              </div>

              <h2 className="ag-title ag-title-teacher">
                Your classroom,<br />fully visible
              </h2>
              <p className="ag-sub ag-sub-teacher">
                See every student's progress, screen time, weak chapters, and scores — in real time.
              </p>

              <div className="ag-features">
                <div className="ag-feature">
                  <span className="ag-feature-icon">📊</span>
                  <div className="ag-feature-text">
                    <strong>Class Dashboard</strong>
                    Every student's score, subject, and activity at a glance.
                  </div>
                </div>
                <div className="ag-feature">
                  <span className="ag-feature-icon">⏱️</span>
                  <div className="ag-feature-text">
                    <strong>Screen Time & Engagement</strong>
                    See who's practicing, how long, and on which subjects.
                  </div>
                </div>
                <div className="ag-feature">
                  <span className="ag-feature-icon">📄</span>
                  <div className="ag-feature-text">
                    <strong>OSM + OMR Evaluation</strong>
                    Upload answer sheets — AI marks them in seconds.
                  </div>
                </div>
                <div className="ag-feature">
                  <span className="ag-feature-icon">⚠️</span>
                  <div className="ag-feature-text">
                    <strong>Weak Area Alerts</strong>
                    Instantly see which students need attention and in which chapters.
                  </div>
                </div>
              </div>

              {!notified ? (
                <>
                  <div className="ag-notify-wrap">
                    <span className="ag-notify-label">Get notified when teacher login launches</span>
                    <div className="ag-notify-row">
                      <input
                        className="ag-notify-input"
                        type="email"
                        placeholder="your@school.edu"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && notifyTeacher()}
                      />
                      <button
                        className="ag-notify-btn"
                        onClick={notifyTeacher}
                        disabled={notifying || !email.trim()}
                      >
                        {notifying ? "..." : "Notify Me"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="ag-soon-tag">
                      🔒 Email login — coming soon
                    </span>
                    <span style={{ fontSize: 11, color: "#475569" }}>Free for schools</span>
                  </div>
                </>
              ) : (
                <div className="ag-notify-success">
                  ✅ You're on the list — we'll email you when it's ready!
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}