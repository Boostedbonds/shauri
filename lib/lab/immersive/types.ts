export type LabModeType = "guided" | "exam" | "sandbox" | "research";

export type StationKind = "chemistry" | "physics" | "biology";

export interface LabStation {
  id: string;
  name: string;
  kind: StationKind;
  x: number;
  y: number;
  z: number;
  description: string;
}

export interface ViewState {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface InteractionEvent {
  id: string;
  message: string;
  severity: "info" | "warning" | "success";
  timestamp: number;
}

export interface ExperimentRuntime {
  selectedMaterialIds: string[];
  temperatureC: number;
  stirringRpm: number;
  voltage: number;
  resistance: number;
  microscopeZoom: number;
}

export interface ExperimentOutcome {
  success: boolean;
  title: string;
  observation: string;
  equation?: string;
  scoreDelta: number;
  safetyDelta: number;
  events: InteractionEvent[];
}
