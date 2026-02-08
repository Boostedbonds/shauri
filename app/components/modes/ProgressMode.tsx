"use client";

import { useState, useRef } from "react";
import { getActiveProfile } from "../../lib/profiles";
import { getRecords, clearRecords } from "../../lib/progress";
import { getWeakTopics } from "../../lib/analytics";
import { isParentVerified, verifyParent, clearParent } from "../../lib/parent";

export default function ProgressMode() {
  const profile = getActiveProfile();
  const [parent, setParent] = useState(isParentVerified());
  const [code, setCode] = useState("");
  const [revision, setRevision] = useState("");
  const [practice, setPractice] = useState("");
  const [loadingRevision, setLoadingRevision] = useState(false);
  const [loadingPractice, setLoadingPractice] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  if (!profile) {
    return (
      <div className="screen">
        <div className="card">No child selected.</div>
      </div>
    );
  }

  const records = getRecords(profile.id);
  const weakTopics = getWeakTopics(profile.id);

  async function generateRevision() {
    if (weakTopics.length === 0) return;
    setLoadingRevision(true);

    const res = await fetch("/api/revision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: weakTopics }),
    });

    const data = await res.json();
    setRevision(data.revision);
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
    setPractice(data.practice);
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
    clearRecords(profile.id);
    clearParent();
    setParent(false);
  }

  return (
    <div className="screen">
      <div className="card stack">
        <h2>{profile.name} – Progress</h2>

        {/* Weak Topics */}
        {weakTopics.length > 0 && (
          <>
            <h3 style={{ color: "#f87171" }}>Weak Topics</h3>
            <ul>
              {weakTopics.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>

            <button onClick={generateRevision} disabled={loadingRevision}>
              {loadingRevision ? "Generating Revision…" : "Generate Revision Notes"}
            </button>

            <button onClick={generatePractice} disabled={loadingPractice}>
              {loadingPractice ? "Generating Practice…" : "Generate Practice Questions"}
            </button>
          </>
        )}

        {/* EXPORT BUTTON */}
        {(revision || practice) && (
          <button onClick={exportPDF}>
            Export as PDF
          </button>
        )}

        {/* PRINT AREA */}
        <div ref={printRef} id="print-area">
          {revision && (
            <>
              <h3>Auto-Revision Notes</h3>
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

        {/* Exam Records */}
        {records.map((r, i) => (
          <div key={i}>
            <p>{r.date}</p>
            {r.score && <p>{r.score}</p>}
            {r.percentage && <p>{r.percentage}</p>}
          </div>
        ))}

        {/* Parent Lock */}
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
