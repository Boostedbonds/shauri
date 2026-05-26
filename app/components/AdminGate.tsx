"use client";
import { useEffect, useMemo, useState } from "react";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/session", { cache: "no-store" });
      const body = await res.json();
      setUnlocked(Boolean(body?.ok));
    } catch {
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        setError(body?.error || "Unable to sign in.");
        return;
      }
      setUnlocked(true);
    } catch {
      setError("Network error while signing in.");
    } finally {
      setSubmitting(false);
    }
  }

  const today = useMemo(
    () =>
      new Date()
        .toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase(),
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080f] grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-[#8892b0] text-sm tracking-widest">VERIFYING SESSION...</p>
        </div>
      </div>
    );
  }
  if (unlocked) return <>{children}</>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

        .admin-gate-root {
          font-family: 'Space Mono', monospace;
        }

        .shauri-title {
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #ffe500;
          text-shadow:
            0 0 20px rgba(255,229,0,0.8),
            0 0 60px rgba(255,229,0,0.4),
            0 0 120px rgba(255,229,0,0.2);
        }

        .stars {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .star {
          position: absolute;
          background: white;
          border-radius: 50%;
          animation: twinkle var(--dur, 3s) ease-in-out infinite var(--delay, 0s);
        }

        @keyframes twinkle {
          0%, 100% { opacity: var(--min-op, 0.2); transform: scale(1); }
          50% { opacity: var(--max-op, 0.9); transform: scale(1.3); }
        }

        .shooting-star {
          position: absolute;
          width: 120px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.9), transparent);
          animation: shoot 6s ease-in-out infinite;
          transform-origin: left center;
        }

        @keyframes shoot {
          0% { opacity: 0; transform: translateX(-100px) translateY(0) rotate(-25deg); }
          10% { opacity: 1; }
          40% { opacity: 0; transform: translateX(400px) translateY(120px) rotate(-25deg); }
          100% { opacity: 0; transform: translateX(400px) translateY(120px) rotate(-25deg); }
        }

        .login-card {
          background: rgba(12, 16, 35, 0.85);
          border: 1px solid rgba(255, 229, 0, 0.15);
          backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(255,229,0,0.05),
            0 32px 80px rgba(0,0,0,0.7),
            inset 0 1px 0 rgba(255,229,0,0.1);
        }

        .badge {
          background: rgba(255,229,0,0.1);
          border: 1px solid rgba(255,229,0,0.3);
          color: #ffe500;
          font-size: 11px;
          letter-spacing: 0.18em;
          padding: 5px 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .input-field {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 13px 16px;
          color: #eaf0ff;
          font-family: 'Space Mono', monospace;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-field:focus {
          border-color: rgba(255,229,0,0.5);
          box-shadow: 0 0 0 3px rgba(255,229,0,0.08);
        }

        .input-field::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .pw-wrap {
          display: flex;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .pw-wrap:focus-within {
          border-color: rgba(255,229,0,0.5);
          box-shadow: 0 0 0 3px rgba(255,229,0,0.08);
        }

        .pw-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 13px 16px;
          color: #eaf0ff;
          font-family: 'Space Mono', monospace;
          font-size: 14px;
          outline: none;
        }

        .pw-toggle {
          background: transparent;
          border: none;
          padding: 0 16px;
          color: rgba(255,229,0,0.6);
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: color 0.2s;
        }

        .pw-toggle:hover {
          color: #ffe500;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #ffe500, #ffb800);
          color: #06080f;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.12em;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 0 24px rgba(255,229,0,0.3);
        }

        .submit-btn:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 0 40px rgba(255,229,0,0.5);
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,229,0,0.2), transparent);
          margin: 24px 0;
        }

        .label-text {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.4);
          margin-bottom: 8px;
          display: block;
        }

        .nebula1 {
          position: fixed;
          width: 800px;
          height: 800px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(138,43,226,0.08) 0%, transparent 70%);
          top: -200px;
          right: -200px;
          pointer-events: none;
        }

        .nebula2 {
          position: fixed;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,100,255,0.06) 0%, transparent 70%);
          bottom: -100px;
          left: -100px;
          pointer-events: none;
        }

        .date-badge {
          font-size: 10px;
          letter-spacing: 0.22em;
          color: rgba(255,229,0,0.5);
          margin-bottom: 6px;
        }

        .secure-text {
          font-size: 11px;
          letter-spacing: 0.14em;
          color: rgba(255,255,255,0.25);
          text-align: center;
          margin-top: 20px;
        }

        .grid-line {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,229,0,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,229,0,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      <div className="admin-gate-root min-h-screen relative overflow-hidden bg-[#06080f]">
        {/* Starfield */}
        <div className="stars">
          {Array.from({ length: 80 }).map((_, i) => (
            <div
              key={i}
              className="star"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                "--dur": `${2 + Math.random() * 4}s`,
                "--delay": `${-Math.random() * 4}s`,
                "--min-op": Math.random() * 0.2 + 0.05,
                "--max-op": Math.random() * 0.6 + 0.3,
              } as React.CSSProperties}
            />
          ))}
          <div className="shooting-star" style={{ top: "15%", left: "10%", animationDelay: "0s" }} />
          <div className="shooting-star" style={{ top: "40%", left: "60%", animationDelay: "3s" }} />
        </div>

        {/* Nebula glows */}
        <div className="nebula1" />
        <div className="nebula2" />

        {/* Grid overlay */}
        <div className="grid-line" />

        {/* Content */}
        <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
          {/* SHAURI Title */}
          <div className="text-center mb-10">
            <h1 className="shauri-title text-5xl md:text-7xl mb-3">SHAURI</h1>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "0.28em", color: "rgba(255,255,255,0.35)" }}>
              CONTROL CENTER · ADMIN ACCESS
            </p>
          </div>

          {/* Login Card */}
          <div className="login-card w-full max-w-md rounded-2xl p-8">
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <span className="badge">
                <span>🔐</span>
                ADMIN LOGIN
              </span>
            </div>

            <div className="date-badge text-center">{today}</div>

            <h2
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 700,
                fontSize: "22px",
                letterSpacing: "0.06em",
                color: "#eaf0ff",
                textAlign: "center",
                marginBottom: "8px",
              }}
            >
              Control Center Access
            </h2>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: "28px", lineHeight: "1.6" }}>
              Authorized personnel only
            </p>

            <div className="divider" />

            <form onSubmit={onSubmit}>
              {/* Email */}
              <div className="mb-5">
                <label className="label-text">EMAIL ADDRESS</label>
                <input
                  className="input-field"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@shauri.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="mb-6">
                <label className="label-text">PASSWORD</label>
                <div className="pw-wrap">
                  <input
                    className="pw-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px 16px",
                    background: "rgba(220,38,38,0.1)",
                    border: "1px solid rgba(220,38,38,0.3)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#fca5a5",
                  }}
                >
                  ⚠ {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={submitting} className="submit-btn">
                {submitting ? "AUTHENTICATING..." : "ENTER CONTROL CENTER →"}
              </button>
            </form>

            <p className="secure-text">🔒 ENCRYPTED · SECURE SESSION</p>
          </div>

          {/* Bottom tagline */}
          <p
            style={{
              marginTop: "32px",
              fontSize: "11px",
              letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.18)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            SHAURI PLATFORM · INTERNAL USE ONLY
          </p>
        </main>
      </div>
    </>
  );
}