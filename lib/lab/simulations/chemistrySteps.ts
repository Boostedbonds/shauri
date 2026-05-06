// ============================================================
// /lib/lab/simulations/chemistrySteps.ts
// Step definitions for each chemistry simulation.
// Each step has: instruction text + optional observation.
// Keyed by experiment id — matches DRAW_REGISTRY.
// ============================================================

export interface SimStep {
  text: string;
  obs: { key: string; val: string } | null;
}

export type SimStepMap = Record<string, SimStep[]>;

export const CHEMISTRY_SIM_STEPS: SimStepMap = {
  "chem-neutralisation": [
    { text: "Pour 20 mL NaOH solution into conical flask", obs: null },
    { text: "Add 2 drops of phenolphthalein indicator", obs: { key: "Indicator added", val: "Solution turns pink — confirms alkalinity (basic)" } },
    { text: "Add HCl drop by drop from burette while stirring", obs: { key: "Acid being added", val: "HCl drops fall in; pink colour slowly fades from edges" } },
    { text: "Slow down near end-point — last few drops", obs: { key: "Near end-point", val: "Pale pink only — one excess drop will neutralise completely" } },
    { text: "End-point reached — pink colour disappears", obs: { key: "Neutralisation complete", val: "Colourless solution. Products: NaCl + H₂O" } },
    { text: "Touch flask base — feel the warmth", obs: { key: "Heat confirmed", val: "Flask warm to touch — exothermic reaction confirmed ✓" } },
  ],

  "chem-displacement": [
    { text: "Pour 10 mL CuSO₄ solution into clean test tube", obs: null },
    { text: "Observe and note the initial blue colour", obs: { key: "Initial state", val: "Bright blue solution — Cu²⁺ ions responsible for colour" } },
    { text: "Add 3 zinc granules carefully into the tube", obs: { key: "Zinc added", val: "Granules sink; tiny gas bubbles appear on surface" } },
    { text: "Wait 5 minutes without disturbing", obs: { key: "After 5 minutes", val: "Blue colour visibly fading; pale greenish tinge forming" } },
    { text: "Wait 15 minutes — reaction progresses fully", obs: { key: "After 15 minutes", val: "Solution nearly colourless; reddish-brown Cu deposit on Zn" } },
    { text: "Record result and identify more reactive metal", obs: { key: "Conclusion", val: "Zn + CuSO₄ → ZnSO₄ + Cu. Zinc is more reactive than copper ✓" } },
  ],

  "chem-decomposition": [
    { text: "Place small amount of Pb(NO₃)₂ crystals in boiling tube", obs: null },
    { text: "Fix tube at angle; ensure room is well-ventilated", obs: { key: "Setup verified", val: "Tube angled safely. Ventilation confirmed — NO₂ is toxic" } },
    { text: "Heat gently with Bunsen burner — low flame first", obs: { key: "Gentle heat applied", val: "Crystals soften and begin to turn yellow at edges" } },
    { text: "Increase heat — observe fumes at tube mouth", obs: { key: "Decomposition begins", val: "Brown NO₂ fumes clearly visible leaving tube mouth" } },
    { text: "Continue until no more brown fumes appear", obs: { key: "Decomposition complete", val: "Yellow PbO powder remains. All NO₂ driven off" } },
    { text: "Test collected gas with glowing wooden splint", obs: { key: "Oxygen confirmed", val: "Splint relights — O₂ was also produced in reaction ✓" } },
  ],

  "chem-ph-test": [
    { text: "Place red and blue litmus strips on white tile", obs: null },
    { text: "Add 2 drops of HCl on blue litmus strip", obs: { key: "HCl on blue litmus", val: "Blue litmus turns red — confirms HCl is acidic (pH < 7)" } },
    { text: "Add 2 drops of NaOH on red litmus strip", obs: { key: "NaOH on red litmus", val: "Red litmus turns blue — confirms NaOH is basic (pH > 7)" } },
    { text: "Test both solutions on fresh strips; compare", obs: { key: "Comparison complete", val: "Acid → blue turns red. Base → red turns blue. Neutral → no change" } },
  ],

  "chem-combination": [
    { text: "Clean 5 cm Mg ribbon with sandpaper; hold with tongs", obs: null },
    { text: "Bring ribbon near Bunsen burner flame slowly", obs: { key: "Approaching flame", val: "Bunsen burner lit; DO NOT look directly at Mg when it ignites" } },
    { text: "Magnesium ignites — DO NOT look directly", obs: { key: "Mg burning", val: "Dazzling white flame — intense UV and visible light emitted" } },
    { text: "Allow Mg to burn completely over china dish", obs: { key: "Burning complete", val: "White powdery ash (MgO) collected in china dish" } },
    { text: "Observe white MgO ash — product of combination", obs: { key: "Conclusion", val: "2Mg + O₂ → 2MgO. Combination + exothermic reaction confirmed ✓" } },
  ],
};

export function getSimSteps(experimentId: string): SimStep[] | null {
  return CHEMISTRY_SIM_STEPS[experimentId] ?? null;
}