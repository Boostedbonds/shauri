"use client";

// ============================================================
// /components/lab/LabMode.tsx — SHAURI Premium Redesign
// Subject selector → experiment list → tabbed runner
// ============================================================

import React, { useState } from "react";
import type { Subject, Experiment } from "@/lib/lab/types";
import { EXPERIMENTS, EXPERIMENT_COUNT, getExperimentsBySubject } from "@/lib/lab/labData";
import ExperimentRunner from "./ExperimentRunner";

// ── Subject config ──────────────────────────────────────────

interface SubjectConfig {
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  activeBg: string;
  icon: string;
}

const SUBJECT_CONFIG: Record<Subject, SubjectConfig> = {
  chemistry: {
    label: "Chemistry",
    description: "Acids, bases & reactions",
    color: "#C17B2F",
    bg: "#FDF6EC",
    border: "#E8C98A",
    activeBg: "#FDF0D8",
    icon: "⚗",
  },
  physics: {
    label: "Physics",
    description: "Circuits, optics & magnetism",
    color: "#1E4D91",
    bg: "#EEF3FC",
    border: "#A8C4E8",
    activeBg: "#DDE8F8",
    icon: "⚡",
  },
  biology: {
    label: "Biology",
    description: "Life processes & specimens",
    color: "#1E6B3C",
    bg: "#EEFAF3",
    border: "#8FD4A8",
    activeBg: "#D4F0E0",
    icon: "🌿",
  },
};

const SUBJECTS: Subject[] = ["chemistry", "physics", "biology"];

// ── SubjectSelector ─────────────────────────────────────────

function SubjectSelector({
  active,
  onSelect,
}: {
  active: Subject | null;
  onSelect: (s: Subject) => void;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#9B8A6E",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 10,
          paddingLeft: 2,
        }}
      >
        Subject
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SUBJECTS.map((subject) => {
          const cfg = SUBJECT_CONFIG[subject];
          const count = getExperimentsBySubject(subject).length;
          const isActive = active === subject;
          return (
            <button
              key={subject}
              onClick={() => onSelect(subject)}
              style={{
                background: isActive ? cfg.activeBg : "transparent",
                border: `1.5px solid ${isActive ? cfg.border : "transparent"}`,
                borderRadius: 12,
                padding: "11px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                transition: "all 0.2s",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = cfg.bg;
                  e.currentTarget.style.borderColor = cfg.border + "88";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: isActive ? cfg.color + "20" : "#F0E8D4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {cfg.icon}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: isActive ? 800 : 600,
                    fontSize: 13,
                    color: isActive ? cfg.color : "#4A3C28",
                  }}
                >
                  {cfg.label}
                </div>
                <div style={{ fontSize: 11, color: "#9B8A6E", marginTop: 1 }}>
                  {count} experiments
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ExperimentList ──────────────────────────────────────────

function ExperimentList({
  experiments,
  activeId,
  onSelect,
  subject,
}: {
  experiments: Experiment[];
  activeId: string | null;
  onSelect: (id: string) => void;
  subject: Subject;
}) {
  const cfg = SUBJECT_CONFIG[subject];
  return (
    <div>
      <p
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#9B8A6E",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 10,
          paddingLeft: 2,
        }}
      >
        Experiments
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {experiments.map((exp) => {
          const isActive = activeId === exp.id;
          return (
            <button
              key={exp.id}
              onClick={() => onSelect(exp.id)}
              style={{
                background: isActive ? cfg.color + "12" : "transparent",
                border: `1.5px solid ${isActive ? cfg.color + "44" : "transparent"}`,
                borderRadius: 11,
                padding: "10px 13px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.18s",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#F5EED8";
                  e.currentTarget.style.borderColor = "#D4C4A044";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <div
                style={{
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  color: isActive ? cfg.color : "#3A3020",
                  lineHeight: 1.35,
                  marginBottom: 3,
                }}
              >
                {exp.title}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#9B8A6E",
                  textTransform: "capitalize",
                  background: "#F0E8D4",
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 99,
                }}
              >
                {exp.conceptType.replace(/-/g, " ")}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Checklist ───────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { id: "run", label: "Run experiment", icon: "⚗" },
  { id: "diagram", label: "Study the diagram", icon: "📐" },
  { id: "observe", label: "Fill observation table", icon: "📋" },
  { id: "quiz", label: "Attempt MCQ quiz", icon: "🧠" },
  { id: "viva", label: "Review viva Q&A", icon: "🎤" },
];

function Checklist({ experimentId }: { experimentId: string }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setChecked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  React.useEffect(() => setChecked(new Set()), [experimentId]);

  const pct = Math.round((checked.size / CHECKLIST_ITEMS.length) * 100);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#9B8A6E",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Board Prep
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: pct === 100 ? "#1E6B3C" : "#9B8A6E",
          }}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          borderRadius: 99,
          background: "#E8DCC8",
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: pct === 100 ? "#1E6B3C" : "#C17B2F",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {CHECKLIST_ITEMS.map((item) => {
          const done = checked.has(item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 10px",
                borderRadius: 9,
                cursor: "pointer",
                background: done ? "#EDFAF3" : "transparent",
                transition: "background 0.2s",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: `2px solid ${done ? "#1E6B3C" : "#C4B89A"}`,
                  background: done ? "#1E6B3C" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s",
                  fontSize: 10,
                  color: "#fff",
                }}
              >
                {done ? "✓" : ""}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: done ? 700 : 500,
                  color: done ? "#1E6B3C" : "#6B5B3E",
                }}
              >
                {item.icon} {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        textAlign: "center",
        color: "#9B8A6E",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: "#F0E8D4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          marginBottom: 20,
        }}
      >
        ⚗
      </div>
      <p
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#6B5B3E",
          marginBottom: 8,
          maxWidth: 300,
        }}
      >
        {message}
      </p>
      <p style={{ fontSize: 12, color: "#B8A88A", maxWidth: 260 }}>
        Select from the panel on the left to begin your virtual lab session.
      </p>
    </div>
  );
}

