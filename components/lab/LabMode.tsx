"use client";

// ============================================================
// /components/lab/LabMode.tsx  —  v2
// Subject selector → experiment list → tabbed runner
// ============================================================

import React, { useState } from "react";
import type { Subject, Experiment } from "@/lib/lab/types";
import { EXPERIMENTS, EXPERIMENT_COUNT, getExperimentsBySubject } from "@/lib/lab/labData";
import ExperimentRunner from "./ExperimentRunner";

// ─────────────────────────────────────────────────────────────
// Subject config
// ─────────────────────────────────────────────────────────────

interface SubjectConfig {
  label: string;
  icon: string;
  description: string;
  activeClass: string;
  hoverClass: string;
}

const SUBJECT_CONFIG: Record<Subject, SubjectConfig> = {
  chemistry: {
    label: "Chemistry",
    icon: "⚗️",
    description: "Acids, bases, reactions",
    activeClass: "border-orange-400 bg-orange-50",
    hoverClass: "hover:border-orange-300",
  },
  physics: {
    label: "Physics",
    icon: "⚡",
    description: "Circuits, optics, magnetism",
    activeClass: "border-blue-400 bg-blue-50",
    hoverClass: "hover:border-blue-300",
  },
  biology: {
    label: "Biology",
    icon: "🌿",
    description: "Life processes & slides",
    activeClass: "border-green-400 bg-green-50",
    hoverClass: "hover:border-green-300",
  },
};

const SUBJECTS: Subject[] = ["chemistry", "physics", "biology"];

// ─────────────────────────────────────────────────────────────
// SubjectSelector
// ─────────────────────────────────────────────────────────────

function SubjectSelector({
  active,
  onSelect,
}: {
  active: Subject | null;
  onSelect: (s: Subject) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Subject</p>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
        {SUBJECTS.map((subject) => {
          const cfg = SUBJECT_CONFIG[subject];
          const count = getExperimentsBySubject(subject).length;
          const isActive = active === subject;
          return (
            <button
              key={subject}
              onClick={() => onSelect(subject)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all duration-150
                ${isActive ? cfg.activeClass : `border-gray-100 bg-white ${cfg.hoverClass}`}`}
            >
              <span className="text-xl flex-shrink-0">{cfg.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{cfg.label}</p>
                <p className="text-xs text-gray-400 truncate hidden sm:block lg:block">{count} experiments</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ExperimentList
// ─────────────────────────────────────────────────────────────

function ExperimentList({
  experiments,
  activeId,
  onSelect,
}: {
  experiments: Experiment[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Experiments</p>
      <ul className="space-y-1.5">
        {experiments.map((exp) => {
          const isActive = activeId === exp.id;
          return (
            <li key={exp.id}>
              <button
                onClick={() => onSelect(exp.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-150
                  ${isActive
                    ? "border-indigo-400 bg-indigo-50 shadow-sm"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                  }`}
              >
                <p className={`text-sm font-medium leading-snug ${isActive ? "text-indigo-700" : "text-gray-800"}`}>
                  {exp.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{exp.conceptType}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
      <span className="text-5xl mb-4">🔬</span>
      <p className="text-sm max-w-xs">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LabMode
// ─────────────────────────────────────────────────────────────

export default function LabMode() {
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔬</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Virtual Science Lab</h1>
              <p className="text-xs text-gray-400">CBSE Class 10 — Lab Mode</p>
            </div>
          </div>
          <div className="text-xs text-gray-400 hidden sm:block">
            {EXPERIMENT_COUNT} experiments · 3 subjects
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-5 shadow-sm">
              <SubjectSelector active={activeSubject} onSelect={handleSubjectSelect} />
              {activeSubject && experiments.length > 0 && (
                <ExperimentList
                  experiments={experiments}
                  activeId={activeExperimentId}
                  onSelect={setActiveExperimentId}
                />
              )}
            </div>

            {/* Completion hint */}
            {activeExperiment && (
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-xs text-gray-500 space-y-1">
                <p className="font-semibold text-gray-700">Board prep checklist</p>
                <p>⚗️ Run the experiment</p>
                <p>📐 Study the diagram</p>
                <p>📋 Fill observation table</p>
                <p>🧠 Attempt MCQ quiz</p>
                <p>🎤 Review viva Q&A</p>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm min-h-[500px]">
            {!activeSubject && (
              <EmptyState message="Select a subject from the sidebar to begin your virtual lab session." />
            )}
            {activeSubject && !activeExperimentId && (
              <EmptyState
                message={`Choose an experiment from the ${SUBJECT_CONFIG[activeSubject].label} list on the left.`}
              />
            )}
            {activeExperiment && (
              <ExperimentRunner key={activeExperiment.id} experiment={activeExperiment} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}