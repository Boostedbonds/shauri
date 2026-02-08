"use client";

import { useState, useRef } from "react";
import { getActiveProfile } from "../../lib/profiles";
import { getRecords, clearRecords } from "../../lib/progress";
import { getWeakTopics } from "../../lib/analytics";
import { isParentVerified, verifyParent, clearParent } from "../../lib/parent";

export default function ProgressMode() {
  const profile = getActiveProfile();

  // 🔒 HARD EXIT — required
  if (!profile) {
    return (
      <div className="screen">
        <div className="card">No child selected.</div>
      </div>
    );
  }

  // ✅ FREEZE NON-NULL VALUES
  const childId = profile.id;
  const childName = profile.name;

  const [parent, setParent] = useState(isParentVerified());
  const [code, setCode] = useState("");
  const [revision, setRevision] = useState("");
  const [practice, setPractice] = useState("");
  const [loadingRevision, setLoadingRevision] = useState(false);
  const [loadingPractice, setLoadingPractice] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const records = getRecords(childId);
  const weakTopics = getWeakTopics(childId);

  async function generateRevision() {
    if (weakTopics.length === 0) return;

    setLoadingRevision(true);
    const res = await fetch("/api/revision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: weakTopics }),
    });

    const data = await res.json();
    setRevision(data.revision || "");
    setLoadingRevision(false);
  }

  async function generatePractice() {
    if (weakTopics.length === 0) return;

    setLoadingPractice(true);
    const res = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: weakTopics }),
    });

    const data = await res.json();
    setPractice(data.practice || "");
    setLoadingPractice(false);
  }

  function exportPDF() {
    window.print();
  }

  function unlock() {
    if (verifyParent(code)) setParent(true);
    else alert("Invalid parent code");
  }

  function resetChild() {
    if (!confirm("Delete this child's history?")) return;

    clearRecords(childId);
    clearParent();
    setParent(false);
  }

  return (
    <div className="screen">
      <div className="card stack">
        <h2>{childName} – Progress</h2>

        {weakTopics.length > 0 && (
          <>
            <h3 style={{ color: "#f87171" }}>Weak Topics</h3>
            <ul>
              {weakTopics.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>

            <button onClick={generateRevision} disabled={loadingRevision}>
              {loadingRevision ? "Generating…" : "Generate Revision Notes"}
            </button>

            <button onClick={generatePractice} disabled={loadingPractice}>
              {loadingPractice ? "Generating…" : "Generate Practice Questions"}
            </button>
          </>
        )}

        {(revision || practice) && (
          <button onClick={exportPDF}>Export as PDF</button>
        )}

        <div ref={printRef} id="print-area">
          {revision && (
            <>
              <h3>Revision Notes</h3>
              <pre style={{ whiteSpace: "pre-wrap" }}>{revision}</pre>
            </>
          )}

          {practice && (
            <>
              <h3>Practice Questions</h3>
              <pre style={{ whiteSpace: "pre-wrap" }}>{practice}</pre>
            </>
          )}
        </div>

        {records.map((r, i) => (
          <div key={i}>
            <p>{r.date}</p>
            {r.score && <p>{r.score}</p>}
            {r.percentage && <p>{r.percentage}</p>}
          </div>
        ))}

        {!parent && records.length > 0 && (
          <>
            <input
              placeholder="Parent code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button onClick={unlock}>Unlock</button>
          </>
        )}

        {parent && records.length > 0 && (
          <button className="secondary" onClick={resetChild}>
            Reset This Child
          </button>
        )}
      </div>
    </div>
  );
}
