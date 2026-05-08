// ============================================================
// /lib/lab/simulations/chemistrySteps.ts
// Step definitions for ALL experiments (chemistry + physics + biology).
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
    { text: "Touch flask base — feel the warmth", obs: { key: "Heat confirmed", val: "Flask warm to touch — exothermic reaction confirmed ✔" } },
  ],

  "chem-displacement": [
    { text: "Pour 10 mL CuSO₄ solution into clean test tube", obs: null },
    { text: "Observe and note the initial blue colour", obs: { key: "Initial state", val: "Bright blue solution — Cu²⁺ ions responsible for colour" } },
    { text: "Add 3 zinc granules carefully into the tube", obs: { key: "Zinc added", val: "Granules sink; tiny gas bubbles appear on surface" } },
    { text: "Wait 5 minutes without disturbing", obs: { key: "After 5 minutes", val: "Blue colour visibly fading; pale greenish tinge forming" } },
    { text: "Wait 15 minutes — reaction progresses fully", obs: { key: "After 15 minutes", val: "Solution nearly colourless; reddish-brown Cu deposit on Zn" } },
    { text: "Record result and identify more reactive metal", obs: { key: "Conclusion", val: "Zn + CuSO₄ → ZnSO₄ + Cu. Zinc is more reactive than copper ✔" } },
  ],

  "chem-decomposition": [
    { text: "Place small amount of Pb(NO₃)₂ crystals in boiling tube", obs: null },
    { text: "Fix tube at angle; ensure room is well-ventilated", obs: { key: "Setup verified", val: "Tube angled safely. Ventilation confirmed — NO₂ is toxic" } },
    { text: "Heat gently with Bunsen burner — low flame first", obs: { key: "Gentle heat applied", val: "Crystals soften and begin to turn yellow at edges" } },
    { text: "Increase heat — observe fumes at tube mouth", obs: { key: "Decomposition begins", val: "Brown NO₂ fumes clearly visible leaving tube mouth" } },
    { text: "Continue until no more brown fumes appear", obs: { key: "Decomposition complete", val: "Yellow PbO powder remains. All NO₂ driven off" } },
    { text: "Test collected gas with glowing wooden splint", obs: { key: "Oxygen confirmed", val: "Splint relights — O₂ was also produced in reaction ✔" } },
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
    { text: "Observe white MgO ash — product of combination", obs: { key: "Conclusion", val: "2Mg + O₂ → 2MgO. Combination + exothermic reaction confirmed ✔" } },
  ],

  // ── PHYSICS ──────────────────────────────────────────────────

  "phys-ohms-law": [
    { text: "Gather: battery, rheostat, resistor, ammeter, voltmeter, switch", obs: null },
    { text: "Connect ammeter in series with the resistor and battery", obs: { key: "Series connection", val: "Ammeter in series — measures total current through resistor" } },
    { text: "Connect voltmeter in parallel across the resistor", obs: { key: "Parallel connection", val: "Voltmeter in parallel — measures voltage drop across R only" } },
    { text: "Close the switch — set rheostat to minimum voltage", obs: { key: "Circuit closed", val: "Small current flows — ammeter deflects slightly. V and I both low." } },
    { text: "Increase rheostat — record V and I at each step", obs: { key: "V increased", val: "Current rises proportionally — V/I ratio stays constant = R" } },
    { text: "Plot V–I graph — observe straight line through origin", obs: { key: "Ohm's Law verified", val: "Straight line confirms V ∝ I at constant temperature. Slope = R ✔" } },
  ],

  "phys-concave-mirror": [
    { text: "Mount concave mirror on stand — face towards distant window/tree", obs: null },
    { text: "Place white screen in front of mirror on optical bench", obs: { key: "Screen placed", val: "Screen positioned roughly at expected focal length distance" } },
    { text: "Move screen back and forth — watch for sharp image", obs: { key: "Image forming", val: "Blurry image sharpening as screen approaches focal point" } },
    { text: "Sharp, inverted image forms — measure mirror-to-screen distance", obs: { key: "Sharp image obtained", val: "Real, inverted, highly diminished image. Distance = focal length f" } },
    { text: "Repeat 2 more times — record all three readings", obs: { key: "3 readings taken", val: "Readings: f₁, f₂, f₃ — slight variation due to measurement error" } },
    { text: "Calculate mean focal length — f = (f₁ + f₂ + f₃) / 3", obs: { key: "Result", val: "Mean f calculated. Concave mirror converges parallel rays at focus ✔" } },
  ],

  "phys-convex-lens": [
    { text: "Mount convex lens vertically on optical bench stand", obs: null },
    { text: "Point lens toward distant bright object (window/tree)", obs: { key: "Object at infinity", val: "Rays from distant object are effectively parallel to principal axis" } },
    { text: "Place white screen on opposite side of lens", obs: { key: "Screen placed", val: "Screen on the side where converging rays will meet" } },
    { text: "Slide screen until sharpest, brightest image appears", obs: { key: "Image forming", val: "Image sharpens — real, inverted, diminished. Distance = focal length" } },
    { text: "Measure lens-to-screen distance — record as f₁", obs: { key: "Reading 1", val: "f₁ measured. Repeat for f₂ and f₃ with slight repositioning." } },
    { text: "Calculate mean: f = (f₁ + f₂ + f₃) / 3", obs: { key: "Focal length confirmed", val: "Convex lens converges light — focal length determined accurately ✔" } },
  ],

  "phys-magnetic-field": [
    { text: "Place bar magnet in centre of white sheet — trace outline", obs: null },
    { text: "Mark N and S poles clearly on the outline", obs: { key: "Poles marked", val: "N pole = red end, S pole = blue end. Field lines emerge from N." } },
    { text: "Place compass near N pole — mark two dots at needle tips", obs: { key: "Compass at N pole", val: "Compass needle points away from N — field lines start here" } },
    { text: "Move compass tail to last dot — mark new position. Repeat 10×", obs: { key: "Tracing field line", val: "Series of dots trace a smooth curve from N pole toward S pole" } },
    { text: "Join dots smoothly — draw 8 field lines around magnet", obs: { key: "Lines drawn", val: "Lines are densest (closest) near poles — strongest field there" } },
    { text: "Observe: lines from N to S, never crossing, denser at poles", obs: { key: "Pattern confirmed", val: "Closed loops, no intersection, density shows field strength ✔" } },
  ],

  // ── BIOLOGY ──────────────────────────────────────────────────

  "bio-photosynthesis": [
    { text: "De-starch plant — keep in dark for 48 hours", obs: null },
    { text: "Cover part of one leaf with black paper — clip in place", obs: { key: "Leaf prepared", val: "Covered portion blocked from sunlight — will not photosynthesize" } },
    { text: "Expose plant to sunlight for 6–8 hours", obs: { key: "Photosynthesis occurring", val: "Uncovered leaf absorbs light, CO₂ + H₂O → glucose → starch" } },
    { text: "Boil leaf in water 2 min — then transfer to ethanol in water bath", obs: { key: "Chlorophyll removed", val: "Leaf turns pale/white — green chlorophyll dissolved in ethanol" } },
    { text: "Wash leaf with water — place on white tile — add iodine drops", obs: { key: "Iodine test", val: "Iodine applied — result appears within seconds" } },
    { text: "Observe: sunlit portion blue-black, covered portion orange-brown", obs: { key: "Result confirmed", val: "Blue-black = starch present (sunlit). Orange-brown = no starch (dark) ✔" } },
  ],

  "bio-respiration": [
    { text: "Place germinating seeds in sealed conical flask", obs: null },
    { text: "Seal flask with two-holed stopper — connect delivery tube", obs: { key: "Setup sealed", val: "Airtight seal ensures only gas from seeds reaches lime water" } },
    { text: "Connect tube to test tube of fresh lime water", obs: { key: "Lime water ready", val: "Ca(OH)₂ solution clear — will turn milky if CO₂ is present" } },
    { text: "Wait 20 minutes — seeds respire and produce CO₂", obs: { key: "Respiration ongoing", val: "Seeds consuming O₂, breaking down glucose → CO₂ + H₂O + energy" } },
    { text: "Observe lime water — note colour change to milky white", obs: { key: "CO₂ confirmed", val: "Milky precipitate: CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O" } },
    { text: "Compare with control (boiled seeds) — no milkiness", obs: { key: "Conclusion", val: "Dead seeds = no respiration = no CO₂ = lime water stays clear ✔" } },
  ],

  "bio-binary-fission": [
    { text: "Place Amoeba permanent slide on microscope stage", obs: null },
    { text: "Start with low power (10×) — locate organisms on slide", obs: { key: "Low power view", val: "Irregular-shaped Amoeba cells visible — some with pseudopods" } },
    { text: "Switch to high power (40×) — focus carefully", obs: { key: "High power view", val: "Cell detail visible — nucleus, cytoplasm, cell membrane clear" } },
    { text: "Identify cell in early fission — nucleus elongating", obs: { key: "Karyokinesis observed", val: "Nucleus stretching and dividing first — karyokinesis stage" } },
    { text: "Observe cytoplasm pinching in the middle — cytokinesis", obs: { key: "Cytokinesis observed", val: "Cell membrane constricting — two separate cytoplasm regions forming" } },
    { text: "Two equal daughter cells fully separated — draw and label", obs: { key: "Fission complete", val: "2 identical daughter cells — each same size as original parent ✔" } },
  ],

  "bio-budding-yeast": [
    { text: "Dissolve yeast in warm sugar water — wait 30 minutes", obs: null },
    { text: "Place one drop of yeast suspension on clean glass slide", obs: { key: "Sample prepared", val: "Thin layer of suspension on slide — excess blotted away" } },
    { text: "Add one drop of methylene blue — lower cover slip at 45°", obs: { key: "Stain applied", val: "Blue stain colours yeast cells — no air bubbles trapped" } },
    { text: "Observe under low power (10×) — locate yeast cells", obs: { key: "Low power view", val: "Oval/ellipsoidal yeast cells visible — some in clusters" } },
    { text: "Switch to high power (40×) — find cells with buds attached", obs: { key: "Budding observed", val: "Smaller bud visible as outgrowth on parent cell — nucleus visible inside" } },
    { text: "Observe bud detaching — draw parent + bud + detached cell", obs: { key: "Conclusion", val: "Bud grows → separates → becomes independent daughter cell ✔" } },
  ],

  "bio-homologous": [
    { text: "Observe vertebrate forelimb chart — human, horse, whale, bat", obs: null },
    { text: "Identify humerus bone in each forelimb on the chart", obs: { key: "Humerus identified", val: "Same upper arm bone present in all four vertebrates — homologous" } },
    { text: "Identify radius and ulna — note same pattern, different size", obs: { key: "Radius/Ulna identified", val: "Two forearm bones present in all — adapted to different functions" } },
    { text: "Compare functions: grasping, running, swimming, flying", obs: { key: "Functions compared", val: "Same bone plan → 4 different functions = divergent evolution" } },
    { text: "Now observe bird wing, bat wing, insect wing charts", obs: { key: "Analogous organs", val: "All used for flight (same function) but internal structure differs" } },
    { text: "Conclusion: homologous = same structure, analogous = same function", obs: { key: "Key distinction confirmed", val: "Homologous → common ancestry. Analogous → convergent evolution ✔" } },
  ],
};

export function getSimSteps(experimentId: string): SimStep[] | null {
  return CHEMISTRY_SIM_STEPS[experimentId] ?? null;
}