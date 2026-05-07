"use client";
import { useState, useEffect } from "react";
import { hasAccess, grantAccess, ACCESS_KEY } from "../../lib/session";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasAccess()) setUnlocked(true);
  }, []);

  function handleLogin() {
    if (name.trim().toLowerCase() === "dracula" && code.trim() === "3011") {
      grantAccess();
      setUnlocked(true);
      setError("");
    } else {
      setError("Invalid name or access code.");
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-1">Admin Access</h1>
        <p className="text-slate-400 text-sm mb-6">Enter your credentials to continue</p>
        <div className="space-y-4">
          <div>
            <label className="text-slate-300 text-sm mb-1 block">Admin Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name"
              className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-300 text-sm mb-1 block">Access Code</label>
            <input
              type="password"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter code"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-lg transition"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
