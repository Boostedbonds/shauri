"use client";

// ============================================================
// /components/lab/ExperimentRunner.tsx  —  v3
// Tabbed runner: Simulate | Diagram | Observe | Quiz | Viva
// Chemistry → ChemistrySimulator (animated canvas)
// Physics  → dynamic sliders + materials bench
// Biology  → guided steps + materials bench
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

// ─────────────────────────────────────────────────────────────
// Tab config
// ─────────────────────────────────────────────────────────────

type Tab = "simulate" | "diagram" | "observe" | "quiz" | "viva";

const ALL_TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "simulate", label: "Simulate", icon: "⚗️" },
  { id: "diagram",  label: "Diagram",  icon: "📐" },
  { id: "observe",  label: "Observe",  icon: "📋" },
  { id: "quiz",     label: "Quiz",     icon: "🧠" },
  { id: "viva",     label: "Viva",     icon: "🎤" },
];

// ─────────────────────────────────────────────────────────────
// Sub: Step list
// ─────────────────────────────────────────────────────────────

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 list-none">
      {steps.map((step, idx) => (
        <li key={idx} className="flex gap-3 text-sm text-gray-700">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center mt-0.5">
            {idx + 1}
          </span>
          <span className="leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub: Precautions list
// ─────────────────────────────────────────────────────────────

function PrecautionsList({ precautions }: { precautions: Experiment["precautions"] }) {
  return (
    <div className="space-y-1.5">
      {precautions.map((p) => (
        <div key={p.id} className="flex gap-2 text-sm text-gray-700">
          <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
          <span className="leading-relaxed">{p.text}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub: Physics dynamic inputs
// ─────────────────────────────────────────────────────────────

interface PhysicsInputsProps {
  experiment: Experiment;
  values: Record<string, number>;
  onChange: (id: string, value: number) => void;
  dynamicResult: DynamicResult | null;
}

function PhysicsInputs({ experiment, values, onChange, dynamicResult }: PhysicsInputsProps) {
  if (!experiment.dynamicInputs?.length) return null;
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide">⚡ Dynamic Inputs</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {experiment.dynamicInputs.map((input) => (
          <div key={input.id}>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {input.label} ({input.unit})
            </label>
            <input
              type="range"
              min={input.min}
              max={input.max}
              step={input.step}
              value={values[input.id] ?? input.defaultValue}
              onChange={(e) => onChange(input.id, parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="text-right text-xs text-blue-700 font-mono font-semibold mt-0.5">
              {values[input.id] ?? input.defaultValue} {input.unit}
            </div>
          </div>
        ))}
      </div>
      {dynamicResult && (
        <div className="p-3 bg-white border border-blue-200 rounded-md">
          <p className="text-xs text-gray-400 mb-1">Live Calculation</p>
          <p className="font-mono text-sm text-blue-900">{dynamicResult.formula}</p>
          <p className="text-lg font-bold text-blue-700 mt-1">
            {dynamicResult.label}: {dynamicResult.value} {dynamicResult.unit}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub: Result panel (physics + biology)
// ─────────────────────────────────────────────────────────────

interface ResultPanelProps {
  result: ExperimentResult;
  onShowPrompt: () => void;
}

function ResultPanel({ result, onShowPrompt }: ResultPanelProps) {
  return (
    <div className={`rounded-lg border-2 p-4 space-y-3
      ${result.success ? "border-green-400 bg-green-50" : "border-red-300 bg-red-50"}`}
    >
      <div className="flex items-center gap-2">
        <span>{result.success ? "✅" : "❌"}</span>
        <span className={`font-semibold text-sm ${result.success ? "text-green-700" : "text-red-600"}`}>
          {result.success ? "Experiment Successful" : "Incomplete Setup"}
        </span>
      </div>
      {result.equation && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Equation</p>
          <p className="font-mono text-sm bg-white border border-gray-200 rounded px-3 py-2 text-gray-800 whitespace-pre-wrap">
            {result.equation}
          </p>
        </div>
      )}
      {result.products.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Products</p>
          <div className="flex flex-wrap gap-2">
            {result.products.map((p) => (
              <span key={p} className="text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Observation</p>
        <p className="text-sm text-gray-800 leading-relaxed">{result.observation}</p>
      </div>
      <button
        onClick={onShowPrompt}
        className="text-xs text-indigo-500 underline underline-offset-2 hover:text-indigo-700"
      >
        View AI Prompt (integration ready)
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub: Static simulate tab (physics + biology)
// ─────────────────────────────────────────────────────────────

function StaticRunner({ experiment }: { experiment: Experiment }) {
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
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
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
    <div className="space-y-5">
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Procedure</h3>
        <StepList steps={experiment.steps} />
      </section>

      <section>
        <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Precautions</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <PrecautionsList precautions={experiment.precautions} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Materials Bench</h3>
          <button
            onClick={() => { setSelectedIds(new Set(experiment.materials.map((m) => m.id))); setResult(null); }}
            className="text-xs text-indigo-500 underline underline-offset-2"
          >
            Add All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {experiment.materials.map((mat) => {
            const isSelected = selectedIds.has(mat.id);
            return (
              <button
                key={mat.id}
                onClick={() => toggleMaterial(mat.id)}
                className={`text-left p-3 rounded-lg border-2 transition-all
                  ${isSelected ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{isSelected ? "🧪" : "○"}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{mat.name}</p>
                    {mat.formula && <p className="text-xs text-gray-400 font-mono mt-0.5">{mat.formula}</p>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{selectedIds.size} / {experiment.materials.length} added</p>
      </section>

      {experiment.subject === "physics" && (
        <PhysicsInputs
          experiment={experiment}
          values={dynamicValues}
          onChange={(id, val) => setDynamicValues((prev) => ({ ...prev, [id]: val }))}
          dynamicResult={dynamicResult}
        />
      )}

      <div className="text-xs bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 text-gray-600">
        <span className="font-semibold text-yellow-700">Expected: </span>
        {experiment.expectedObservation}
      </div>

      <button
        onClick={handleRun}
        disabled={selectedIds.size === 0}
        className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold
          hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ▶ Run Experiment
      </button>

      {result && (
        <ResultPanel result={result} onShowPrompt={() => setShowPrompt((p) => !p)} />
      )}

      {showPrompt && aiPrompt && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">AI Prompt (ready for API)</p>
            <button onClick={() => navigator.clipboard.writeText(aiPrompt)} className="text-xs text-indigo-500 hover:text-indigo-700 underline">Copy</button>
          </div>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{aiPrompt}</pre>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main: ExperimentRunner
// ─────────────────────────────────────────────────────────────

export default function ExperimentRunner({ experiment }: { experiment: Experiment }) {
  const [activeTab, setActiveTab] = useState<Tab>("simulate");

  React.useEffect(() => { setActiveTab("simulate"); }, [experiment.id]);

  const hasChemistrySim = experiment.subject === "chemistry" && getSimSteps(experiment.id) !== null;

  const visibleTabs = ALL_TABS.filter((tab) => {
    if (tab.id === "diagram" && !experiment.diagram) return false;
    if (tab.id === "observe" && !experiment.observationTable) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{experiment.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{experiment.description}</p>
        {hasChemistrySim && (
          <span className="inline-block mt-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-0.5 font-medium">
            ✨ Interactive Simulation
          </span>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${activeTab === tab.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "simulate" && (
        hasChemistrySim
          ? <ChemistrySimulator experiment={experiment} />
          : <StaticRunner experiment={experiment} />
      )}
      {activeTab === "diagram" && experiment.diagram && <DiagramViewer diagram={experiment.diagram} />}
      {activeTab === "observe" && experiment.observationTable && <ObservationTable table={experiment.observationTable} />}
      {activeTab === "quiz" && <MCQQuiz questions={experiment.mcqQuestions} experimentTitle={experiment.title} />}
      {activeTab === "viva" && <VivaQA questions={experiment.vivaQuestions} experimentTitle={experiment.title} />}
    </div>
  );
}