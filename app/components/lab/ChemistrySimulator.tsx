"use client";

// ============================================================
// /components/lab/ChemistrySimulator.tsx
// Animated step-by-step chemistry simulation.
// Canvas-based apparatus rendering, real-time animation loop,
// guided steps, live observations panel.
// Replaces static "Run Experiment" for chemistry experiments.
// ============================================================

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { Experiment } from "@/lib/lab/types";
import { getDrawFn, type DrawContext } from "@/lib/lab/simulations/chemistryDrawing";
import { getSimSteps, type SimStep } from "@/lib/lab/simulations/chemistrySteps";

// ─────────────────────────────────────────────────────────────
// Canvas dimensions
// ─────────────────────────────────────────────────────────────

const CANVAS_W = 220;
const CANVAS_H = 226;

// ─────────────────────────────────────────────────────────────
// Hook: animation loop
// ─────────────────────────────────────────────────────────────

function useAnimationLoop(cb: (tick: number) => void, active: boolean) {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const loop = () => {
      cb(Date.now());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cb, active]);
}

// ─────────────────────────────────────────────────────────────
// Hook: step transition progress (0 → 1 over ~900ms)
// ─────────────────────────────────────────────────────────────

function useStepProgress(step: number): number {
  const [progress, setProgress] = useState(1);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setProgress(0);
    const duration = 900;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [step]);

  return progress;
}

// ─────────────────────────────────────────────────────────────
// Sub: Step list item
// ─────────────────────────────────────────────────────────────

interface StepItemProps {
  index: number;
  text: string;
  state: "done" | "active" | "upcoming";
}

function StepItem({ index, text, state }: StepItemProps) {
  const numBg =
    state === "done"
      ? "bg-green-500 text-white border-green-500"
      : state === "active"
      ? "bg-indigo-600 text-white border-indigo-600"
      : "bg-transparent text-gray-400 border-gray-200";

  const rowBg =
    state === "done"
      ? "border-green-100 bg-green-50"
      : state === "active"
      ? "border-indigo-200 bg-indigo-50"
      : "border-gray-100 bg-transparent";

  const textColor =
    state === "active"
      ? "text-indigo-800"
      : state === "done"
      ? "text-gray-600"
      : "text-gray-400";

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border transition-all duration-300 ${rowBg}`}
    >
      <span
        className={`flex-shrink-0 w-5 h-5 rounded-full border text-xs font-semibold flex items-center justify-center mt-0.5 ${numBg}`}
      >
        {state === "done" ? "✓" : index + 1}
      </span>
      <span className={`text-xs leading-relaxed ${textColor}`}>{text}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub: Observation entry
// ─────────────────────────────────────────────────────────────

function ObsEntry({ obs, isNew }: { obs: { key: string; val: string }; isNew: boolean }) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 transition-all duration-500
        ${isNew ? "ring-1 ring-indigo-300 border-indigo-200 bg-indigo-50" : ""}`}
    >
      <p className="text-xs text-gray-400 mb-0.5">{obs.key}</p>
      <p className="text-xs font-medium text-gray-800 leading-relaxed">{obs.val}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub: No simulation placeholder
// ─────────────────────────────────────────────────────────────