// ── LabMode ─────────────────────────────────────────────────

export default function LabMode() {
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const experiments = activeSubject ? getExperimentsBySubject(activeSubject) : [];
  const activeExperiment = activeExperimentId
    ? (EXPERIMENTS.find((e) => e.id === activeExperimentId) ?? null)
    : null;

  const handleSubjectSelect = (subject: Subject) => {
    if (subject === activeSubject) return;
    setActiveSubject(subject);
    setActiveExperimentId(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5EED8",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: "#1C1810",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(245, 238, 216, 0.94)",
          backdropFilter: "blur(12px)",
          borderBottom: "1.5px solid #D4C4A0",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          height: 60,
          gap: 14,
        }}
      >
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          style={{
            background: "none",
            border: "1.5px solid #D4C4A0",
            borderRadius: 8,
            cursor: "pointer",
            padding: "6px 9px",
            color: "#6B5B3E",
            fontSize: 16,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
          }}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          ☰
        </button>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "linear-gradient(135deg, #1C3A6E 0%, #2E5FAA 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🔬
          </div>
          <div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 14,
                letterSpacing: "0.07em",
                color: "#1C3A6E",
                textTransform: "uppercase",
              }}
            >
              SHAURI
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#9B8A6E",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Virtual Lab
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Stats pill */}
        <div
          style={{
            background: "#1C3A6E",
            color: "#F5EED8",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.07em",
            padding: "5px 14px",
            borderRadius: 99,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {EXPERIMENT_COUNT} Experiments · CBSE Class 10
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        {/* ── Sidebar ── */}
        <aside
          style={{
            width: sidebarOpen ? 264 : 0,
            minWidth: sidebarOpen ? 264 : 0,
            overflow: "hidden",
            transition: "all 0.3s ease",
            background: "#FDFAF3",
            borderRight: "1.5px solid #D4C4A0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "20px 14px",
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            <SubjectSelector active={activeSubject} onSelect={handleSubjectSelect} />

            {activeSubject && experiments.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid #E8DCC8",
                  paddingTop: 20,
                }}
              >
                <ExperimentList
                  experiments={experiments}
                  activeId={activeExperimentId}
                  onSelect={setActiveExperimentId}
                  subject={activeSubject}
                />
              </div>
            )}

            {activeExperiment && (
              <div
                style={{
                  borderTop: "1px solid #E8DCC8",
                  paddingTop: 20,
                }}
              >
                <Checklist experimentId={activeExperiment.id} />
              </div>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              background: "#FDFAF3",
              borderRadius: 20,
              border: "1.5px solid #D4C4A0",
              minHeight: 500,
              overflow: "hidden",
            }}
          >
            {!activeSubject && (
              <EmptyState message="Select a subject from the sidebar to begin your virtual lab session." />
            )}
            {activeSubject && !activeExperimentId && (
              <EmptyState
                message={`Choose an experiment from the ${SUBJECT_CONFIG[activeSubject].label} list on the left.`}
              />
            )}
            {activeExperiment && (
              <ExperimentRunner
                key={activeExperiment.id}
                experiment={activeExperiment}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}