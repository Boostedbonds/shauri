"use client";

import { useState } from "react";
import { getStudent } from "@/app/lib/student";
import { saveRecord } from "@/app/lib/progress";

export default function ExaminerMode() {
  const student = getStudent();
  const profile = student?.profile ?? null;

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const askExaminer = async () => {
    if (!question.trim()) return;

    if (!profile) {
      alert("Student profile not found. Please select child again.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "examiner",
          question,
          answer,
          classLevel: profile.classLevel,
        }),
      });

      const data = await res.json();
      setResult(data.reply);

      saveRecord({
        childId: profile.id,
        date: new Date().toLocaleString(),
        mode: "examiner",
        score: findScore(data.reply),
      });
    } catch (e) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Examiner Mode</h2>

      <textarea
        placeholder="Enter question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <textarea
        placeholder="Student answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />

      <button onClick={askExaminer} disabled={loading}>
        {loading ? "Evaluating..." : "Evaluate"}
      </button>

      {result && (
        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
          {result}
        </pre>
      )}
    </div>
  );
}

/* ------------------ helpers ------------------ */

function findScore(text: string): string {
  const match = text.match(/total\s*marks\s*[:\-]?\s*(\d+)/i);
  return match ? match[1] : "N/A";
}
