"use client";

import { useState } from "react";
import {
  getProfiles,
  addProfile,
  setActiveProfile,
} from "../lib/profiles";

export default function ProfileGate({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const profiles = getProfiles();

  function select(id: string) {
    setActiveProfile(id);
    onDone();
  }

  function create() {
    if (!name.trim()) return;
    const p = addProfile(name.trim());
    setActiveProfile(p.id);
    onDone();
  }

  return (
    <div className="screen">
      <div className="card stack">
        <h2>Select Child</h2>

        {profiles.map((p) => (
          <button key={p.id} onClick={() => select(p.id)}>
            {p.name}
          </button>
        ))}

        <input
          placeholder="New child name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="secondary" onClick={create}>
          Add Child
        </button>
      </div>
    </div>
  );
}
