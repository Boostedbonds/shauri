"use client";
import { useEffect, useMemo, useState } from "react";

// ─── Admin credentials ───────────────────────────────────────────
const ADMIN_NAME = "Dracula";
const ADMIN_CODE = "3011";
// ─────────────────────────────────────────────────────────────────

type View = "login" | "forgot" | "forgot-sent";

const S = {
  root: {
    minHeight: "100vh",
    background: "#06080f",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 16px",
    position: "relative" as const,
    overflow: "hidden",
    fontFamily: "'Space Mono', monospace",
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 900,
    fontSize: "clamp(40px, 8vw, 72px)",
    letterSpacing: "0.2em",
    color: "#ffe500",
    textShadow:
      "0 0 20px rgba(255,229,0,0.8), 0 0 60px rgba(255,229,0,0.4), 0 0 120px rgba(255,229,0,0.2)",
    margin: 0,
    lineHeight: 1,
  },
  subtitle: {
    fontSize: "11px",
    letterSpacing: "0.28em",
    color: "rgba(255,255,255,0.3)",
    margin: "10px 0 40px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "rgba(12,16,35,0.88)",
    border: "1px solid rgba(255,229,0,0.15)",
    borderRadius: "20px",
    padding: "36px 32px",
    backdropFilter: "blur(24px)",
    boxShadow:
      "0 0 0 1px rgba(255,229,0,0.05), 0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,229,0,0.1)",
    boxSizing: "border-box" as const,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(255,229,0,0.1)",
    border: "1px solid rgba(255,229,0,0.3)",
    color: "#ffe500",
    fontSize: "11px",
    letterSpacing: "0.18em",
    padding: "5px 14px",
    borderRadius: "999px",
    marginBottom: "16px",
  },
  date: {
    fontSize: "10px",
    letterSpacing: "0.22em",
    color: "rgba(255,229,0,0.5)",
    marginBottom: "8px",
  },
  heading: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: "20px",
    letterSpacing: "0.06em",
    color: "#eaf0ff",
    margin: "0 0 6px",
  },
  subheading: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.3)",
    margin: "0 0 24px",
    lineHeight: 1.6,
  },
  divider: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(255,229,0,0.2), transparent)",
    margin: "0 0 24px",
  },
  label: {
    display: "block",
    fontSize: "10px",
    letterSpacing: "0.2em",
    color: "rgba(255,255,255,0.4)",
    marginBottom: "8px",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box" as const,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "13px 16px",
    color: "#eaf0ff",
    fontFamily: "'Space Mono', monospace",
    fontSize: "14px",
    outline: "none",
    marginBottom: "20px",
  },
  codeWrap: {
    display: "flex",
    gap: "10px",
    marginBottom: "24px",
  },
  codeBox: {
    flex: 1,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "13px 0",
    color: "#eaf0ff",
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: "22px",
    letterSpacing: "0.1em",
    outline: "none",
    textAlign: "center" as const,
    boxSizing: "border-box" as const,
    width: "100%",
    maxWidth: "70px",
    caretColor: "#ffe500",
  },
  error: {
    marginBottom: "16px",
    padding: "12px 16px",
    background: "rgba(220,38,38,0.1)",
    border: "1px solid rgba(220,38,38,0.3)",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#fca5a5",
  },
  success: {
    marginBottom: "16px",
    padding: "12px 16px",
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.25)",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#86efac",
    lineHeight: 1.6,
  },
  btn: {
    display: "block",
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #ffe500, #ffb800)",
    color: "#06080f",
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: "13px",
    letterSpacing: "0.12em",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    boxShadow: "0 0 24px rgba(255,229,0,0.3)",
  },
  ghostBtn: {
    display: "block",
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: "rgba(255,255,255,0.35)",
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.14em",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    cursor: "pointer",
    marginTop: "10px",
    boxSizing: "border-box" as const,
  },
  forgotLink: {
    background: "none",
    border: "none",
    color: "rgba(255,229,0,0.55)",
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.1em",
    cursor: "pointer",
    padding: "0",
    textDecoration: "underline",
    textDecorationColor: "rgba(255,229,0,0.25)",
    display: "block",
    textAlign: "right" as const,
    marginBottom: "20px",
  },
  secureText: {
    fontSize: "11px",
    letterSpacing: "0.14em",
    color: "rgba(255,255,255,0.2)",
    textAlign: "center" as const,
    marginTop: "20px",
  },
  footer: {
    marginTop: "28px",
    fontSize: "11px",
    letterSpacing: "0.18em",
    color: "rgba(255,255,255,0.15)",
  },
  nebula1: {
    position: "fixed" as const,
    width: "700px", height: "700px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(138,43,226,0.08) 0%, transparent 70%)",
    top: "-200px", right: "-200px",
    pointerEvents: "none" as const, zIndex: 0,
  },
  nebula2: {
    position: "fixed" as const,
    width: "500px", height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(0,100,255,0.06) 0%, transparent 70%)",
    bottom: "-100px", left: "-100px",
    pointerEvents: "none" as const, zIndex: 0,
  },
};

