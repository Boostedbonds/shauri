export type FailureStage = "normal" | "anomaly" | "warning" | "degraded" | "partial" | "catastrophic";

export type ApparatusId = "microscope" | "burette" | "burner" | "circuit";

export interface ApparatusRecord {
  id: ApparatusId;
  wear: number;
  calibration: number;
  contamination: number;
  thermalFatigue: number;
  electricalFatigue: number;
  pressureStress: number;
  structuralStress: number;
  sealIntegrity: number;
  connectorIntegrity: number;
  drift: number;
  repairCount: number;
  overheatingIncidents: number;
  contaminationIncidents: number;
  overloadIncidents: number;
  lastMaintainedAt: number;
  stage: FailureStage;
}

export type ApparatusRecords = Record<ApparatusId, ApparatusRecord>;

export interface StressInput {
  wear?: number;
  calibrationDrift?: number;
  contamination?: number;
  thermal?: number;
  electrical?: number;
  pressure?: number;
  structural?: number;
  sealLoss?: number;
  connectorLoss?: number;
}

export function defaultRecord(id: ApparatusId): ApparatusRecord {
  return {
    id,
    wear: 0,
    calibration: 1,
    contamination: 0,
    thermalFatigue: 0,
    electricalFatigue: 0,
    pressureStress: 0,
    structuralStress: 0,
    sealIntegrity: 1,
    connectorIntegrity: 1,
    drift: 0,
    repairCount: 0,
    overheatingIncidents: 0,
    contaminationIncidents: 0,
    overloadIncidents: 0,
    lastMaintainedAt: Date.now(),
    stage: "normal",
  };
}

