"use client";

import { useState } from "react";
import { saveStudent } from "../lib/student";

export default function StudentGate({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState("9");

  function submit() {
    if (!name.trim()) return alert("Enter name");
    saveStudent({
      name: name.trim(),
      classLevel: Number(cls),
    });
    onDone();
  }

  return (
    <div className="screen">
      <div className="card stack">
        <h2>Welcome to StudyMate</h2>

        <input
          placeholder="Student name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select value={cls} onChange={(e) => setCls(e.target.value)}>
          {[6, 7, 8, 9, 10, 11, 12].map((c) => (
            <option key={c} value={c}>
              Class {c}
            </option>
          ))}
        </select>

        <button onClick={submit}>Continue</button>
      </div>
    </div>
  );
}
