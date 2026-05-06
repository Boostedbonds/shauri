// ============================================================
// /lib/lab/types.ts  —  Lab Mode v2
// Complete strict TypeScript types
// ============================================================

export type Subject = "chemistry" | "physics" | "biology";

export type ConceptType =
  | "acid-base"
  | "redox"
  | "displacement"
  | "electrical"
  | "photosynthesis"
  | "optics"
  | "magnetism"
  | "respiration"
  | "decomposition"
  | "combination";

// ─── Core experiment building blocks ───────────────────────

export interface Material {
  id: string;
  name: string;
  formula?: string;
}

export interface ReactionRule {
  requiredMaterialIds: string[];
  equation: string;
  products: string[];
  observation: string;
  type: ConceptType;
}

export interface DynamicInput {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

// ─── v2 feature types ──────────────────────────────────────

export interface Precaution {
  id: string;
  text: string;
}

export interface VivaQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface MCQOption {
  id: string;
  text: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: MCQOption[];
  correctOptionId: string;
  explanation: string;
}

export interface ObservationRow {
  id: string;
  label: string;
  expectedValue: string;
  unit?: string;
}

export interface ObservationTable {
  title: string;
  rows: ObservationRow[];
}

export interface DiagramLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  anchor?: "start" | "middle" | "end";
}

export interface DiagramConfig {
  svgKey: string;
  title: string;
  labels: DiagramLabel[];
}

// ─── Main experiment type ───────────────────────────────────

export interface Experiment {
  id: string;
  subject: Subject;
  title: string;
  description: string;
  materials: Material[];
  steps: string[];
  precautions: Precaution[];
  reactionRule: ReactionRule;
  expectedObservation: string;
  conceptType: ConceptType;
  observationTable?: ObservationTable;
  mcqQuestions: MCQQuestion[];
  vivaQuestions: VivaQuestion[];
  diagram?: DiagramConfig;
  dynamicInputs?: DynamicInput[];
}

// ─── Runtime result types ───────────────────────────────────

export interface ExperimentResult {
  experimentId: string;
  selectedMaterialIds: string[];
  equation: string | null;
  products: string[];
  observation: string;
  type: ConceptType | null;
  success: boolean;
  dynamicResult?: DynamicResult;
}

export interface DynamicResult {
  label: string;
  value: number;
  unit: string;
  formula: string;
}

export interface MCQAttempt {
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
}

export interface MCQResult {
  attempts: MCQAttempt[];
  score: number;
  total: number;
  percentage: number;
}

export interface ObservationEntry {
  rowId: string;
  value: string;
}

export interface AIPromptInput {
  experimentTitle: string;
  subject: Subject;
  conceptType: ConceptType;
  materialsUsed: string[];
  equation: string | null;
  observation: string;
  success: boolean;
}