export function defaultRecords(): ApparatusRecords {
  return {
    microscope: defaultRecord("microscope"),
    burette: defaultRecord("burette"),
    burner: defaultRecord("burner"),
    circuit: defaultRecord("circuit"),
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function stageFrom(record: ApparatusRecord): FailureStage {
  const risk =
    record.wear * 0.15 +
    (1 - record.calibration) * 0.2 +
    record.contamination * 0.15 +
    record.thermalFatigue * 0.15 +
    record.electricalFatigue * 0.12 +
    record.pressureStress * 0.12 +
    record.structuralStress * 0.11 +
    (1 - record.sealIntegrity) * 0.1 +
    (1 - record.connectorIntegrity) * 0.1 +
    record.drift * 0.12;

  if (risk > 0.9) return "catastrophic";
  if (risk > 0.72) return "partial";
  if (risk > 0.55) return "degraded";
  if (risk > 0.38) return "warning";
  if (risk > 0.2) return "anomaly";
  return "normal";
}

export function applyStress(record: ApparatusRecord, s: StressInput): ApparatusRecord {
  const next: ApparatusRecord = {
    ...record,
    wear: clamp01(record.wear + (s.wear ?? 0)),
    calibration: clamp01(record.calibration - (s.calibrationDrift ?? 0)),
    contamination: clamp01(record.contamination + (s.contamination ?? 0)),
    thermalFatigue: clamp01(record.thermalFatigue + (s.thermal ?? 0)),
    electricalFatigue: clamp01(record.electricalFatigue + (s.electrical ?? 0)),
    pressureStress: clamp01(record.pressureStress + (s.pressure ?? 0)),
    structuralStress: clamp01(record.structuralStress + (s.structural ?? 0)),
    sealIntegrity: clamp01(record.sealIntegrity - (s.sealLoss ?? 0)),
    connectorIntegrity: clamp01(record.connectorIntegrity - (s.connectorLoss ?? 0)),
    drift: clamp01(record.drift + (s.calibrationDrift ?? 0) * 1.2 + (s.wear ?? 0) * 0.5),
    stage: record.stage,
  };

  if ((s.thermal ?? 0) > 0.02) next.overheatingIncidents += 1;
  if ((s.contamination ?? 0) > 0.02) next.contaminationIncidents += 1;
  if ((s.electrical ?? 0) > 0.02 || (s.pressure ?? 0) > 0.02) next.overloadIncidents += 1;

  next.stage = stageFrom(next);
  return next;
}

export function maintain(record: ApparatusRecord, action: "repair" | "recalibrate" | "clean" | "stabilize" | "replace"): ApparatusRecord {
  const now = Date.now();
  if (action === "repair") {
    return {
      ...record,
      wear: clamp01(record.wear - 0.25),
      structuralStress: clamp01(record.structuralStress - 0.35),
      sealIntegrity: clamp01(record.sealIntegrity + 0.2),
      repairCount: record.repairCount + 1,
      lastMaintainedAt: now,
      stage: stageFrom({ ...record, wear: clamp01(record.wear - 0.25), structuralStress: clamp01(record.structuralStress - 0.35), sealIntegrity: clamp01(record.sealIntegrity + 0.2) }),
    };
  }
  if (action === "recalibrate") {
    const updated = {
      ...record,
      calibration: clamp01(record.calibration + 0.35),
      drift: clamp01(record.drift - 0.4),
      lastMaintainedAt: now,
    };
    return { ...updated, stage: stageFrom(updated) };
  }
  if (action === "clean") {
    const updated = {
      ...record,
      contamination: clamp01(record.contamination - 0.5),
      lastMaintainedAt: now,
    };
    return { ...updated, stage: stageFrom(updated) };
  }
  if (action === "stabilize") {
    const updated = {
      ...record,
      thermalFatigue: clamp01(record.thermalFatigue - 0.25),
      pressureStress: clamp01(record.pressureStress - 0.3),
      electricalFatigue: clamp01(record.electricalFatigue - 0.2),
      lastMaintainedAt: now,
    };
    return { ...updated, stage: stageFrom(updated) };
  }

  const updated = {
    ...record,
    wear: 0,
    calibration: 1,
    contamination: 0,
    thermalFatigue: 0,
    electricalFatigue: 0,
    pressureStress: 0,
    structuralStress: 0,
    sealIntegrity: 1,
    connectorIntegrity: 1,
    drift: 0,
    repairCount: record.repairCount + 1,
    lastMaintainedAt: now,
  };
  return { ...updated, stage: stageFrom(updated) };
}

export function riskScore(record: ApparatusRecord): number {
  return (
    record.wear * 0.15 +
    (1 - record.calibration) * 0.2 +
    record.contamination * 0.15 +
    record.thermalFatigue * 0.15 +
    record.electricalFatigue * 0.12 +
    record.pressureStress * 0.12 +
    record.structuralStress * 0.11 +
    (1 - record.sealIntegrity) * 0.1 +
    (1 - record.connectorIntegrity) * 0.1 +
    record.drift * 0.12
  );
}

export function severity(stage: FailureStage): number {
  if (stage === "catastrophic") return 1;
  if (stage === "partial") return 0.8;
  if (stage === "degraded") return 0.6;
  if (stage === "warning") return 0.4;
  if (stage === "anomaly") return 0.2;
  return 0;
}

export function loadRecords(): ApparatusRecords {
  if (typeof window === "undefined") return defaultRecords();
  try {
    const raw = window.localStorage.getItem("shauri.lab.apparatus.records.v1");
    if (!raw) return defaultRecords();
    const parsed = JSON.parse(raw) as Partial<ApparatusRecords>;
    const defaults = defaultRecords();
    return {
      microscope: { ...defaults.microscope, ...(parsed.microscope ?? {}) },
      burette: { ...defaults.burette, ...(parsed.burette ?? {}) },
      burner: { ...defaults.burner, ...(parsed.burner ?? {}) },
      circuit: { ...defaults.circuit, ...(parsed.circuit ?? {}) },
    };
  } catch {
    return defaultRecords();
  }
}

export function saveRecords(records: ApparatusRecords): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("shauri.lab.apparatus.records.v1", JSON.stringify(records));
}

export function summaryAlert(records: ApparatusRecords): string | null {
  const list = Object.values(records).sort((a, b) => riskScore(b) - riskScore(a));
  const top = list[0];
  if (!top) return null;
  if (top.stage === "catastrophic") return `${top.id} is in catastrophic state. Lock out experiment and run full replacement workflow.`;
  if (top.stage === "partial") return `${top.id} has partial malfunction. Immediate repair and recalibration required.`;
  if (top.stage === "degraded") return `${top.id} is degraded. Maintenance recommended before next experiment cycle.`;
  if (top.stage === "warning") return `${top.id} warning: early instability detected. Monitor and stabilize now.`;
  return null;
}
