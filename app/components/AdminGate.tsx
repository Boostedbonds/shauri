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
    () => new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
    []
  );

  if (loading) {
    return <div className="min-h-screen bg-[#050913] text-[#d7deff] grid place-items-center">Loading admin session...</div>;
  }
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050913] text-[#eaf0ff]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(73,112,255,0.28),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(0,220,255,0.2),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(109,61,255,0.2),transparent_40%)]" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <main className="relative z-10 min-h-screen p-6 md:p-10 grid lg:grid-cols-2 gap-8 items-center">
        <section>
          <p className="text-xs tracking-[0.28em] text-[#aab8ff] mb-3">SHAURI CONTROL CENTER</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-[0.06em] mb-4">ADMIN ACCESS</h1>
          <p className="text-[#b7c2f0] max-w-xl leading-7">Secure internal operations console for SHAURI platform analytics, users, and knowledge systems.</p>
        </section>
        <section className="w-full max-w-md lg:justify-self-end">
          <form onSubmit={onSubmit} className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-2xl p-6 md:p-8">
            <div className="text-xs tracking-[0.22em] text-[#b8c4ff] mb-1">{today}</div>
            <h2 className="text-2xl font-bold mb-6">Sign in</h2>
            <label className="text-xs text-[#c7d1ff] tracking-[0.14em]">EMAIL</label>
            <input className="mt-2 mb-4 w-full rounded-xl border border-white/15 bg-[#0d1428] px-4 py-3 outline-none focus:ring-2 focus:ring-[#5f86ff]" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="text-xs text-[#c7d1ff] tracking-[0.14em]">PASSWORD</label>
            <div className="mt-2 mb-4 flex rounded-xl border border-white/15 bg-[#0d1428] focus-within:ring-2 focus-within:ring-[#5f86ff]">
              <input className="flex-1 bg-transparent px-4 py-3 outline-none" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="px-4 text-sm text-[#b0c0ff]" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button>
            </div>
            {error ? <p className="mb-4 rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p> : null}
            <button disabled={submitting} className="w-full rounded-xl bg-gradient-to-r from-[#5979ff] to-[#38d7ff] px-4 py-3 font-bold tracking-[0.08em] text-[#061022] disabled:opacity-70">{submitting ? "AUTHENTICATING..." : "ENTER CONTROL CENTER"}</button>
          </form>
        </section>
      </main>
    </div>
  );
}

