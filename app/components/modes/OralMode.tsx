"use client";

import { useEffect, useState } from "react";

type Level = "weak" | "partial" | "strong";

type Profile = {
  id: string;
  name: string;
};

type Insight = {
  childId: string;
  topic: string;
  level: Level;
  date: string;
};

function saveInsight(_insight: Insight): void {
  return;
}

type OralModeProps = {
  onBack: () => void;
};

export default function OralMode({ onBack }: OralModeProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topic, setTopic] = useState<string>("");
  const [level, setLevel] = useState<Level>("partial");

  useEffect(() => {
    const raw = localStorage.getItem("shauri_profile");
    if (!raw) return;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "id" in parsed &&
        typeof (parsed as any).id === "string"
      ) {
        setProfile(parsed as Profile);
      }
    } catch {
      return;
    }
  }, []);

  function handleLevelChange(value: string) {
    if (value === "weak" || value === "partial" || value === "strong") {
      setLevel(value);
    }
  }

  function handleSave() {
    if (!profile) return;
    if (!topic.trim()) return;

    const insight: Insight = {
      childId: profile.id,
      topic: topic.trim(),
      level: level,
      date: new Date().toLocaleString(),
    };

    saveInsight(insight);
    setTopic("");
    setLevel("partial");
  }

  if (!profile) {
    return <div style={{ padding: 16 }}>No child profile loaded.</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      {/* 🔙 Back Button — locked base UI style */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={onBack}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: 12,
            border: "none",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>

      <h2>Oral Mode</h2>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Topic"
        style={{ display: "block", marginBottom: 8 }}
      />

      <select
        value={level}
        onChange={(e) => handleLevelChange(e.target.value)}
        style={{ display: "block", marginBottom: 8 }}
      >
        <option value="weak">Weak</option>
        <option value="partial">Partial</option>
        <option value="strong">Strong</option>
      </select>

      <button onClick={handleSave}>Save</button>
    </div>
  );
}
