export type ApparatusState =
  | "idle"
  | "grabbed"
  | "mounted"
  | "aligned"
  | "active"
  | "heated"
  | "pressurized"
  | "unstable"
  | "locked"
  | "malfunctioning";

export type JointKind = "hinge" | "slider" | "snap" | "spring";

export interface MechanicalJoint {
  id: string;
  kind: JointKind;
  min: number;
  max: number;
  damping: number;
  stiffness: number;
  step?: number;
}

export interface ApparatusProfile {
  id: string;
  label: string;
  material: "glass" | "steel" | "composite";
  joints: MechanicalJoint[];
  allowedStates: ApparatusState[];
}

export const APPARATUS_PROFILES: Record<string, ApparatusProfile> = {
  microscope: {
    id: "microscope",
    label: "Compound Microscope",
    material: "steel",
    joints: [
      { id: "focus", kind: "hinge", min: 0, max: 1, damping: 0.2, stiffness: 0.3, step: 0.12 },
      { id: "turret", kind: "snap", min: 0, max: 2, damping: 0.16, stiffness: 0.28, step: 1 },
      { id: "stage-x", kind: "slider", min: -1, max: 1, damping: 0.12, stiffness: 0.24, step: 0.25 },
      { id: "stage-y", kind: "slider", min: -1, max: 1, damping: 0.12, stiffness: 0.24, step: 0.25 },
    ],
    allowedStates: ["idle", "aligned", "active", "locked"],
  },
  burette: {
    id: "burette",
    label: "Burette Assembly",
    material: "glass",
    joints: [
      { id: "valve", kind: "hinge", min: 0, max: 1, damping: 0.2, stiffness: 0.32, step: 0.1 },
      { id: "clamp", kind: "snap", min: 0, max: 1, damping: 0.14, stiffness: 0.2, step: 1 },
      { id: "pivot", kind: "hinge", min: -0.25, max: 0.25, damping: 0.12, stiffness: 0.2, step: 0.05 },
    ],
    allowedStates: ["mounted", "aligned", "active", "locked", "pressurized"],
  },
  burner: {
    id: "burner",
    label: "Gas Burner",
    material: "steel",
    joints: [
      { id: "knob", kind: "hinge", min: 0, max: 1, damping: 0.28, stiffness: 0.35, step: 0.1 },
    ],
    allowedStates: ["idle", "active", "heated", "unstable"],
  },
  circuit: {
    id: "circuit",
    label: "Circuit Panel",
    material: "composite",
    joints: [
      { id: "wire-snap-a", kind: "snap", min: 0, max: 1, damping: 0.1, stiffness: 0.2, step: 1 },
      { id: "wire-snap-b", kind: "snap", min: 0, max: 1, damping: 0.1, stiffness: 0.2, step: 1 },
    ],
    allowedStates: ["idle", "aligned", "active", "locked", "malfunctioning"],
  },
};

export function clampJoint(v: number, j: MechanicalJoint): number {
  return Math.min(Math.max(v, j.min), j.max);
}

export function stepJoint(v: number, j: MechanicalJoint, direction: 1 | -1): number {
  const next = v + (j.step ?? 0.1) * direction;
  return clampJoint(next, j);
}

export function dampTo(current: number, target: number, damping: number): number {
  return current + (target - current) * damping;
}
