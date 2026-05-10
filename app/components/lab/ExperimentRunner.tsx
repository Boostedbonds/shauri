"use client";

// ============================================================
// /components/lab/ExperimentRunner.tsx — SHAURI Premium Redesign
// All logic preserved. UI fully elevated to SHAURI design system.
// ============================================================

import React, { useState, useCallback, useMemo } from "react";
import type { Experiment, ExperimentResult, DynamicResult } from "@/lib/lab/types";
import {
  runReaction,
  calculateOhmsLaw,
  resolveDynamicInputs,
  buildAIPrompt,
  prepareAIPromptInput,
} from "@/lib/lab/reactionEngine";
import { getSimSteps } from "@/lib/lab/simulations/chemistrySteps";
import ChemistrySimulator from "./ChemistrySimulator";
import DiagramViewer from "./DiagramViewer";
import ObservationTable from "./ObservationTable";
import MCQQuiz from "./MCQQuiz";
import VivaQA from "./VivaQA";

// ── Tab config ──────────────────────────────────────────────

type Tab = "simulate" | "diagram" | "observe" | "quiz" | "viva";

const ALL_TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "simulate", label: "Simulate", icon: "⚗" },
  { id: "diagram",  label: "Diagram",  icon: "📐" },
  { id: "observe",  label: "Observe",  icon: "📋" },
  { id: "quiz",     label: "Quiz",     icon: "🧠" },
  { id: "viva",     label: "Viva",     icon: "🎤" },
];

// Subject accent colours
const SUBJECT_COLOR: Record<string, string> = {
  chemistry: "#C17B2F",
  physics: "#1E4D91",
  biology: "#1E6B3C",
};

// ── StepList ────────────────────────────────────────────────

function StepList({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {steps.map((step, idx) => (
        <div
          key={idx}
          style={{ display: "flex", gap: 14, paddingBottom: idx < steps.length - 1 ? 18 : 0, position: "relative" }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#1C3A6E",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  width: 2,
                  flex: 1,
                  background: "#D4C4A0",
                  marginTop: 4,
                  minHeight: 14,
                }}
              />
            )}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#3A3020",
              lineHeight: 1.7,
              paddingTop: 4,
              paddingBottom: 12,
              margin: 0,
            }}
          >
            {step}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── PrecautionsList ─────────────────────────────────────────

