// ============================================================
// /lib/lab/reactionEngine.ts  —  Lab Mode v2
// Pure logic: reaction matching, physics calc, MCQ grading,
// observation validation, AI prompt builder. Zero UI coupling.
// ============================================================

import type {
  Experiment,
  ExperimentResult,
  DynamicResult,
  DynamicInput,
  MCQQuestion,
  MCQAttempt,
  MCQResult,
  ObservationEntry,
  ObservationRow,
  AIPromptInput,
} from "./types";

// ─────────────────────────────────────────────────────────────
// 1. Reaction matching (chemistry / biology)
// ─────────────────────────────────────────────────────────────

export function runReaction(
  experiment: Experiment,
  selectedIds: string[]
): ExperimentResult {
  const required = new Set(experiment.reactionRule.requiredMaterialIds);
  const selected = new Set(selectedIds);
  const allPresent = [...required].every((id) => selected.has(id));

  if (!allPresent) {
    const missing = [...required]
      .filter((id) => !selected.has(id))
      .map((id) => experiment.materials.find((m) => m.id === id)?.name ?? id)
      .join(", ");

    return {
      experimentId: experiment.id,
      selectedMaterialIds: selectedIds,
      equation: null,
      products: [],
      observation: `Incomplete setup. Missing: ${missing}.`,
      type: null,
      success: false,
    };
  }

  return {
    experimentId: experiment.id,
    selectedMaterialIds: selectedIds,
    equation: experiment.reactionRule.equation,
    products: experiment.reactionRule.products,
    observation: experiment.reactionRule.observation,
    type: experiment.reactionRule.type,
    success: true,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. Physics — Ohm's Law
// ─────────────────────────────────────────────────────────────

export function calculateOhmsLaw(
  voltage: number,
  resistance: number
): DynamicResult | null {
  if (resistance <= 0 || !isFinite(voltage) || !isFinite(resistance)) return null;
  const current = voltage / resistance;
  return {
    label: "Current (I)",
    value: parseFloat(current.toFixed(4)),
    unit: "A",
    formula: `I = V / R = ${voltage} / ${resistance} = ${current.toFixed(4)} A`,
  };
}

export function resolveDynamicInputs(
  inputs: DynamicInput[],
  values: Record<string, number>
): Record<string, number> {
  return Object.fromEntries(
    inputs.map((input) => [input.id, values[input.id] ?? input.defaultValue])
  );
}

// ─────────────────────────────────────────────────────────────
// 3. MCQ grading
// ─────────────────────────────────────────────────────────────

export function gradeMCQ(
  questions: MCQQuestion[],
  attempts: MCQAttempt[]
): MCQResult {
  const gradedAttempts: MCQAttempt[] = attempts.map((attempt) => {
    const question = questions.find((q) => q.id === attempt.questionId);
    return {
      ...attempt,
      correct: question?.correctOptionId === attempt.selectedOptionId,
    };
  });

  const score = gradedAttempts.filter((a) => a.correct).length;
  const total = questions.length;

  return {
    attempts: gradedAttempts,
    score,
    total,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. Observation table validation
// ─────────────────────────────────────────────────────────────

export interface ObservationValidationResult {
  rowId: string;
  userValue: string;
  expectedValue: string;
  filled: boolean;
}

export function validateObservationTable(
  rows: ObservationRow[],
  entries: ObservationEntry[]
): ObservationValidationResult[] {
  return rows.map((row) => {
    const entry = entries.find((e) => e.rowId === row.id);
    return {
      rowId: row.id,
      userValue: entry?.value ?? "",
      expectedValue: row.expectedValue,
      filled: Boolean(entry?.value?.trim()),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 5. AI prompt builder (no API calls — returns string only)
// ─────────────────────────────────────────────────────────────

export function buildAIPrompt(input: AIPromptInput): string {
  const statusLine = input.success
    ? "The experiment was completed successfully."
    : "The experiment was not completed — required materials were missing.";

  const materialsLine =
    input.materialsUsed.length > 0
      ? `Materials used: ${input.materialsUsed.join(", ")}.`
      : "No materials were selected.";

  const equationLine = input.equation
    ? `Equation: ${input.equation}.`
    : "No reaction equation applicable.";

  return `
You are a knowledgeable CBSE Class 10 science teacher. A student has just performed the following virtual lab experiment.

Experiment: ${input.experimentTitle}
Subject: ${input.subject.charAt(0).toUpperCase() + input.subject.slice(1)}
Concept Type: ${input.conceptType}
${materialsLine}
${equationLine}
Observation recorded: ${input.observation}
${statusLine}

Please do the following:
1. Explain the scientific concept behind this experiment in simple language suitable for a Class 10 student.
2. Explain why the observed result occurred.
3. Mention one real-life application of this concept.
4. If the experiment failed, explain what the student should correct.

Keep the explanation concise (under 200 words) and use clear, engaging language.
`.trim();
}

export function prepareAIPromptInput(
  experiment: Experiment,
  result: ExperimentResult
): AIPromptInput {
  const usedMaterials = result.selectedMaterialIds.map(
    (id) => experiment.materials.find((m) => m.id === id)?.name ?? id
  );
  return {
    experimentTitle: experiment.title,
    subject: experiment.subject,
    conceptType: experiment.conceptType,
    materialsUsed: usedMaterials,
    equation: result.equation,
    observation: result.observation,
    success: result.success,
  };
}