// ============================================================
// /lib/lab/labData.ts  —  Lab Mode v2
// 15 CBSE Class 10 experiments — all subjects
// Each has: steps, precautions, MCQs, viva Q&A, observation table, diagram
// ============================================================

import type { Experiment } from "./types";

export const EXPERIMENTS: Experiment[] = [

  // ══════════════════════════════════════════════════════════
  // CHEMISTRY
  // ══════════════════════════════════════════════════════════

  {
    id: "chem-ph-test",
    subject: "chemistry",
    title: "pH Test with Litmus Paper",
    description: "Determine whether a solution is acidic, basic, or neutral using red and blue litmus paper.",
    materials: [
      { id: "hcl-sol", name: "Hydrochloric Acid Solution", formula: "HCl (aq)" },
      { id: "naoh-sol", name: "Sodium Hydroxide Solution", formula: "NaOH (aq)" },
      { id: "red-litmus", name: "Red Litmus Paper" },
      { id: "blue-litmus", name: "Blue Litmus Paper" },
      { id: "white-tile", name: "White Tile" },
    ],
    steps: [
      "Place strips of red and blue litmus paper on a clean white tile.",
      "Using a dropper, place 2 drops of HCl solution on both litmus strips.",
      "Observe and record any colour change.",
      "Repeat with NaOH solution on fresh litmus strips.",
      "Record observations in the table below.",
    ],
    precautions: [
      { id: "p1", text: "Handle acids and bases with care; avoid skin contact." },
      { id: "p2", text: "Use a fresh strip of litmus paper for each solution." },
      { id: "p3", text: "Do not mix acid and base in the same container accidentally." },
      { id: "p4", text: "Wash hands thoroughly after the experiment." },
    ],
    reactionRule: {
      requiredMaterialIds: ["hcl-sol", "red-litmus", "blue-litmus"],
      equation: "HCl (aq) → H⁺ (aq) + Cl⁻ (aq)",
      products: ["H⁺ ions", "Cl⁻ ions"],
      observation: "HCl turns blue litmus red (acidic). NaOH turns red litmus blue (basic).",
      type: "acid-base",
    },
    expectedObservation: "HCl → blue litmus turns red. NaOH → red litmus turns blue.",
    conceptType: "acid-base",
    observationTable: {
      title: "Litmus Test Observations",
      rows: [
        { id: "r1", label: "Effect of HCl on red litmus", expectedValue: "No change (remains red)" },
        { id: "r2", label: "Effect of HCl on blue litmus", expectedValue: "Turns red" },
        { id: "r3", label: "Effect of NaOH on red litmus", expectedValue: "Turns blue" },
        { id: "r4", label: "Effect of NaOH on blue litmus", expectedValue: "No change (remains blue)" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "Which of the following turns blue litmus red?",
        options: [{ id: "a", text: "NaOH" }, { id: "b", text: "HCl" }, { id: "c", text: "NaCl" }, { id: "d", text: "Water" }],
        correctOptionId: "b",
        explanation: "HCl is an acid (releases H⁺ ions) and acids turn blue litmus red.",
      },
      {
        id: "q2", question: "What is the pH of a neutral solution?",
        options: [{ id: "a", text: "0" }, { id: "b", text: "14" }, { id: "c", text: "7" }, { id: "d", text: "5" }],
        correctOptionId: "c",
        explanation: "A neutral solution has pH = 7. Acids have pH < 7 and bases have pH > 7.",
      },
      {
        id: "q3", question: "Litmus is extracted from which organism?",
        options: [{ id: "a", text: "Algae" }, { id: "b", text: "Lichens" }, { id: "c", text: "Fungi" }, { id: "d", text: "Ferns" }],
        correctOptionId: "b",
        explanation: "Litmus is a natural indicator extracted from lichens.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "What are indicators? Give two examples.", answer: "Indicators are substances that change colour in acidic or basic solutions. Examples: litmus and phenolphthalein." },
      { id: "v2", question: "Why does HCl turn blue litmus red?", answer: "HCl dissociates in water to release H⁺ ions. The acidic H⁺ ions cause the colour change in the litmus dye." },
      { id: "v3", question: "What happens when litmus is added to a neutral solution?", answer: "There is no colour change. Neutral solutions (pH = 7) do not affect litmus paper." },
    ],
    diagram: {
      svgKey: "litmus-test",
      title: "Litmus Test Setup",
      labels: [
        { id: "l1", text: "White Tile", x: 50, y: 90, anchor: "middle" },
        { id: "l2", text: "Red Litmus", x: 28, y: 55, anchor: "middle" },
        { id: "l3", text: "Blue Litmus", x: 72, y: 55, anchor: "middle" },
        { id: "l4", text: "Dropper (HCl)", x: 28, y: 18, anchor: "middle" },
      ],
    },
  },

  {
    id: "chem-neutralisation",
    subject: "chemistry",
    title: "Neutralisation Reaction (HCl + NaOH)",
    description: "Demonstrate the neutralisation of hydrochloric acid with sodium hydroxide.",
    materials: [
      { id: "hcl", name: "Hydrochloric Acid", formula: "HCl" },
      { id: "naoh", name: "Sodium Hydroxide", formula: "NaOH" },
      { id: "phenolphthalein", name: "Phenolphthalein Indicator" },
      { id: "burette", name: "Burette" },
      { id: "beaker", name: "Beaker (250 mL)" },
    ],
    steps: [
      "Take 20 mL of NaOH solution in a beaker and add 2–3 drops of phenolphthalein.",
      "The solution turns pink, confirming alkalinity.",
      "Add HCl drop-by-drop from a burette while stirring continuously.",
      "Continue until the pink colour just disappears (end-point).",
      "Note the volume of HCl used and feel the beaker for warmth.",
    ],
    precautions: [
      { id: "p1", text: "Add acid slowly, drop by drop, near the end-point." },
      { id: "p2", text: "Ensure the burette has no air bubbles before starting." },
      { id: "p3", text: "Stir the solution continuously while adding acid." },
      { id: "p4", text: "Take readings at eye level to avoid parallax error." },
    ],
    reactionRule: {
      requiredMaterialIds: ["hcl", "naoh", "phenolphthalein"],
      equation: "HCl + NaOH → NaCl + H₂O",
      products: ["Sodium Chloride (NaCl)", "Water (H₂O)"],
      observation: "Pink colour disappears at end-point. Beaker feels warm — exothermic reaction.",
      type: "acid-base",
    },
    expectedObservation: "Colour changes from pink to colourless. Heat is released (exothermic).",
    conceptType: "acid-base",
    observationTable: {
      title: "Titration Observations",
      rows: [
        { id: "r1", label: "Initial colour of NaOH + indicator", expectedValue: "Pink / magenta" },
        { id: "r2", label: "Colour at end-point", expectedValue: "Colourless" },
        { id: "r3", label: "Temperature change observed", expectedValue: "Increase (exothermic)" },
        { id: "r4", label: "Product formed", expectedValue: "NaCl (salt) + H₂O (water)" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "What is the product of a neutralisation reaction between an acid and a base?",
        options: [{ id: "a", text: "Acid + Water" }, { id: "b", text: "Salt + Water" }, { id: "c", text: "Base + Gas" }, { id: "d", text: "Only Salt" }],
        correctOptionId: "b",
        explanation: "Acid + Base → Salt + Water. This is the definition of a neutralisation reaction.",
      },
      {
        id: "q2", question: "Neutralisation reactions are:",
        options: [{ id: "a", text: "Endothermic" }, { id: "b", text: "Neither exo nor endothermic" }, { id: "c", text: "Exothermic" }, { id: "d", text: "Photochemical" }],
        correctOptionId: "c",
        explanation: "Neutralisation reactions always release heat — they are exothermic.",
      },
      {
        id: "q3", question: "What does phenolphthalein look like in a basic solution?",
        options: [{ id: "a", text: "Yellow" }, { id: "b", text: "Blue" }, { id: "c", text: "Colourless" }, { id: "d", text: "Pink/Magenta" }],
        correctOptionId: "d",
        explanation: "Phenolphthalein is pink in basic solutions and colourless in neutral or acidic solutions.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "Define neutralisation.", answer: "The reaction between an acid and a base to form a salt and water, with the release of heat." },
      { id: "v2", question: "Why is phenolphthalein used as an indicator here?", answer: "It gives a clear colour change (pink to colourless) at the neutral point, making the end-point easy to detect." },
      { id: "v3", question: "What is the salt formed in this experiment?", answer: "Sodium chloride (NaCl) — common table salt." },
    ],
    diagram: {
      svgKey: "titration",
      title: "Titration Setup",
      labels: [
        { id: "l1", text: "Burette (HCl)", x: 50, y: 8, anchor: "middle" },
        { id: "l2", text: "Burette Clamp", x: 72, y: 25, anchor: "start" },
        { id: "l3", text: "Conical Flask", x: 50, y: 78, anchor: "middle" },
        { id: "l4", text: "NaOH + Indicator", x: 50, y: 88, anchor: "middle" },
        { id: "l5", text: "White Tile", x: 50, y: 96, anchor: "middle" },
      ],
    },
  },

  {
    id: "chem-displacement",
    subject: "chemistry",
    title: "Displacement Reaction (Zn + CuSO₄)",
    description: "Show that a more reactive metal displaces a less reactive metal from its salt solution.",
    materials: [
      { id: "zinc", name: "Zinc Granules", formula: "Zn" },
      { id: "cuso4", name: "Copper Sulphate Solution", formula: "CuSO₄ (aq)" },
      { id: "test-tube", name: "Test Tube" },
      { id: "stand", name: "Test Tube Stand" },
    ],
    steps: [
      "Pour 10 mL of blue copper sulphate solution into a clean test tube.",
      "Add 2–3 zinc granules to the solution.",
      "Wait for 10–15 minutes without disturbing.",
      "Observe the colour change of the solution.",
      "Observe the deposit on the zinc granules.",
    ],
    precautions: [
      { id: "p1", text: "Use clean, unoxidised zinc granules for best results." },
      { id: "p2", text: "Do not shake or stir the test tube during the experiment." },
      { id: "p3", text: "Handle copper sulphate carefully — it is a mild irritant." },
      { id: "p4", text: "Observe for a sufficient time (15+ min) before concluding." },
    ],
    reactionRule: {
      requiredMaterialIds: ["zinc", "cuso4"],
      equation: "Zn + CuSO₄ → ZnSO₄ + Cu",
      products: ["Zinc Sulphate (ZnSO₄)", "Copper (Cu)"],
      observation: "Blue colour of CuSO₄ fades. Reddish-brown copper deposits on zinc granules.",
      type: "displacement",
    },
    expectedObservation: "Blue CuSO₄ turns colourless/pale; reddish Cu deposits on Zn.",
    conceptType: "displacement",
    observationTable: {
      title: "Displacement Reaction Observations",
      rows: [
        { id: "r1", label: "Initial colour of CuSO₄ solution", expectedValue: "Blue" },
        { id: "r2", label: "Colour of solution after 15 min", expectedValue: "Pale blue / colourless" },
        { id: "r3", label: "Deposit on zinc granules", expectedValue: "Reddish-brown (copper)" },
        { id: "r4", label: "More reactive metal", expectedValue: "Zinc (Zn)" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "In the reaction Zn + CuSO₄ → ZnSO₄ + Cu, which metal is displaced?",
        options: [{ id: "a", text: "Zinc" }, { id: "b", text: "Sulphur" }, { id: "c", text: "Copper" }, { id: "d", text: "Oxygen" }],
        correctOptionId: "c",
        explanation: "Zinc is more reactive than copper, so it displaces copper from copper sulphate solution.",
      },
      {
        id: "q2", question: "Why does the blue colour of CuSO₄ fade?",
        options: [{ id: "a", text: "Cu²⁺ ions are removed from solution" }, { id: "b", text: "Water evaporates" }, { id: "c", text: "Zinc dissolves the colour" }, { id: "d", text: "Temperature rises" }],
        correctOptionId: "a",
        explanation: "Cu²⁺ ions give CuSO₄ its blue colour. As Zn displaces Cu, Cu²⁺ ions are converted to Cu metal and leave the solution.",
      },
      {
        id: "q3", question: "Will copper displace zinc from ZnSO₄ solution?",
        options: [{ id: "a", text: "Yes, always" }, { id: "b", text: "No, because Cu is less reactive than Zn" }, { id: "c", text: "Yes, at high temperature" }, { id: "d", text: "Depends on concentration" }],
        correctOptionId: "b",
        explanation: "A less reactive metal cannot displace a more reactive one. Cu < Zn in reactivity series.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "What is a displacement reaction?", answer: "A reaction where a more reactive element displaces a less reactive element from its compound in solution." },
      { id: "v2", question: "What is the reactivity series?", answer: "A list of metals arranged in order of decreasing reactivity. Metals higher in the series displace those lower down from their salt solutions." },
      { id: "v3", question: "Will iron displace copper from CuSO₄? Why?", answer: "Yes, because iron is above copper in the reactivity series. Fe + CuSO₄ → FeSO₄ + Cu." },
    ],
    diagram: {
      svgKey: "displacement",
      title: "Displacement Reaction Setup",
      labels: [
        { id: "l1", text: "Test Tube", x: 50, y: 20, anchor: "middle" },
        { id: "l2", text: "Blue CuSO₄ Solution", x: 50, y: 55, anchor: "middle" },
        { id: "l3", text: "Zinc Granules", x: 50, y: 75, anchor: "middle" },
        { id: "l4", text: "Cu deposit (reddish-brown)", x: 78, y: 68, anchor: "start" },
      ],
    },
  },

  {
    id: "chem-decomposition",
    subject: "chemistry",
    title: "Thermal Decomposition of Lead Nitrate",
    description: "Show that lead nitrate decomposes on heating to produce brown nitrogen dioxide gas.",
    materials: [
      { id: "lead-nitrate", name: "Lead Nitrate", formula: "Pb(NO₃)₂" },
      { id: "boiling-tube", name: "Boiling Tube" },
      { id: "burner", name: "Bunsen Burner" },
      { id: "stand-clamp", name: "Stand and Clamp" },
    ],
    steps: [
      "Take a small amount of lead nitrate crystals in a boiling tube.",
      "Fix the boiling tube at an angle using a stand and clamp.",
      "Heat the tube gently with a Bunsen burner.",
      "Observe the colour of gas evolved.",
      "Note any residue left in the tube after heating.",
    ],
    precautions: [
      { id: "p1", text: "Perform in a well-ventilated room — NO₂ is toxic." },
      { id: "p2", text: "Do not point the tube opening towards anyone." },
      { id: "p3", text: "Heat gently at first before applying strong heat." },
      { id: "p4", text: "Use tongs to handle the hot boiling tube." },
    ],
    reactionRule: {
      requiredMaterialIds: ["lead-nitrate", "burner"],
      equation: "2Pb(NO₃)₂ →(heat)→ 2PbO + 4NO₂ + O₂",
      products: ["Lead Oxide (PbO)", "Nitrogen Dioxide (NO₂)", "Oxygen (O₂)"],
      observation: "Brown fumes of NO₂ gas are produced. Yellow residue of PbO remains in the tube.",
      type: "decomposition",
    },
    expectedObservation: "Brown fumes evolved; yellow PbO residue remains.",
    conceptType: "decomposition",
    observationTable: {
      title: "Decomposition Observations",
      rows: [
        { id: "r1", label: "Colour of gas evolved", expectedValue: "Brown (NO₂)" },
        { id: "r2", label: "Colour of residue", expectedValue: "Yellow (PbO)" },
        { id: "r3", label: "Type of reaction", expectedValue: "Thermal decomposition" },
        { id: "r4", label: "Gas that relights a glowing splint", expectedValue: "Oxygen (O₂)" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "What is the colour of NO₂ gas?",
        options: [{ id: "a", text: "Green" }, { id: "b", text: "Brown" }, { id: "c", text: "Colourless" }, { id: "d", text: "Yellow" }],
        correctOptionId: "b",
        explanation: "Nitrogen dioxide (NO₂) is a brown/reddish-brown gas with a pungent smell.",
      },
      {
        id: "q2", question: "What type of reaction is the decomposition of lead nitrate?",
        options: [{ id: "a", text: "Combination" }, { id: "b", text: "Displacement" }, { id: "c", text: "Thermal decomposition" }, { id: "d", text: "Double displacement" }],
        correctOptionId: "c",
        explanation: "Heat causes lead nitrate to break into simpler substances — this is thermal decomposition.",
      },
      {
        id: "q3", question: "Which gas produced in this experiment supports combustion?",
        options: [{ id: "a", text: "NO₂" }, { id: "b", text: "N₂" }, { id: "c", text: "O₂" }, { id: "d", text: "CO₂" }],
        correctOptionId: "c",
        explanation: "Oxygen (O₂) supports combustion and can be tested by relighting a glowing splint.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "Define decomposition reaction.", answer: "A reaction in which a single compound breaks down into two or more simpler substances on applying heat, light, or electricity." },
      { id: "v2", question: "Why is this experiment done in a well-ventilated room?", answer: "NO₂ gas produced is toxic and can cause respiratory problems. Ventilation prevents its accumulation." },
      { id: "v3", question: "Give one more example of thermal decomposition.", answer: "CaCO₃ →(heat)→ CaO + CO₂. Calcium carbonate decomposes on heating to give quicklime and CO₂." },
    ],
    diagram: {
      svgKey: "decomposition",
      title: "Thermal Decomposition Setup",
      labels: [
        { id: "l1", text: "Boiling Tube (angled)", x: 50, y: 18, anchor: "middle" },
        { id: "l2", text: "Pb(NO₃)₂ crystals", x: 50, y: 45, anchor: "middle" },
        { id: "l3", text: "Brown NO₂ fumes", x: 75, y: 20, anchor: "start" },
        { id: "l4", text: "Bunsen Burner", x: 50, y: 85, anchor: "middle" },
      ],
    },
  },

  {
    id: "chem-combination",
    subject: "chemistry",
    title: "Combination Reaction — Burning of Magnesium",
    description: "Demonstrate a combination reaction by burning magnesium ribbon in air.",
    materials: [
      { id: "mg-ribbon", name: "Magnesium Ribbon", formula: "Mg" },
      { id: "tongs", name: "Metal Tongs" },
      { id: "burner2", name: "Bunsen Burner" },
      { id: "china-dish", name: "China Dish" },
    ],
    steps: [
      "Clean a 5 cm piece of magnesium ribbon with sandpaper to remove oxide coating.",
      "Hold the ribbon with metal tongs over a china dish.",
      "Bring the ribbon near the Bunsen burner flame.",
      "Observe the colour and brightness of the flame.",
      "Collect and observe the white ash left in the china dish.",
    ],
    precautions: [
      { id: "p1", text: "Do NOT look directly at the burning magnesium — it can damage eyesight." },
      { id: "p2", text: "Keep a china dish below to collect the white ash." },
      { id: "p3", text: "Use clean tongs; do not touch the ribbon with bare hands." },
      { id: "p4", text: "Keep away from flammable materials." },
    ],
    reactionRule: {
      requiredMaterialIds: ["mg-ribbon", "burner2"],
      equation: "2Mg + O₂ → 2MgO",
      products: ["Magnesium Oxide (MgO)"],
      observation: "Magnesium burns with a dazzling white flame. White powdery MgO ash is produced.",
      type: "combination",
    },
    expectedObservation: "Brilliant white flame; white MgO ash collected in china dish.",
    conceptType: "combination",
    observationTable: {
      title: "Magnesium Burning Observations",
      rows: [
        { id: "r1", label: "Colour of flame", expectedValue: "Dazzling white" },
        { id: "r2", label: "Colour of product (ash)", expectedValue: "White" },
        { id: "r3", label: "Product formed", expectedValue: "Magnesium oxide (MgO)" },
        { id: "r4", label: "Type of reaction", expectedValue: "Combination / exothermic" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "What is the product when magnesium burns in air?",
        options: [{ id: "a", text: "Magnesium nitride" }, { id: "b", text: "Magnesium oxide" }, { id: "c", text: "Magnesium carbonate" }, { id: "d", text: "Magnesium hydroxide" }],
        correctOptionId: "b",
        explanation: "Mg reacts with O₂ in air: 2Mg + O₂ → 2MgO (magnesium oxide).",
      },
      {
        id: "q2", question: "Why should you NOT look directly at burning magnesium?",
        options: [{ id: "a", text: "It produces poisonous gas" }, { id: "b", text: "Intense UV light damages eyes" }, { id: "c", text: "It explodes" }, { id: "d", text: "It produces IR radiation" }],
        correctOptionId: "b",
        explanation: "Burning magnesium produces intense light including UV radiation, which can severely damage the retina.",
      },
      {
        id: "q3", question: "What type of chemical reaction is 2Mg + O₂ → 2MgO?",
        options: [{ id: "a", text: "Decomposition" }, { id: "b", text: "Displacement" }, { id: "c", text: "Combination" }, { id: "d", text: "Double displacement" }],
        correctOptionId: "c",
        explanation: "Two or more substances combine to form a single product — this is a combination reaction.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "Define a combination reaction.", answer: "A reaction in which two or more substances combine to form a single new substance. A + B → AB." },
      { id: "v2", question: "Is burning of Mg exothermic or endothermic?", answer: "Exothermic — it releases a large amount of heat and light energy." },
      { id: "v3", question: "Why is sandpaper used to clean the Mg ribbon?", answer: "To remove the dull oxide coating on the surface, ensuring the pure magnesium metal reacts properly." },
    ],
    diagram: {
      svgKey: "magnesium-burning",
      title: "Magnesium Burning Setup",
      labels: [
        { id: "l1", text: "Mg Ribbon (burning)", x: 50, y: 22, anchor: "middle" },
        { id: "l2", text: "White flame", x: 50, y: 10, anchor: "middle" },
        { id: "l3", text: "Tongs", x: 50, y: 38, anchor: "middle" },
        { id: "l4", text: "China Dish (MgO ash)", x: 50, y: 72, anchor: "middle" },
        { id: "l5", text: "Bunsen Burner", x: 50, y: 88, anchor: "middle" },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // PHYSICS
  // ══════════════════════════════════════════════════════════

  {
    id: "phys-ohms-law",
    subject: "physics",
    title: "Verification of Ohm's Law",
    description: "Verify that current through a conductor is directly proportional to voltage across it.",
    materials: [
      { id: "battery", name: "Battery / Power Supply" },
      { id: "resistor", name: "Resistor (known value)", formula: "R (Ω)" },
      { id: "ammeter", name: "Ammeter" },
      { id: "voltmeter", name: "Voltmeter" },
      { id: "rheostat", name: "Rheostat" },
      { id: "switch", name: "Switch (Key)" },
    ],
    steps: [
      "Connect: battery → switch → rheostat → resistor → ammeter (in series).",
      "Connect voltmeter in parallel across the resistor.",
      "Close the switch; set rheostat to minimum.",
      "Record voltmeter (V) and ammeter (I) readings.",
      "Increase voltage stepwise; record V and I at each step.",
      "Plot V–I graph and calculate R = V/I for each reading.",
    ],
    precautions: [
      { id: "p1", text: "Always connect ammeter in series and voltmeter in parallel." },
      { id: "p2", text: "Use minimum current to avoid heating the resistor." },
      { id: "p3", text: "Check all connections before closing the switch." },
      { id: "p4", text: "Take readings at eye level to avoid parallax error." },
    ],
    reactionRule: {
      requiredMaterialIds: ["battery", "resistor", "ammeter", "voltmeter"],
      equation: "V = I × R  ⟹  I = V / R",
      products: ["Current (I) in Amperes"],
      observation: "V–I graph is a straight line through origin. R = V/I is constant.",
      type: "electrical",
    },
    expectedObservation: "I increases linearly with V. V/I = R (constant) at all readings.",
    conceptType: "electrical",
    dynamicInputs: [
      { id: "voltage", label: "Voltage", unit: "V", min: 1, max: 24, step: 0.5, defaultValue: 6 },
      { id: "resistance", label: "Resistance", unit: "Ω", min: 1, max: 100, step: 1, defaultValue: 10 },
    ],
    observationTable: {
      title: "Ohm's Law Data Table",
      rows: [
        { id: "r1", label: "Voltage V₁ (V)", expectedValue: "As set (e.g. 2 V)" },
        { id: "r2", label: "Current I₁ (A)", expectedValue: "V₁ / R" },
        { id: "r3", label: "Ratio V₁/I₁ (Ω)", expectedValue: "Constant = R" },
        { id: "r4", label: "Nature of V-I graph", expectedValue: "Straight line through origin" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "Ohm's Law states that V is proportional to I when:",
        options: [{ id: "a", text: "Temperature changes" }, { id: "b", text: "Temperature is constant" }, { id: "c", text: "Resistance changes" }, { id: "d", text: "Current is zero" }],
        correctOptionId: "b",
        explanation: "Ohm's Law holds only at constant temperature and physical conditions.",
      },
      {
        id: "q2", question: "In which configuration is the ammeter connected?",
        options: [{ id: "a", text: "Parallel" }, { id: "b", text: "Series" }, { id: "c", text: "Either" }, { id: "d", text: "Diagonal" }],
        correctOptionId: "b",
        explanation: "Ammeter must always be in series to measure current flowing through the circuit.",
      },
      {
        id: "q3", question: "If V = 12 V and R = 4 Ω, what is the current?",
        options: [{ id: "a", text: "48 A" }, { id: "b", text: "8 A" }, { id: "c", text: "3 A" }, { id: "d", text: "0.33 A" }],
        correctOptionId: "c",
        explanation: "I = V/R = 12/4 = 3 A.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "State Ohm's Law.", answer: "At constant temperature, the current flowing through a conductor is directly proportional to the potential difference across its ends. V = IR." },
      { id: "v2", question: "What is the unit of resistance?", answer: "Ohm (Ω). 1 Ω = 1 V / 1 A." },
      { id: "v3", question: "Why is the rheostat used in this experiment?", answer: "To vary the voltage across the resistor in steps, allowing us to record multiple V and I readings." },
    ],
    diagram: {
      svgKey: "ohms-law-circuit",
      title: "Ohm's Law Circuit Diagram",
      labels: [
        { id: "l1", text: "Battery", x: 10, y: 50, anchor: "start" },
        { id: "l2", text: "Switch (K)", x: 30, y: 15, anchor: "middle" },
        { id: "l3", text: "Rheostat", x: 55, y: 15, anchor: "middle" },
        { id: "l4", text: "Ammeter (A)", x: 80, y: 15, anchor: "middle" },
        { id: "l5", text: "Resistor (R)", x: 88, y: 50, anchor: "start" },
        { id: "l6", text: "Voltmeter (V)", x: 65, y: 72, anchor: "middle" },
      ],
    },
  },

  {
    id: "phys-concave-mirror",
    subject: "physics",
    title: "Focal Length of a Concave Mirror",
    description: "Determine the focal length of a concave mirror by obtaining a sharp image of a distant object.",
    materials: [
      { id: "concave-mirror", name: "Concave Mirror" },
      { id: "mirror-stand", name: "Mirror Stand" },
      { id: "screen", name: "White Screen" },
      { id: "metre-rule", name: "Metre Rule" },
    ],
    steps: [
      "Mount the concave mirror on a stand facing a distant object (window/tree).",
      "Place a white screen in front of the mirror.",
      "Adjust the screen position until a sharp, inverted image forms on it.",
      "Measure the distance from the mirror pole to the screen.",
      "This distance equals the focal length (f) of the mirror.",
      "Repeat three times and take the average.",
    ],
    precautions: [
      { id: "p1", text: "Use a truly distant object (at least 50 m away) so rays are parallel." },
      { id: "p2", text: "Ensure the mirror principal axis is horizontal." },
      { id: "p3", text: "Take multiple readings and calculate the mean for accuracy." },
      { id: "p4", text: "Do not use the sun as object — it can damage eyesight." },
    ],
    reactionRule: {
      requiredMaterialIds: ["concave-mirror", "screen", "metre-rule"],
      equation: "f = R/2  (for distant object, image forms at focus)",
      products: ["Focal length f (cm)"],
      observation: "A sharp, inverted, diminished real image forms on the screen at distance f from the mirror.",
      type: "optics",
    },
    expectedObservation: "Real, inverted, diminished image at focus. Distance = focal length.",
    conceptType: "optics",
    observationTable: {
      title: "Focal Length Readings",
      rows: [
        { id: "r1", label: "Reading 1 — image distance (cm)", expectedValue: "Approx. equal to f" },
        { id: "r2", label: "Reading 2 — image distance (cm)", expectedValue: "Approx. equal to f" },
        { id: "r3", label: "Reading 3 — image distance (cm)", expectedValue: "Approx. equal to f" },
        { id: "r4", label: "Mean focal length f (cm)", expectedValue: "Average of above three" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "For a distant object, where does the concave mirror form its image?",
        options: [{ id: "a", text: "At centre of curvature" }, { id: "b", text: "At infinity" }, { id: "c", text: "At the focus" }, { id: "d", text: "Behind the mirror" }],
        correctOptionId: "c",
        explanation: "Rays from a distant object are parallel to the principal axis; a concave mirror converges them at the focus.",
      },
      {
        id: "q2", question: "What is the relationship between focal length (f) and radius of curvature (R)?",
        options: [{ id: "a", text: "f = 2R" }, { id: "b", text: "f = R" }, { id: "c", text: "f = R/2" }, { id: "d", text: "f = R²" }],
        correctOptionId: "c",
        explanation: "For a spherical mirror, f = R/2. The focus is midway between the pole and centre of curvature.",
      },
      {
        id: "q3", question: "The image of a distant object in a concave mirror is:",
        options: [{ id: "a", text: "Virtual, erect, magnified" }, { id: "b", text: "Real, inverted, diminished" }, { id: "c", text: "Real, erect, diminished" }, { id: "d", text: "Virtual, inverted, magnified" }],
        correctOptionId: "b",
        explanation: "Distant object → image at focus: real, inverted, and highly diminished (point-sized).",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "Define focal length of a concave mirror.", answer: "The distance between the pole and the principal focus of the mirror. Rays parallel to the principal axis converge here after reflection." },
      { id: "v2", question: "Why do we use a distant object in this experiment?", answer: "For a distant object, rays from it are effectively parallel. The concave mirror converges them at the focus, so image distance = focal length." },
      { id: "v3", question: "Name one application of a concave mirror.", answer: "Concave mirrors are used as reflectors in torches, headlights, and solar furnaces." },
    ],
    diagram: {
      svgKey: "concave-mirror",
      title: "Concave Mirror — Focal Length",
      labels: [
        { id: "l1", text: "Concave Mirror", x: 12, y: 50, anchor: "start" },
        { id: "l2", text: "Principal Axis", x: 50, y: 55, anchor: "middle" },
        { id: "l3", text: "Focus (F)", x: 55, y: 42, anchor: "middle" },
        { id: "l4", text: "Centre (C)", x: 30, y: 42, anchor: "middle" },
        { id: "l5", text: "Screen (image)", x: 55, y: 78, anchor: "middle" },
        { id: "l6", text: "← f →", x: 35, y: 90, anchor: "middle" },
      ],
    },
  },

  {
    id: "phys-convex-lens",
    subject: "physics",
    title: "Focal Length of a Convex Lens",
    description: "Determine the focal length of a convex lens using a distant object and a screen.",
    materials: [
      { id: "convex-lens", name: "Convex Lens" },
      { id: "lens-stand", name: "Lens Stand / Holder" },
      { id: "screen2", name: "White Screen" },
      { id: "metre-rule2", name: "Metre Rule" },
    ],
    steps: [
      "Mount the convex lens vertically on a stand.",
      "Place a white screen on the other side of the lens.",
      "Point the lens towards a distant bright object.",
      "Move the screen until a sharp, clear image forms.",
      "Measure the lens-to-screen distance — this is the focal length.",
      "Repeat three times and record the mean.",
    ],
    precautions: [
      { id: "p1", text: "Keep the lens clean — smudges distort the image." },
      { id: "p2", text: "Ensure the lens is perpendicular to the metre rule." },
      { id: "p3", text: "The object must be at least 15× the focal length away." },
      { id: "p4", text: "Avoid direct sunlight as the object." },
    ],
    reactionRule: {
      requiredMaterialIds: ["convex-lens", "screen2", "metre-rule2"],
      equation: "1/f = 1/v − 1/u  (for distant object: f ≈ v)",
      products: ["Focal length f (cm)"],
      observation: "A sharp, inverted, real image forms on the screen. Image distance ≈ focal length.",
      type: "optics",
    },
    expectedObservation: "Real, inverted, diminished image on screen; distance measured = f.",
    conceptType: "optics",
    observationTable: {
      title: "Convex Lens Focal Length",
      rows: [
        { id: "r1", label: "Observation 1 — v (cm)", expectedValue: "Approx. f" },
        { id: "r2", label: "Observation 2 — v (cm)", expectedValue: "Approx. f" },
        { id: "r3", label: "Observation 3 — v (cm)", expectedValue: "Approx. f" },
        { id: "r4", label: "Mean focal length (cm)", expectedValue: "Mean of v₁, v₂, v₃" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "A convex lens is also called:",
        options: [{ id: "a", text: "Diverging lens" }, { id: "b", text: "Concave lens" }, { id: "c", text: "Converging lens" }, { id: "d", text: "Plane lens" }],
        correctOptionId: "c",
        explanation: "A convex (converging) lens brings parallel rays to a focus on the other side.",
      },
      {
        id: "q2", question: "Power of a lens with focal length 25 cm is:",
        options: [{ id: "a", text: "25 D" }, { id: "b", text: "0.25 D" }, { id: "c", text: "4 D" }, { id: "d", text: "2.5 D" }],
        correctOptionId: "c",
        explanation: "P = 1/f(m) = 1/0.25 = 4 D.",
      },
      {
        id: "q3", question: "Where is the image when object is at 2F of convex lens?",
        options: [{ id: "a", text: "At F" }, { id: "b", text: "At 2F on same side" }, { id: "c", text: "At 2F on opposite side" }, { id: "d", text: "At infinity" }],
        correctOptionId: "c",
        explanation: "Object at 2F → image at 2F on the other side; real, inverted, same size.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "Define optical centre of a lens.", answer: "The central point of the lens through which a ray passes without any deviation." },
      { id: "v2", question: "What is the SI unit of power of a lens?", answer: "Dioptre (D). P = 1/f where f is in metres." },
      { id: "v3", question: "What type of lens is used to correct myopia?", answer: "Concave (diverging) lens. It diverges light rays before they enter the eye, correcting near-sightedness." },
    ],
    diagram: {
      svgKey: "convex-lens",
      title: "Convex Lens — Focal Length",
      labels: [
        { id: "l1", text: "Convex Lens", x: 50, y: 20, anchor: "middle" },
        { id: "l2", text: "Principal Axis", x: 50, y: 58, anchor: "middle" },
        { id: "l3", text: "F (focus)", x: 68, y: 46, anchor: "start" },
        { id: "l4", text: "Screen", x: 68, y: 75, anchor: "middle" },
        { id: "l5", text: "Parallel rays →", x: 18, y: 38, anchor: "start" },
        { id: "l6", text: "← f →", x: 60, y: 88, anchor: "middle" },
      ],
    },
  },

  {
    id: "phys-magnetic-field",
    subject: "physics",
    title: "Magnetic Field Lines of a Bar Magnet",
    description: "Plot the magnetic field lines around a bar magnet using iron filings or a compass.",
    materials: [
      { id: "bar-magnet", name: "Bar Magnet" },
      { id: "white-paper", name: "White Sheet of Paper" },
      { id: "compass", name: "Plotting Compass" },
      { id: "iron-filings", name: "Iron Filings" },
    ],
    steps: [
      "Place the bar magnet in the centre of a white sheet of paper and trace its outline.",
      "Mark the North (N) and South (S) poles.",
      "Place the plotting compass at one end of the magnet near the N pole.",
      "Mark two dots at the tip of the compass needle.",
      "Move the compass so the tail is at the last dot; mark new position.",
      "Join the dots to draw a continuous field line from N to S.",
      "Repeat to draw 8–10 field lines around the magnet.",
    ],
    precautions: [
      { id: "p1", text: "Keep iron objects and other magnets away from the experiment." },
      { id: "p2", text: "Do not shake the paper when using iron filings." },
      { id: "p3", text: "Mark dots very close together for smooth field lines." },
      { id: "p4", text: "Field lines should never intersect each other." },
    ],
    reactionRule: {
      requiredMaterialIds: ["bar-magnet", "compass", "white-paper"],
      equation: "Field lines: N pole → outside → S pole (closed loops inside magnet)",
      products: ["Magnetic field line pattern"],
      observation: "Closed curved lines emerge from N pole, curve outward, and enter S pole. Lines are closer at poles (stronger field).",
      type: "magnetism",
    },
    expectedObservation: "Curved lines from N to S, denser at poles. No two lines intersect.",
    conceptType: "magnetism",
    observationTable: {
      title: "Magnetic Field Observations",
      rows: [
        { id: "r1", label: "Direction of field lines outside", expectedValue: "N pole to S pole" },
        { id: "r2", label: "Where field lines are densest", expectedValue: "Near the poles" },
        { id: "r3", label: "Do field lines intersect?", expectedValue: "No — never intersect" },
        { id: "r4", label: "Shape of field lines", expectedValue: "Closed curved loops" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "Outside a magnet, field lines go from:",
        options: [{ id: "a", text: "S to N" }, { id: "b", text: "N to S" }, { id: "c", text: "Both ways equally" }, { id: "d", text: "Centre outward" }],
        correctOptionId: "b",
        explanation: "By convention, magnetic field lines go from N pole to S pole outside the magnet.",
      },
      {
        id: "q2", question: "Where is the magnetic field strongest in a bar magnet?",
        options: [{ id: "a", text: "Centre" }, { id: "b", text: "Equator" }, { id: "c", text: "Poles" }, { id: "d", text: "Uniform throughout" }],
        correctOptionId: "c",
        explanation: "Field lines are closest (most dense) at the poles, indicating the strongest field.",
      },
      {
        id: "q3", question: "Can two magnetic field lines ever cross each other?",
        options: [{ id: "a", text: "Yes, at the poles" }, { id: "b", text: "Yes, at the equator" }, { id: "c", text: "No, never" }, { id: "d", text: "Only in strong magnets" }],
        correctOptionId: "c",
        explanation: "If lines crossed, it would imply two directions for the field at one point — impossible. Field lines never intersect.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "What are magnetic field lines?", answer: "Imaginary lines that represent the direction and strength of a magnetic field. They go from N to S outside the magnet." },
      { id: "v2", question: "What does the spacing of field lines indicate?", answer: "Closer spacing = stronger magnetic field. Wider spacing = weaker field." },
      { id: "v3", question: "What happens when two unlike poles are brought close?", answer: "The field lines between them connect directly — the poles attract each other." },
    ],
    diagram: {
      svgKey: "bar-magnet-field",
      title: "Magnetic Field Lines — Bar Magnet",
      labels: [
        { id: "l1", text: "N", x: 25, y: 50, anchor: "middle" },
        { id: "l2", text: "S", x: 75, y: 50, anchor: "middle" },
        { id: "l3", text: "Field lines (N→S)", x: 50, y: 18, anchor: "middle" },
        { id: "l4", text: "Dense at poles", x: 50, y: 88, anchor: "middle" },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════
  // BIOLOGY
  // ══════════════════════════════════════════════════════════

  {
    id: "bio-photosynthesis",
    subject: "biology",
    title: "Photosynthesis — Starch Test (Iodine Test)",
    description: "Demonstrate that starch is produced in leaves exposed to sunlight.",
    materials: [
      { id: "leaf-light", name: "Leaf (sunlight, 6–8 hrs)" },
      { id: "leaf-dark", name: "Leaf (kept in dark)" },
      { id: "iodine", name: "Iodine Solution", formula: "I₂/KI (aq)" },
      { id: "ethanol", name: "Ethanol", formula: "C₂H₅OH" },
      { id: "hot-water", name: "Hot Water Bath" },
    ],
    steps: [
      "De-starch the plant by keeping it in the dark for 48 hours.",
      "Cover part of one leaf with black paper; expose the other fully to sunlight for 6–8 hrs.",
      "Boil both leaves in water for 2 min to soften them.",
      "Transfer to ethanol in a water bath until de-greened (pale/white).",
      "Wash with water, place on tile, add iodine solution.",
      "Observe colour change in exposed vs. covered portions.",
    ],
    precautions: [
      { id: "p1", text: "Ethanol is flammable — use a water bath, not direct flame." },
      { id: "p2", text: "Ensure the plant is fully de-starched before the experiment." },
      { id: "p3", text: "Handle iodine carefully — it stains skin and clothing." },
      { id: "p4", text: "Use leaves of the same plant for fair comparison." },
    ],
    reactionRule: {
      requiredMaterialIds: ["leaf-light", "iodine", "ethanol"],
      equation: "6CO₂ + 6H₂O →(sunlight, chlorophyll)→ C₆H₁₂O₆ + 6O₂",
      products: ["Glucose/Starch (C₆H₁₂O₆)", "Oxygen (O₂)"],
      observation: "Sunlit leaf turns blue-black (starch present). Dark leaf stays orange-brown (no starch).",
      type: "photosynthesis",
    },
    expectedObservation: "Sunlit portion → blue-black. Covered/dark portion → orange-brown.",
    conceptType: "photosynthesis",
    observationTable: {
      title: "Photosynthesis Starch Test",
      rows: [
        { id: "r1", label: "Colour of leaf before iodine (de-greened)", expectedValue: "Pale white/yellow" },
        { id: "r2", label: "Colour of sunlit leaf after iodine", expectedValue: "Blue-black (starch present)" },
        { id: "r3", label: "Colour of dark leaf after iodine", expectedValue: "Orange-brown (no starch)" },
        { id: "r4", label: "Conclusion", expectedValue: "Sunlight is required for photosynthesis" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "What does a blue-black colour with iodine indicate?",
        options: [{ id: "a", text: "Presence of glucose" }, { id: "b", text: "Presence of starch" }, { id: "c", text: "Presence of chlorophyll" }, { id: "d", text: "Presence of protein" }],
        correctOptionId: "b",
        explanation: "Iodine solution (I₂/KI) gives a characteristic blue-black colour with starch.",
      },
      {
        id: "q2", question: "Why is the leaf de-greened with ethanol?",
        options: [{ id: "a", text: "To add starch" }, { id: "b", text: "To dissolve chlorophyll so colour change is visible" }, { id: "c", text: "To kill the leaf" }, { id: "d", text: "To remove glucose" }],
        correctOptionId: "b",
        explanation: "Green chlorophyll masks the iodine colour change. Ethanol removes it, making the blue-black colour visible.",
      },
      {
        id: "q3", question: "Which gas is released during photosynthesis?",
        options: [{ id: "a", text: "CO₂" }, { id: "b", text: "N₂" }, { id: "c", text: "O₂" }, { id: "d", text: "H₂" }],
        correctOptionId: "c",
        explanation: "Photosynthesis splits water and releases O₂ as a by-product.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "What are the raw materials for photosynthesis?", answer: "Carbon dioxide (CO₂) from air and water (H₂O) from soil. Sunlight provides the energy; chlorophyll is the catalyst." },
      { id: "v2", question: "Why was the plant kept in dark for 48 hours before the experiment?", answer: "To de-starch the leaves — ensure no pre-existing starch that could give a false positive result." },
      { id: "v3", question: "In which organelle does photosynthesis occur?", answer: "Chloroplast, which contains the green pigment chlorophyll." },
    ],
    diagram: {
      svgKey: "photosynthesis",
      title: "Photosynthesis Starch Test",
      labels: [
        { id: "l1", text: "Leaf (sunlit)", x: 28, y: 30, anchor: "middle" },
        { id: "l2", text: "Leaf (dark/covered)", x: 72, y: 30, anchor: "middle" },
        { id: "l3", text: "Blue-black after iodine", x: 28, y: 72, anchor: "middle" },
        { id: "l4", text: "Orange-brown (no starch)", x: 72, y: 72, anchor: "middle" },
        { id: "l5", text: "Iodine Test Result", x: 50, y: 90, anchor: "middle" },
      ],
    },
  },

  {
    id: "bio-respiration",
    subject: "biology",
    title: "CO₂ Released During Respiration",
    description: "Show that CO₂ is produced during aerobic respiration using germinating seeds.",
    materials: [
      { id: "germinating-seeds", name: "Germinating Seeds (gram/wheat)" },
      { id: "koh", name: "KOH Solution", formula: "KOH (aq)" },
      { id: "lime-water", name: "Lime Water", formula: "Ca(OH)₂ (aq)" },
      { id: "conical-flask", name: "Conical Flask" },
      { id: "delivery-tube", name: "Delivery Tube" },
    ],
    steps: [
      "Place germinating seeds in a conical flask sealed with a two-holed rubber stopper.",
      "Connect a delivery tube from the flask to a test tube containing lime water.",
      "Allow the setup to stand for 15–20 minutes.",
      "Observe the lime water — it turns milky if CO₂ is produced.",
      "Optionally place KOH in the first flask to absorb CO₂ and observe no change in lime water.",
    ],
    precautions: [
      { id: "p1", text: "Ensure the flask is airtight — use vaseline to seal joints." },
      { id: "p2", text: "Use freshly germinated seeds for maximum respiration rate." },
      { id: "p3", text: "Do not use boiled (dead) seeds — use them as control." },
      { id: "p4", text: "Allow sufficient time (15–20 min) before observing." },
    ],
    reactionRule: {
      requiredMaterialIds: ["germinating-seeds", "lime-water", "delivery-tube"],
      equation: "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + Energy (ATP)",
      products: ["Carbon Dioxide (CO₂)", "Water (H₂O)", "Energy (ATP)"],
      observation: "Lime water turns milky — confirms CO₂ is produced during respiration.",
      type: "respiration",
    },
    expectedObservation: "Lime water turns milky white due to CO₂ reacting with Ca(OH)₂.",
    conceptType: "respiration",
    observationTable: {
      title: "Respiration CO₂ Test",
      rows: [
        { id: "r1", label: "Initial colour of lime water", expectedValue: "Clear / transparent" },
        { id: "r2", label: "Colour after 20 min (germinating seeds)", expectedValue: "Milky white" },
        { id: "r3", label: "Colour with boiled seeds (control)", expectedValue: "No change (stays clear)" },
        { id: "r4", label: "Gas confirmed to be released", expectedValue: "Carbon dioxide (CO₂)" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "Which gas turns lime water milky?",
        options: [{ id: "a", text: "O₂" }, { id: "b", text: "N₂" }, { id: "c", text: "CO₂" }, { id: "d", text: "H₂" }],
        correctOptionId: "c",
        explanation: "CO₂ + Ca(OH)₂ → CaCO₃ (white precipitate) + H₂O. This milkiness confirms CO₂.",
      },
      {
        id: "q2", question: "Why are germinating seeds used instead of dry seeds?",
        options: [{ id: "a", text: "They are bigger" }, { id: "b", text: "They have higher respiration rate" }, { id: "c", text: "They produce more light" }, { id: "d", text: "They absorb more water" }],
        correctOptionId: "b",
        explanation: "Germinating seeds have high metabolic activity and respire rapidly, producing measurable CO₂.",
      },
      {
        id: "q3", question: "What is the role of KOH in this experiment?",
        options: [{ id: "a", text: "Absorbs O₂" }, { id: "b", text: "Absorbs CO₂" }, { id: "c", text: "Produces CO₂" }, { id: "d", text: "Acts as indicator" }],
        correctOptionId: "b",
        explanation: "KOH absorbs CO₂ (KOH + CO₂ → K₂CO₃ + H₂O), used as a control to prove the gas is CO₂.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "What is aerobic respiration?", answer: "Breakdown of glucose in the presence of oxygen to produce CO₂, water, and energy (ATP). Occurs in mitochondria." },
      { id: "v2", question: "Write the equation for aerobic respiration.", answer: "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + Energy (38 ATP molecules)." },
      { id: "v3", question: "Why are boiled seeds used as control?", answer: "Boiling kills seeds (denatures enzymes). Dead seeds do not respire, so no CO₂ is produced — this proves the CO₂ comes from respiration, not from the seeds passively." },
    ],
    diagram: {
      svgKey: "respiration",
      title: "CO₂ in Respiration Setup",
      labels: [
        { id: "l1", text: "Conical Flask", x: 25, y: 55, anchor: "middle" },
        { id: "l2", text: "Germinating Seeds", x: 25, y: 70, anchor: "middle" },
        { id: "l3", text: "Delivery Tube", x: 50, y: 45, anchor: "middle" },
        { id: "l4", text: "Lime Water (test tube)", x: 78, y: 55, anchor: "middle" },
        { id: "l5", text: "Turns milky → CO₂ confirmed", x: 78, y: 78, anchor: "middle" },
      ],
    },
  },

  {
    id: "bio-binary-fission",
    subject: "biology",
    title: "Observing Binary Fission in Amoeba (Slide Study)",
    description: "Study permanent slides of Amoeba to observe binary fission under a microscope.",
    materials: [
      { id: "microscope", name: "Compound Microscope" },
      { id: "amoeba-slide", name: "Permanent Slide — Amoeba binary fission" },
      { id: "slide-cover", name: "Cover Slip" },
    ],
    steps: [
      "Place the permanent Amoeba slide on the microscope stage.",
      "Start with low power (10×) to locate the organisms.",
      "Switch to high power (40×) for detailed observation.",
      "Identify: Amoeba undergoing binary fission (cell elongates, nucleus divides).",
      "Draw and label: parent cell, elongated cell, two daughter cells.",
    ],
    precautions: [
      { id: "p1", text: "Handle microscope slides carefully — they break easily." },
      { id: "p2", text: "Never use the coarse adjustment knob with high-power objective." },
      { id: "p3", text: "Clean the lens with lens paper only, not regular cloth." },
      { id: "p4", text: "Do not touch the slide with fingers near the specimen." },
    ],
    reactionRule: {
      requiredMaterialIds: ["microscope", "amoeba-slide"],
      equation: "1 Amoeba → 2 Daughter Amoebae (mitosis + cytoplasm division)",
      products: ["2 identical daughter Amoebae"],
      observation: "Under microscope: Amoeba elongates, nucleus divides first (karyokinesis), then cytoplasm splits (cytokinesis) into two equal daughter cells.",
      type: "respiration",
    },
    expectedObservation: "Parent Amoeba elongates → nucleus divides → two daughter cells of equal size.",
    conceptType: "respiration",
    observationTable: {
      title: "Binary Fission Slide Observations",
      rows: [
        { id: "r1", label: "Shape of Amoeba before fission", expectedValue: "Irregular, pseudopods visible" },
        { id: "r2", label: "Change in shape during fission", expectedValue: "Elongates, becomes oval" },
        { id: "r3", label: "Nucleus during fission", expectedValue: "Divides first (karyokinesis)" },
        { id: "r4", label: "Final result", expectedValue: "Two equal daughter cells" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "Binary fission in Amoeba is a form of:",
        options: [{ id: "a", text: "Sexual reproduction" }, { id: "b", text: "Asexual reproduction" }, { id: "c", text: "Vegetative propagation" }, { id: "d", text: "Regeneration" }],
        correctOptionId: "b",
        explanation: "Binary fission is asexual reproduction — a single organism divides into two identical offspring.",
      },
      {
        id: "q2", question: "Which part of the Amoeba divides first during binary fission?",
        options: [{ id: "a", text: "Cell membrane" }, { id: "b", text: "Cytoplasm" }, { id: "c", text: "Nucleus" }, { id: "d", text: "Pseudopods" }],
        correctOptionId: "c",
        explanation: "Karyokinesis (nuclear division) precedes cytokinesis (cytoplasm division) in binary fission.",
      },
      {
        id: "q3", question: "How many daughter cells are produced in binary fission?",
        options: [{ id: "a", text: "1" }, { id: "b", text: "2" }, { id: "c", text: "4" }, { id: "d", text: "8" }],
        correctOptionId: "b",
        explanation: "Binary means 'two' — one parent cell divides into exactly two daughter cells.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "What is binary fission?", answer: "A form of asexual reproduction in which a single-celled organism splits into two equal daughter cells, each identical to the parent." },
      { id: "v2", question: "Name two organisms that reproduce by binary fission.", answer: "Amoeba and Paramecium (Protists). Also bacteria (prokaryotes) reproduce by binary fission." },
      { id: "v3", question: "What is karyokinesis?", answer: "Division of the nucleus — the first step in cell division. It is followed by cytokinesis (division of cytoplasm)." },
    ],
    diagram: {
      svgKey: "binary-fission",
      title: "Binary Fission in Amoeba",
      labels: [
        { id: "l1", text: "Parent Amoeba", x: 15, y: 50, anchor: "middle" },
        { id: "l2", text: "Nucleus", x: 15, y: 62, anchor: "middle" },
        { id: "l3", text: "Elongating (division begins)", x: 50, y: 50, anchor: "middle" },
        { id: "l4", text: "Daughter cell 1", x: 82, y: 38, anchor: "middle" },
        { id: "l5", text: "Daughter cell 2", x: 82, y: 65, anchor: "middle" },
      ],
    },
  },

  {
    id: "bio-budding-yeast",
    subject: "biology",
    title: "Budding in Yeast (Microscope Study)",
    description: "Observe budding in yeast cells using a wet mount and microscope.",
    materials: [
      { id: "yeast", name: "Yeast Suspension (sugar + warm water, 30 min)" },
      { id: "glass-slide", name: "Glass Slide" },
      { id: "cover-slip", name: "Cover Slip" },
      { id: "microscope2", name: "Compound Microscope" },
      { id: "methylene-blue", name: "Methylene Blue Stain" },
    ],
    steps: [
      "Dissolve a pinch of yeast in warm sugar water and leave for 30 minutes.",
      "Place a drop of yeast suspension on a clean glass slide.",
      "Add a drop of methylene blue stain (optional, for contrast).",
      "Carefully lower a cover slip at 45° to avoid air bubbles.",
      "Observe under low power, then high power (40×).",
      "Identify: parent yeast cells and smaller buds attached to them.",
    ],
    precautions: [
      { id: "p1", text: "Use warm (not boiling) water — heat kills yeast." },
      { id: "p2", text: "Avoid air bubbles under the cover slip." },
      { id: "p3", text: "Use fresh yeast suspension for best results." },
      { id: "p4", text: "Clean lens paper only for wiping microscope lenses." },
    ],
    reactionRule: {
      requiredMaterialIds: ["yeast", "glass-slide", "microscope2"],
      equation: "Parent Yeast Cell → Parent + Bud → Two separate yeast cells",
      products: ["Daughter yeast cells (buds)"],
      observation: "Under microscope: oval yeast cells visible; smaller bud-like outgrowths seen attached to parent cells.",
      type: "respiration",
    },
    expectedObservation: "Parent cell with attached smaller bud. Chain of budding cells may be visible.",
    conceptType: "respiration",
    observationTable: {
      title: "Budding in Yeast Observations",
      rows: [
        { id: "r1", label: "Shape of yeast cells", expectedValue: "Oval / ellipsoidal" },
        { id: "r2", label: "Bud observed", expectedValue: "Smaller outgrowth on parent cell" },
        { id: "r3", label: "Method of reproduction", expectedValue: "Asexual — budding" },
        { id: "r4", label: "Are daughter cells identical?", expectedValue: "Yes, genetically identical" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "Budding in yeast is a type of:",
        options: [{ id: "a", text: "Sexual reproduction" }, { id: "b", text: "Asexual reproduction" }, { id: "c", text: "Fragmentation" }, { id: "d", text: "Spore formation" }],
        correctOptionId: "b",
        explanation: "Budding is asexual reproduction — a new individual (bud) grows from the parent without fertilisation.",
      },
      {
        id: "q2", question: "What is the shape of yeast cells?",
        options: [{ id: "a", text: "Spherical" }, { id: "b", text: "Rod-shaped" }, { id: "c", text: "Oval/ellipsoidal" }, { id: "d", text: "Star-shaped" }],
        correctOptionId: "c",
        explanation: "Yeast cells are oval or ellipsoidal in shape when viewed under a microscope.",
      },
      {
        id: "q3", question: "Which organism also reproduces by budding?",
        options: [{ id: "a", text: "Amoeba" }, { id: "b", text: "Hydra" }, { id: "c", text: "Spirogyra" }, { id: "d", text: "Plasmodium" }],
        correctOptionId: "b",
        explanation: "Hydra reproduces by budding — a small bud grows on the parent body and eventually detaches.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "What is budding?", answer: "An asexual reproduction where a new organism develops as an outgrowth (bud) from the parent. The bud grows and eventually separates." },
      { id: "v2", question: "How does budding differ from binary fission?", answer: "In budding, the offspring (bud) is initially smaller than the parent. In binary fission, the parent splits into two equal-sized daughter cells." },
      { id: "v3", question: "Why is methylene blue used in this experiment?", answer: "Methylene blue is a stain that colours the cells, improving contrast and making them easier to see under the microscope." },
    ],
    diagram: {
      svgKey: "budding-yeast",
      title: "Budding in Yeast",
      labels: [
        { id: "l1", text: "Parent Yeast Cell", x: 35, y: 45, anchor: "middle" },
        { id: "l2", text: "Nucleus", x: 35, y: 58, anchor: "middle" },
        { id: "l3", text: "Bud (smaller)", x: 62, y: 35, anchor: "start" },
        { id: "l4", text: "Bud nucleus", x: 62, y: 45, anchor: "start" },
        { id: "l5", text: "Detached daughter cell", x: 80, y: 68, anchor: "middle" },
      ],
    },
  },

  {
    id: "bio-homologous",
    subject: "biology",
    title: "Homologous and Analogous Organs (Study of Specimens)",
    description: "Identify and distinguish homologous and analogous organs from specimens/charts.",
    materials: [
      { id: "forelimb-chart", name: "Chart — Vertebrate Forelimbs" },
      { id: "wing-specimens", name: "Specimens/Charts — Bird wing, Bat wing, Insect wing" },
      { id: "dissection-box", name: "Dissection Box (pointer)" },
    ],
    steps: [
      "Observe the chart showing forelimbs of human, horse, whale, and bat.",
      "Note that all have the same bones (humerus, radius, ulna, carpals) despite different functions.",
      "These are HOMOLOGOUS organs — same structure, different function.",
      "Now observe charts of bird wing, bat wing, and insect wing.",
      "Note that all are used for flying (same function) but have different internal structures.",
      "These are ANALOGOUS organs — different structure, same function.",
    ],
    precautions: [
      { id: "p1", text: "Handle preserved specimens carefully; avoid direct contact with preservative." },
      { id: "p2", text: "Use a pointer, not fingers, when indicating structures on charts." },
      { id: "p3", text: "Label diagrams clearly with correct anatomical terms." },
      { id: "p4", text: "Wash hands after handling preserved specimens." },
    ],
    reactionRule: {
      requiredMaterialIds: ["forelimb-chart", "wing-specimens"],
      equation: "Homologous: same anatomy, different function → common ancestor\nAnalogous: different anatomy, same function → convergent evolution",
      products: ["Understanding of evolutionary relationships"],
      observation: "Forelimbs of vertebrates share same bones (humerus, radius, ulna) — homologous. Bird/bat/insect wings all used for flight but differ internally — analogous.",
      type: "respiration",
    },
    expectedObservation: "Homologous: same bones, different use. Analogous: different structure, same use (flight).",
    conceptType: "respiration",
    observationTable: {
      title: "Homologous vs Analogous Organs",
      rows: [
        { id: "r1", label: "Human arm function", expectedValue: "Grasping / manipulation" },
        { id: "r2", label: "Whale flipper function", expectedValue: "Swimming" },
        { id: "r3", label: "Bat wing internal structure", expectedValue: "Same bones as human arm" },
        { id: "r4", label: "Insect wing internal structure", expectedValue: "Different — chitinous veins, no bones" },
      ],
    },
    mcqQuestions: [
      {
        id: "q1", question: "Homologous organs have:",
        options: [{ id: "a", text: "Same function, different structure" }, { id: "b", text: "Same structure, different function" }, { id: "c", text: "Different structure and function" }, { id: "d", text: "Same structure and function" }],
        correctOptionId: "b",
        explanation: "Homologous organs share the same basic structural plan (common ancestry) but perform different functions.",
      },
      {
        id: "q2", question: "Wings of a bird and wings of an insect are:",
        options: [{ id: "a", text: "Homologous" }, { id: "b", text: "Vestigial" }, { id: "c", text: "Analogous" }, { id: "d", text: "Identical" }],
        correctOptionId: "c",
        explanation: "Both used for flying (same function) but structurally very different — analogous organs.",
      },
      {
        id: "q3", question: "Homologous organs provide evidence for:",
        options: [{ id: "a", text: "Convergent evolution" }, { id: "b", text: "Divergent evolution from a common ancestor" }, { id: "c", text: "Lamarckism" }, { id: "d", text: "Genetic drift" }],
        correctOptionId: "b",
        explanation: "Similar bone structure across species indicates descent from a common ancestor — divergent evolution.",
      },
    ],
    vivaQuestions: [
      { id: "v1", question: "Define homologous organs.", answer: "Organs that have the same basic structural plan and origin (same embryonic tissue) but are adapted for different functions. Indicate common ancestry." },
      { id: "v2", question: "Define analogous organs.", answer: "Organs that perform the same function but have different structural origin and anatomy. They indicate convergent evolution, not common ancestry." },
      { id: "v3", question: "Give one example each of homologous and analogous organs.", answer: "Homologous: Human arm and whale flipper. Analogous: Bird wing and butterfly wing." },
    ],
    diagram: {
      svgKey: "homologous-analogous",
      title: "Homologous vs Analogous Organs",
      labels: [
        { id: "l1", text: "Human Arm", x: 18, y: 28, anchor: "middle" },
        { id: "l2", text: "Whale Flipper", x: 42, y: 28, anchor: "middle" },
        { id: "l3", text: "Horse Leg", x: 64, y: 28, anchor: "middle" },
        { id: "l4", text: "Bat Wing", x: 84, y: 28, anchor: "middle" },
        { id: "l5", text: "HOMOLOGOUS (same bones, diff. function)", x: 50, y: 60, anchor: "middle" },
        { id: "l6", text: "ANALOGOUS: Bird wing vs Insect wing", x: 50, y: 82, anchor: "middle" },
      ],
    },
  },

];

// ─── Helpers ────────────────────────────────────────────────

export function getExperimentById(id: string): Experiment | undefined {
  return EXPERIMENTS.find((e) => e.id === id);
}

export function getExperimentsBySubject(subject: Experiment["subject"]): Experiment[] {
  return EXPERIMENTS.filter((e) => e.subject === subject);
}

export const EXPERIMENT_COUNT = EXPERIMENTS.length;