function PrecautionsList({ precautions }: { precautions: Experiment["precautions"] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {precautions.map((p) => (
        <div
          key={p.id}
          style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
        >
          <span style={{ color: "#C17B2F", flexShrink: 0, fontSize: 14, marginTop: 1 }}>⚠</span>
          <span style={{ fontSize: 13, color: "#5A4020", lineHeight: 1.6 }}>{p.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── PhysicsInputs ───────────────────────────────────────────

interface PhysicsInputsProps {
  experiment: Experiment;
  values: Record<string, number>;
  onChange: (id: string, value: number) => void;
  dynamicResult: DynamicResult | null;
}

function PhysicsInputs({ experiment, values, onChange, dynamicResult }: PhysicsInputsProps) {
  if (!experiment.dynamicInputs?.length) return null;
  return (
    <div
      style={{
        background: "#EEF3FC",
        border: "1.5px solid #B5CCE8",
        borderRadius: 14,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#1E4D91",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        ⚡ Dynamic Inputs
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {experiment.dynamicInputs.map((input) => (
          <div key={input.id}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: "#1E4D91",
                marginBottom: 6,
              }}
            >
              {input.label}{" "}
              <span style={{ color: "#6B7A9E", fontWeight: 500 }}>({input.unit})</span>
            </label>
            <input
              type="range"
              min={input.min}
              max={input.max}
              step={input.step}
              value={values[input.id] ?? input.defaultValue}
              onChange={(e) => onChange(input.id, parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#1E4D91" }}
            />
            <div
              style={{
                textAlign: "right",
                fontSize: 13,
                fontWeight: 800,
                color: "#1E4D91",
                fontFamily: "monospace",
                marginTop: 2,
              }}
            >
              {values[input.id] ?? input.defaultValue} {input.unit}
            </div>
          </div>
        ))}
      </div>
      {dynamicResult && (
        <div
          style={{
            marginTop: 16,
            background: "#FDFAF3",
            border: "1.5px solid #B5CCE8",
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 11, color: "#6B7A9E", marginBottom: 4 }}>Live Calculation</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "#1C3A6E" }}>
            {dynamicResult.formula}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#1E4D91", marginTop: 6 }}>
            {dynamicResult.label}: {dynamicResult.value}{" "}
            <span style={{ fontSize: 14, fontWeight: 600 }}>{dynamicResult.unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ResultPanel ─────────────────────────────────────────────

function ResultPanel({ result, onShowPrompt }: { result: ExperimentResult; onShowPrompt: () => void }) {
  const color = result.success ? "#1E6B3C" : "#B5271A";
  const bg = result.success ? "#EDFAF3" : "#FDF0EE";
  const border = result.success ? "#8FD4A8" : "#E8A8A0";

  return (
    <div
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{result.success ? "✅" : "❌"}</span>
        <span style={{ fontWeight: 800, fontSize: 14, color }}>
          {result.success ? "Experiment Successful" : "Incomplete Setup"}
        </span>
      </div>

      {result.equation && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#9B8A6E",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Equation
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              background: "#FDFAF3",
              border: "1.5px solid #D4C4A0",
              borderRadius: 9,
              padding: "10px 14px",
              color: "#1C3A6E",
              whiteSpace: "pre-wrap",
            }}
          >
            {result.equation}
          </div>
        </div>
      )}

      {result.products.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#9B8A6E",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Products
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.products.map((p) => (
              <span
                key={p}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#FDFAF3",
                  border: "1.5px solid #D4C4A0",
                  color: "#4A3C28",
                  borderRadius: 99,
                  padding: "4px 12px",
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#9B8A6E",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Observation
        </div>
        <p style={{ fontSize: 13, color: "#3A3020", lineHeight: 1.7, margin: 0 }}>
          {result.observation}
        </p>
      </div>

      <button
        onClick={onShowPrompt}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          color: "#1E4D91",
          textDecoration: "underline",
          textAlign: "left",
          padding: 0,
        }}
      >
        View AI Prompt (integration ready)
      </button>
    </div>
  );
}

// ── StaticRunner (physics + biology) ────────────────────────

function StaticRunner({ experiment }: { experiment: Experiment }) {
  const color = SUBJECT_COLOR[experiment.subject] ?? "#C17B2F";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [dynamicValues, setDynamicValues] = useState<Record<string, number>>(
    () => Object.fromEntries((experiment.dynamicInputs ?? []).map((i) => [i.id, i.defaultValue]))
  );
  const [showPrompt, setShowPrompt] = useState(false);

  React.useEffect(() => {
    setSelectedIds(new Set());
    setResult(null);
    setShowPrompt(false);
    setDynamicValues(Object.fromEntries((experiment.dynamicInputs ?? []).map((i) => [i.id, i.defaultValue])));
  }, [experiment.id]);

  const dynamicResult: DynamicResult | null = useMemo(() => {
    if (experiment.subject !== "physics" || !experiment.dynamicInputs) return null;
    const resolved = resolveDynamicInputs(experiment.dynamicInputs, dynamicValues);
    if (experiment.id === "phys-ohms-law") return calculateOhmsLaw(resolved["voltage"], resolved["resistance"]);
    return null;
  }, [experiment, dynamicValues]);

  const toggleMaterial = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setResult(null);
  }, []);

  const handleRun = useCallback(() => {
    setResult(runReaction(experiment, [...selectedIds]));
    setShowPrompt(false);
  }, [experiment, selectedIds]);

  const aiPrompt = useMemo(() => {
    if (!result) return "";
    return buildAIPrompt(prepareAIPromptInput(experiment, result));
  }, [experiment, result]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Procedure */}
      <section>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#9B8A6E",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Step-by-Step Procedure
        </div>
        <StepList steps={experiment.steps} />
      </section>

      {/* Precautions */}
      <section>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#C17B2F",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Precautions
        </div>
        <div
          style={{
            background: "#FDF6EC",
            border: "1.5px solid #E8C98A",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <PrecautionsList precautions={experiment.precautions} />
        </div>
      </section>

      {/* Materials bench */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#9B8A6E",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Materials Bench
          </div>
          <button
            onClick={() => { setSelectedIds(new Set(experiment.materials.map((m) => m.id))); setResult(null); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              color: color,
              fontWeight: 700,
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Add All
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {experiment.materials.map((mat) => {
            const isSelected = selectedIds.has(mat.id);
            return (
              <button
                key={mat.id}
                onClick={() => toggleMaterial(mat.id)}
                style={{
                  background: isSelected ? color + "10" : "#FDFAF3",
                  border: `1.5px solid ${isSelected ? color + "55" : "#D4C4A0"}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.18s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>
                    {isSelected ? "🧪" : "○"}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isSelected ? color : "#3A3020",
                        lineHeight: 1.3,
                      }}
                    >
                      {mat.name}
                    </div>
                    {mat.formula && (
                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: "#9B8A6E",
                          marginTop: 2,
                        }}
                      >
                        {mat.formula}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "#9B8A6E", marginTop: 8 }}>
          {selectedIds.size} / {experiment.materials.length} added
        </div>
      </section>

      {/* Physics dynamic inputs */}
      {experiment.subject === "physics" && (
        <PhysicsInputs
          experiment={experiment}
          values={dynamicValues}
          onChange={(id, val) => setDynamicValues((prev) => ({ ...prev, [id]: val }))}
          dynamicResult={dynamicResult}
        />
      )}

      {/* Expected observation */}
      <div
        style={{
          background: "#FDF6EC",
          border: "1.5px solid #E8C98A",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13,
          color: "#5A4020",
          lineHeight: 1.6,
        }}
      >
        <span style={{ fontWeight: 800, color: "#C17B2F" }}>Expected: </span>
        {experiment.expectedObservation}
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={selectedIds.size === 0}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 12,
          background: selectedIds.size === 0 ? "#E8DCC8" : color,
          color: selectedIds.size === 0 ? "#9B8A6E" : "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: 14,
          cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
          letterSpacing: "0.04em",
          transition: "all 0.2s",
        }}
      >
        ▶ Run Experiment
      </button>

      {result && (
        <ResultPanel result={result} onShowPrompt={() => setShowPrompt((p) => !p)} />
      )}

      {showPrompt && aiPrompt && (
        <div
          style={{
            background: "#F5EED8",
            border: "1.5px solid #D4C4A0",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8A6E", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              AI Prompt (ready for API)
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(aiPrompt)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                color: "#1E4D91",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Copy
            </button>
          </div>
          <pre
            style={{
              fontSize: 11,
              color: "#4A3C28",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {aiPrompt}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── ExperimentRunner ────────────────────────────────────────

export default function ExperimentRunner({ experiment }: { experiment: Experiment }) {
  const [activeTab, setActiveTab] = useState<Tab>("simulate");
  const color = SUBJECT_COLOR[experiment.subject] ?? "#C17B2F";

  React.useEffect(() => { setActiveTab("simulate"); }, [experiment.id]);

  const hasChemistrySim =
    experiment.subject === "chemistry" && getSimSteps(experiment.id) !== null;

  const visibleTabs = ALL_TABS.filter((tab) => {
    if (tab.id === "diagram" && !experiment.diagram) return false;
    if (tab.id === "observe" && !experiment.observationTable) return false;
    return true;
  });

  return (
    <div>
      {/* Experiment header */}
      <div
        style={{
          padding: "24px 28px 20px",
          borderBottom: "1.5px solid #E8DCC8",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {experiment.subject} · {experiment.conceptType.replace(/-/g, " ")}
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#1C3A6E",
            margin: "0 0 8px",
            lineHeight: 1.2,
          }}
        >
          {experiment.title}
        </h2>
        <p style={{ fontSize: 13, color: "#6B5B3E", margin: 0, lineHeight: 1.6 }}>
          {experiment.description}
        </p>
        {hasChemistrySim && (
          <span
            style={{
              display: "inline-block",
              marginTop: 10,
              fontSize: 11,
              fontWeight: 700,
              background: color + "18",
              color,
              borderRadius: 99,
              padding: "4px 12px",
              letterSpacing: "0.04em",
            }}
          >
            ✨ Interactive Simulation
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "10px 14px",
          borderBottom: "1.5px solid #E8DCC8",
          overflowX: "auto",
          background: "#F9F4E8",
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isActive ? color : "transparent",
                color: isActive ? "#fff" : "#6B5B3E",
                border: `1.5px solid ${isActive ? color : "transparent"}`,
                borderRadius: 9,
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.18s",
                whiteSpace: "nowrap",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = color + "14";
                  e.currentTarget.style.borderColor = color + "44";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: "24px 28px" }}>
        {activeTab === "simulate" && (
          hasChemistrySim
            ? <ChemistrySimulator experiment={experiment} />
            : <StaticRunner experiment={experiment} />
        )}
        {activeTab === "diagram" && experiment.diagram && (
          <DiagramViewer diagram={experiment.diagram} />
        )}
        {activeTab === "observe" && experiment.observationTable && (
          <ObservationTable table={experiment.observationTable} />
        )}
        {activeTab === "quiz" && (
          <MCQQuiz questions={experiment.mcqQuestions} experimentTitle={experiment.title} />
        )}
        {activeTab === "viva" && (
          <VivaQA questions={experiment.vivaQuestions} experimentTitle={experiment.title} />
        )}
      </div>
    </div>
  );
}