function NoSimulation({ experiment }: { experiment: Experiment }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
      <span className="text-4xl mb-3">⚗️</span>
      <p className="text-sm font-medium text-gray-500">Simulation not available</p>
      <p className="text-xs mt-1">
        Visual simulation for <span className="font-medium">{experiment.title}</span> coming soon.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main: ChemistrySimulator
// ─────────────────────────────────────────────────────────────

interface ChemistrySimulatorProps {
  experiment: Experiment;
}

export default function ChemistrySimulator({ experiment }: ChemistrySimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const stepProgress = useStepProgress(currentStep);

  const drawFn = useMemo(() => getDrawFn(experiment.id), [experiment.id]);
  const steps: SimStep[] | null = useMemo(() => getSimSteps(experiment.id), [experiment.id]);

  // Reset when experiment changes
  useEffect(() => {
    setCurrentStep(0);
  }, [experiment.id]);

  // Determine if animation needs continuous loop:
  // decomposition and neutralisation have flames/drops that animate every frame
  const needsContinuousLoop =
    experiment.id === "chem-decomposition" ||
    experiment.id === "chem-neutralisation" ||
    experiment.id === "chem-combination";

  // Canvas draw callback
  const draw = useCallback(
    (tick: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !drawFn) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const dc: DrawContext = {
        ctx,
        step: currentStep,
        t: stepProgress,
        isDark,
        tick,
      };
      drawFn(dc);
    },
    [drawFn, currentStep, stepProgress]
  );

  // Always run animation loop; for non-continuous experiments it still
  // re-draws on stepProgress change, which is fine.
  useAnimationLoop(draw, drawFn !== null);

  // One-shot draw when progress updates on non-continuous experiments
  useEffect(() => {
    if (!needsContinuousLoop) {
      draw(Date.now());
    }
  }, [stepProgress, needsContinuousLoop, draw]);

  const handleNext = useCallback(() => {
    if (steps && currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [steps, currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
  }, []);

  if (!drawFn || !steps) {
    return <NoSimulation experiment={experiment} />;
  }

  // Build observation history (most recent first)
  const obsHistory = steps
    .slice(0, currentStep + 1)
    .filter((s) => s.obs !== null)
    .reverse() as (SimStep & { obs: NonNullable<SimStep["obs"]> })[];

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Virtual Simulation</h3>
          <p className="text-xs text-gray-400 mt-0.5">{experiment.title}</p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      {/* Main grid: steps | canvas | observations */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr]">

        {/* Steps panel */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Procedure
          </p>
          {steps.map((s, i) => (
            <StepItem
              key={i}
              index={i}
              text={s.text}
              state={i < currentStep ? "done" : i === currentStep ? "active" : "upcoming"}
            />
          ))}
        </div>

        {/* Canvas */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="block"
              style={{ width: CANVAS_W, height: CANVAS_H }}
            />
          </div>

          {/* Step controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500
                hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                flex items-center justify-center text-sm"
            >
              ‹
            </button>

            {/* Step dots */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`rounded-full transition-all duration-200
                    ${i === currentStep
                      ? "w-5 h-2 bg-indigo-600"
                      : i < currentStep
                      ? "w-2 h-2 bg-green-400"
                      : "w-2 h-2 bg-gray-200"
                    }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={isLast}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500
                hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                flex items-center justify-center text-sm"
            >
              ›
            </button>
          </div>

          {/* Step counter + next button */}
          <div className="flex items-center gap-2 w-full justify-center">
            <span className="text-xs text-gray-400">
              Step {currentStep + 1} of {steps.length}
            </span>
            {!isLast && (
              <button
                onClick={handleNext}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg
                  hover:bg-indigo-700 active:scale-95 transition-all font-medium"
              >
                Next ›
              </button>
            )}
            {isLast && (
              <span className="text-xs text-green-600 font-medium">
                ✓ Experiment complete
              </span>
            )}
          </div>
        </div>

        {/* Observations panel */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Observations
          </p>
          {obsHistory.length === 0 ? (
            <div className="px-3 py-4 rounded-lg border border-dashed border-gray-200 text-center">
              <p className="text-xs text-gray-400">
                Observations appear as you proceed through steps
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {obsHistory.map((s, i) => (
                <ObsEntry key={s.obs.key} obs={s.obs} isNew={i === 0} />
              ))}
            </div>
          )}

          {/* Completion summary */}
          {isLast && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-700 mb-1">
                ✅ Experiment complete
              </p>
              <p className="text-xs text-green-600 leading-relaxed">
                {experiment.reactionRule.equation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}