function StarField() {
  const stars = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    left: `${(i * 137.5) % 100}%`,
    top: `${(i * 97.3) % 100}%`,
    size: (i % 3) + 1,
    opacity: 0.1 + (i % 5) * 0.12,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      {stars.map((s) => (
        <div key={s.id} style={{
          position: "absolute", left: s.left, top: s.top,
          width: s.size, height: s.size,
          borderRadius: "50%", background: "white", opacity: s.opacity,
        }} />
      ))}
    </div>
  );
}

// ── 4-digit OTP-style code input ──────────────────────────────────
function CodeInput({ value, onChange, focusColor }: {
  value: string;
  onChange: (v: string) => void;
  focusColor: boolean;
}) {
  const digits = [0, 1, 2, 3];

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      const el = document.getElementById(`acode-${i - 1}`) as HTMLInputElement;
      el?.focus();
      onChange(value.slice(0, i - 1));
    }
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[i] = char;
    const next = arr.join("").slice(0, 4);
    onChange(next);
    if (char && i < 3) {
      const el = document.getElementById(`acode-${i + 1}`) as HTMLInputElement;
      el?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted) { onChange(pasted); e.preventDefault(); }
  }

  return (
    <div style={S.codeWrap}>
      {digits.map((i) => (
        <input
          key={i}
          id={`acode-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            ...S.codeBox,
            borderColor: focusColor ? "rgba(255,229,0,0.5)" : value[i] ? "rgba(255,229,0,0.25)" : "rgba(255,255,255,0.1)",
            boxShadow: focusColor ? "0 0 0 3px rgba(255,229,0,0.08)" : "none",
            color: value[i] ? "#ffe500" : "#eaf0ff",
          }}
        />
      ))}
    </div>
  );
}

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>("login");

  // login state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [nameFocus, setNameFocus] = useState(false);
  const [codeFocus, setCodeFocus] = useState(false);

  // forgot state
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailFocus, setResetEmailFocus] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  // shared
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => { checkSession(); }, []);

  function switchView(v: View) { setError(""); setView(v); }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

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

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Client-side credential check
    const nameMatch = name.trim().toLowerCase() === ADMIN_NAME.toLowerCase();
    const codeMatch = code === ADMIN_CODE;

    if (!nameMatch || !codeMatch) {
      setError("Invalid name or access code. Access denied.");
      triggerShake();
      setSubmitting(false);
      return;
    }

    // Credentials matched — call the session API to set a server-side session cookie
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code }),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        setError(body?.error || "Unable to sign in.");
        triggerShake();
        return;
      }
      setUnlocked(true);
    } catch {
      setError("Network error while signing in.");
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  }

  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        setError(body?.error || "Failed to send reset email. Check the address and try again.");
        return;
      }
      switchView("forgot-sent");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResetSending(false);
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
      <div style={{ minHeight: "100vh", background: "#06080f", display: "grid", placeItems: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "32px", height: "32px", border: "2px solid rgba(255,229,0,0.2)", borderTopColor: "#ffe500", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#8892b0", fontSize: "12px", letterSpacing: "0.2em", fontFamily: "monospace" }}>VERIFYING SESSION...</p>
        </div>
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .admin-card-shake { animation: shake 0.45s ease; }
      `}</style>

      <div style={S.root}>
        <StarField />
        <div style={S.nebula1} />
        <div style={S.nebula2} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <h1 style={S.title}>SHAURI</h1>
          <p style={S.subtitle}>CONTROL CENTER · ADMIN ACCESS</p>

          <div style={S.card} className={shake ? "admin-card-shake" : ""}>

            {/* ── LOGIN VIEW ── */}
            {view === "login" && (
              <>
                <div style={{ textAlign: "center" }}>
                  <span style={S.badge}>🧛 ADMIN LOGIN</span>
                  <p style={S.date}>{today}</p>
                  <h2 style={S.heading}>Control Center Access</h2>
                  <p style={S.subheading}>Authorized personnel only</p>
                </div>
                <div style={S.divider} />
                <form onSubmit={onLogin}>
                  <label style={S.label}>YOUR NAME</label>
                  <input
                    style={{
                      ...S.input,
                      borderColor: nameFocus ? "rgba(255,229,0,0.5)" : "rgba(255,255,255,0.1)",
                      boxShadow: nameFocus ? "0 0 0 3px rgba(255,229,0,0.08)" : "none",
                    }}
                    type="text"
                    autoComplete="off"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setNameFocus(true)}
                    onBlur={() => setNameFocus(false)}
                    required
                  />

                  <label style={S.label}>ACCESS CODE</label>
                  <CodeInput
                    value={code}
                    onChange={setCode}
                    focusColor={codeFocus}
                  />

                  <button
                    type="button"
                    style={S.forgotLink}
                    onClick={() => switchView("forgot")}
                  >
                    Forgot access? Reset via email →
                  </button>

                  {error && <div style={S.error}>⚠ {error}</div>}

                  <button
                    type="submit"
                    disabled={submitting || code.length < 4}
                    style={{
                      ...S.btn,
                      opacity: submitting || code.length < 4 ? 0.5 : 1,
                      cursor: submitting || code.length < 4 ? "not-allowed" : "pointer",
                    }}
                  >
                    {submitting ? "AUTHENTICATING..." : "ENTER CONTROL CENTER →"}
                  </button>
                </form>
                <p style={S.secureText}>🔒 ENCRYPTED · SECURE SESSION</p>
              </>
            )}

            {/* ── FORGOT / RESET VIEW ── */}
            {view === "forgot" && (
              <>
                <div style={{ textAlign: "center" }}>
                  <span style={S.badge}>🔑 RESET ACCESS</span>
                  <p style={S.date}>{today}</p>
                  <h2 style={S.heading}>Reset Access</h2>
                  <p style={S.subheading}>Enter your admin email and we'll send a reset link.</p>
                </div>
                <div style={S.divider} />
                <form onSubmit={onForgotPassword}>
                  <label style={S.label}>ADMIN EMAIL ADDRESS</label>
                  <input
                    style={{
                      ...S.input,
                      borderColor: resetEmailFocus ? "rgba(255,229,0,0.5)" : "rgba(255,255,255,0.1)",
                      boxShadow: resetEmailFocus ? "0 0 0 3px rgba(255,229,0,0.08)" : "none",
                    }}
                    type="email"
                    autoComplete="email"
                    placeholder="admin@shauri.app"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onFocus={() => setResetEmailFocus(true)}
                    onBlur={() => setResetEmailFocus(false)}
                    required
                  />
                  {error && <div style={S.error}>⚠ {error}</div>}
                  <button
                    type="submit"
                    disabled={resetSending}
                    style={{ ...S.btn, opacity: resetSending ? 0.5 : 1, cursor: resetSending ? "not-allowed" : "pointer" }}
                  >
                    {resetSending ? "SENDING..." : "SEND RESET LINK →"}
                  </button>
                  <button type="button" style={S.ghostBtn} onClick={() => switchView("login")}>
                    ← Back to sign in
                  </button>
                </form>
              </>
            )}

            {/* ── RESET SENT VIEW ── */}
            {view === "forgot-sent" && (
              <>
                <div style={{ textAlign: "center" }}>
                  <span style={S.badge}>✉️ CHECK INBOX</span>
                  <p style={S.date}>{today}</p>
                  <h2 style={S.heading}>Reset Link Sent</h2>
                </div>
                <div style={S.divider} />
                <div style={S.success}>
                  A password reset link has been sent to <strong>{resetEmail}</strong>. Check your inbox (and spam folder). The link expires in 1 hour.
                </div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", lineHeight: 1.7, marginBottom: "20px" }}>
                  Once you reset your credentials, come back here and sign in.
                </p>
                <button type="button" style={S.btn} onClick={() => switchView("login")}>
                  ← BACK TO SIGN IN
                </button>
                <button type="button" style={S.ghostBtn} onClick={() => { setResetEmail(""); switchView("forgot"); }}>
                  Use a different email
                </button>
              </>
            )}

          </div>

          <p style={S.footer}>SHAURI PLATFORM · INTERNAL USE ONLY</p>
        </div>
      </div>
    </>
  );
}