"use client";

import { useEffect, useRef, useState } from "react";
import { saveRecord } from "../../lib/progress";
import { getActiveProfile } from "../../lib/profiles";

type Msg = { role: "user"; content: string };

export default function ExaminerMode() {
  const profile = getActiveProfile();
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paper, setPaper] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [buffer, setBuffer] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const autoSubmittedRef = useRef(false);

  if (!profile) {
    return (
      <div className="screen">
        <div className="card">No child selected.</div>
      </div>
    );
  }

  /* ─────────── EXAM SAFETY LOCKS ─────────── */

  useEffect(() => {
    if (!started || submitted) return;

    // Refresh / close warning
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "Leaving will submit the exam automatically.";
      return e.returnValue;
    };

    // Tab switch / minimize detection
    const onVisibility = () => {
      if (document.hidden && !autoSubmittedRef.current) {
        autoSubmit("Tab switch detected");
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted]);

  async function autoSubmit(reason: string) {
    if (submitted || submitting) return;
    autoSubmittedRef.current = true;
    await submitExam(`AUTO-SUBMIT: ${reason}`);
  }

  /* ─────────── EXAM FLOW ─────────── */

  async function startExam() {
    if (started) return;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "examiner",
        messages: [{ role: "user", content: "START" }],
      }),
    });

    const data = await res.json();
    setPaper(data.reply);
    setStarted(true);
  }

  function addTypedAnswer() {
    if (!started || submitted) return;
    if (!input.trim()) return;
    setBuffer((b) => [...b, { role: "user", content: input }]);
    setInput("");
  }

  async function submitExam(extraNote?: string) {
    if (submitted || submitting) return;
    setSubmitting(true);

    const messages =
      extraNote
        ? [...buffer, { role: "user", content: extraNote }]
        : buffer;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "examiner",
        messages,
      }),
    });

    const data = await res.json();
    setEvaluation(data.reply);
    setSubmitted(true);
    setSubmitting(false);

    saveRecord({
      childId: profile.id,
      date: new Date().toLocaleString(),
      mode: "examiner",
      score: find("Total marks", data.reply),
      percentage: find("Percentage", data.reply),
      timeTaken: find("Time", data.reply),
    });
  }

  function find(k: string, t: string) {
    return t.split("\n").find((l) => l.toLowerCase().includes(k.toLowerCase())) || "N/A";
  }

  /* ─────────── UI STATES ─────────── */

  if (!started) {
    return (
      <div className="screen">
        <div className="card stack">
          <h2>{profile.name}</h2>
          <button onClick={startExam}>START EXAM</button>
        </div>
      </div>
    );
  }

  if (started && !submitted) {
    return (
      <div className="screen">
        <div className="card stack">
          <div style={{ color: "#facc15", fontWeight: 600 }}>
            EXAM IN PROGRESS — TAB SWITCH / REFRESH WILL AUTO-SUBMIT
          </div>

          <pre style={{ whiteSpace: "pre-wrap" }}>{paper}</pre>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            placeholder="Write answers with question numbers"
          />

          <button onClick={addTypedAnswer}>Add Answer</button>

          <button
            className="secondary"
            onClick={() => submitExam()}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "SUBMIT"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="card">
        <div style={{ color: "#4ade80", fontWeight: 600 }}>
          EXAM SUBMITTED — LOCKED
        </div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{evaluation}</pre>
      </div>
    </div>
  );
}
