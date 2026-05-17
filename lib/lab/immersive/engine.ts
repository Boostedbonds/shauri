import type { Experiment } from "../types";
import type { ExperimentOutcome, ExperimentRuntime, InteractionEvent, LabStation } from "./types";
import { runReaction, calculateOhmsLaw } from "../reactionEngine";

export const LAB_STATIONS: LabStation[] = [
  {
    id: "chem-bench",
    name: "Chemistry Bay",
    kind: "chemistry",
    x: -6,
    y: 0,
    z: -12,
    description: "Wet chemistry benches with burners, indicators, and reaction glassware.",
  },
  {
    id: "physics-bench",
    name: "Physics Bay",
    kind: "physics",
    x: 0,
    y: 0,
    z: -15,
    description: "Measurement, optics, and electrical instrumentation with live parameters.",
  },
  {
    id: "bio-bench",
    name: "Biology Bay",
    kind: "biology",
    x: 6,
    y: 0,
    z: -12,
    description: "Microscopy and specimen analysis with dynamic zoom and observation states.",
  },
];

export function getDefaultRuntime(): ExperimentRuntime {
  return {
    selectedMaterialIds: [],
    temperatureC: 27,
    stirringRpm: 0,
    voltage: 5,
    resistance: 10,
    microscopeZoom: 10,
  };
}

function event(message: string, severity: InteractionEvent["severity"]): InteractionEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    severity,
    timestamp: Date.now(),
  };
}

export function evaluateExperiment(experiment: Experiment, runtime: ExperimentRuntime): ExperimentOutcome {
  const events: InteractionEvent[] = [];
  const selected = runtime.selectedMaterialIds;

  if (!selected.length) {
    return {
      success: false,
      title: "Setup Incomplete",
      observation: "No tools or reagents were staged on the active bench.",
      scoreDelta: -2,
      safetyDelta: -1,
      events: [event("No materials selected. Stage apparatus before running.", "warning")],
    };
  }

  if (experiment.subject === "chemistry") {
    if (runtime.temperatureC > 110 && !selected.some((m) => m.includes("burner"))) {
      events.push(event("Unsafe heat profile detected: temperature rise without burner context.", "warning"));
    }

    const reaction = runReaction(experiment, selected);

    if (reaction.success) {
      events.push(event("Reaction pathway validated.", "success"));
      if (runtime.stirringRpm === 0) {
        events.push(event("No stirring applied; endpoint may be slower in real lab conditions.", "info"));
      }
    } else {
      events.push(event("Required reagents or apparatus are missing.", "warning"));
    }

    return {
      success: reaction.success,
      title: reaction.success ? "Reaction Executed" : "Reaction Failed",
      observation: reaction.observation,
      equation: reaction.equation ?? undefined,
      scoreDelta: reaction.success ? 8 : -4,
      safetyDelta: runtime.temperatureC > 120 ? -4 : reaction.success ? 2 : -1,
      events,
    };
  }

  if (experiment.subject === "physics") {
    const calculation = calculateOhmsLaw(runtime.voltage, runtime.resistance);
    if (!calculation) {
      return {
        success: false,
        title: "Invalid Circuit Parameters",
        observation: "Resistance must be greater than zero and all values must be finite.",
        scoreDelta: -3,
        safetyDelta: -1,
        events: [event("Circuit solution failed due to invalid values.", "warning")],
      };
    }

    const isInRange = calculation.value >= 0 && calculation.value <= 5;
    events.push(event(`Current solved at ${calculation.value} A using Ohm's law.`, "success"));
    if (!isInRange) {
      events.push(event("Current exceeds safe instructional range; adjust resistance/voltage.", "warning"));
    }

    return {
      success: true,
      title: "Physics Measurement Captured",
      observation: `${experiment.expectedObservation} Live result: ${calculation.formula}`,
      scoreDelta: isInRange ? 7 : 4,
      safetyDelta: isInRange ? 2 : -2,
      events,
    };
  }

  const zoomGood = runtime.microscopeZoom >= 20;
  events.push(event(`Microscope focus sweep at ${runtime.microscopeZoom}x completed.`, "success"));
  if (!zoomGood) {
    events.push(event("Increase magnification to inspect cell-level detail.", "info"));
  }

  return {
    success: true,
    title: "Biology Observation Recorded",
    observation: zoomGood
      ? `${experiment.expectedObservation} Cellular structures were clearly resolved.`
      : `${experiment.expectedObservation} Structure hints visible; higher zoom recommended.`,
    scoreDelta: zoomGood ? 7 : 5,
    safetyDelta: 2,
    events,
  };
}

export function stationForSubject(subject: Experiment["subject"]): LabStation {
  return LAB_STATIONS.find((station) => station.kind === subject) ?? LAB_STATIONS[0];
}
