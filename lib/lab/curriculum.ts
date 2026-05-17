export type ClassLevel = 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type PracticalSubject = "physics" | "chemistry" | "biology";
export type PracticalMode = "guided" | "exam" | "sandbox";
export type PracticalType = "observation" | "measurement" | "analysis" | "reaction" | "investigation";
export type PracticalDifficulty = "foundation" | "core" | "advanced";

export interface CBSEPractical {
  id: string;
  title: string;
  classLevel: ClassLevel;
  subject: PracticalSubject;
  chapter: string;
  experimentType: PracticalType;
  difficulty: PracticalDifficulty;
  supportedModes: PracticalMode[];
  ncertTopic: string;
  objective: string;
  proceduralFocus: string[];
  vivaPrompts: string[];
  linkedExperimentId?: string;
  status: "implemented" | "blueprint";
}

export const CBSE_PRACTICALS: CBSEPractical[] = [
  // Class 6-8 exploratory
  {
    id: "c6-mix-separate",
    title: "Separation of Mixtures",
    classLevel: 6,
    subject: "chemistry",
    chapter: "Separation of Substances",
    experimentType: "observation",
    difficulty: "foundation",
    supportedModes: ["guided", "sandbox"],
    ncertTopic: "Methods of separation",
    objective: "Identify filtration, evaporation, and hand-picking workflows.",
    proceduralFocus: ["Apparatus selection", "Heat safety", "Residue analysis"],
    vivaPrompts: ["When is filtration preferred over evaporation?", "Why is residue still impure?"],
    status: "blueprint",
  },
  {
    id: "c7-acid-base-indicators",
    title: "Testing Acids and Bases with Natural Indicators",
    classLevel: 7,
    subject: "chemistry",
    chapter: "Acids, Bases and Salts",
    experimentType: "reaction",
    difficulty: "foundation",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Indicators",
    objective: "Differentiate acidic and basic solutions using indicators.",
    proceduralFocus: ["Indicator preparation", "Color interpretation", "Safety protocol"],
    vivaPrompts: ["What is an indicator?", "Why does turmeric change in base?"],
    linkedExperimentId: "chem-ph-test",
    status: "implemented",
  },
  {
    id: "c8-friction-incline",
    title: "Effect of Surface on Friction",
    classLevel: 8,
    subject: "physics",
    chapter: "Force and Pressure",
    experimentType: "measurement",
    difficulty: "foundation",
    supportedModes: ["guided", "sandbox"],
    ncertTopic: "Frictional force",
    objective: "Measure drag changes on different contact surfaces.",
    proceduralFocus: ["Force reading", "Surface comparison", "Graph trend"],
    vivaPrompts: ["Why does friction increase on rough surfaces?", "Can friction ever be useful?"],
    status: "blueprint",
  },
  {
    id: "c8-cell-observation",
    title: "Plant and Animal Cell Observation",
    classLevel: 8,
    subject: "biology",
    chapter: "Cell Structure",
    experimentType: "observation",
    difficulty: "foundation",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Cell organelles",
    objective: "Observe and differentiate plant and animal cells under microscope.",
    proceduralFocus: ["Slide handling", "Focus calibration", "Labeling"],
    vivaPrompts: ["What is the role of nucleus?", "Why is cell wall absent in animal cell?"],
    status: "blueprint",
  },

  // Class 9-10 core
  {
    id: "c9-litmus-ph",
    title: "pH and Litmus Validation",
    classLevel: 9,
    subject: "chemistry",
    chapter: "Acids, Bases and Salts",
    experimentType: "reaction",
    difficulty: "core",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Acid-base behavior",
    objective: "Classify unknown samples using litmus and pH logic.",
    proceduralFocus: ["Sample discipline", "Indicator behavior", "Observation table"],
    vivaPrompts: ["Why does blue litmus turn red in acid?", "How is neutral solution identified?"],
    linkedExperimentId: "chem-ph-test",
    status: "implemented",
  },
  {
    id: "c10-neutralisation",
    title: "Neutralisation Titration",
    classLevel: 10,
    subject: "chemistry",
    chapter: "Acids, Bases and Salts",
    experimentType: "analysis",
    difficulty: "core",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Titration endpoint",
    objective: "Establish acid-base neutralisation point and heat effect.",
    proceduralFocus: ["Burette zeroing", "Drop control", "Endpoint precision"],
    vivaPrompts: ["Why is phenolphthalein used?", "Why is neutralisation exothermic?"],
    linkedExperimentId: "chem-neutralisation",
    status: "implemented",
  },
  {
    id: "c10-displacement",
    title: "Metal Displacement Reaction",
    classLevel: 10,
    subject: "chemistry",
    chapter: "Chemical Reactions",
    experimentType: "reaction",
    difficulty: "core",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Reactivity series",
    objective: "Verify displacement based on reactivity order.",
    proceduralFocus: ["Time tracking", "Deposit observation", "Equation mapping"],
    vivaPrompts: ["Why does zinc displace copper?", "How does color fade indicate reaction?"],
    linkedExperimentId: "chem-displacement",
    status: "implemented",
  },
  {
    id: "c10-ohms-law",
    title: "Verification of Ohm's Law",
    classLevel: 10,
    subject: "physics",
    chapter: "Electricity",
    experimentType: "measurement",
    difficulty: "core",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "V-I relation",
    objective: "Verify linear relation between current and voltage.",
    proceduralFocus: ["Series-parallel wiring", "Meter reading", "Graph plotting"],
    vivaPrompts: ["When does Ohm's law fail?", "Why keep temperature constant?"],
    linkedExperimentId: "phys-ohms-law",
    status: "implemented",
  },
  {
    id: "c10-convex-lens",
    title: "Focal Length of Convex Lens",
    classLevel: 10,
    subject: "physics",
    chapter: "Light",
    experimentType: "measurement",
    difficulty: "core",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Image formation",
    objective: "Determine lens focal length by distant object method.",
    proceduralFocus: ["Bench alignment", "Screen sharpness", "Average reading"],
    vivaPrompts: ["Why does image invert?", "How does aperture affect clarity?"],
    linkedExperimentId: "phys-convex-lens",
    status: "implemented",
  },
  {
    id: "c10-photosynthesis",
    title: "Necessity of Sunlight for Photosynthesis",
    classLevel: 10,
    subject: "biology",
    chapter: "Life Processes",
    experimentType: "investigation",
    difficulty: "core",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Starch test",
    objective: "Demonstrate sunlight dependency in starch formation.",
    proceduralFocus: ["Destarching", "Iodine test", "Controlled comparison"],
    vivaPrompts: ["Why is leaf boiled in alcohol?", "What does blue-black indicate?"],
    linkedExperimentId: "bio-photosynthesis",
    status: "implemented",
  },
  {
    id: "c10-respiration",
    title: "CO2 Release in Respiration",
    classLevel: 10,
    subject: "biology",
    chapter: "Life Processes",
    experimentType: "investigation",
    difficulty: "core",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Respiration evidence",
    objective: "Confirm CO2 production in germinating seeds.",
    proceduralFocus: ["Airtight setup", "Lime water observation", "Control sample"],
    vivaPrompts: ["Why use germinating seeds?", "What is role of KOH?"],
    linkedExperimentId: "bio-respiration",
    status: "implemented",
  },

  // Class 11-12 advanced (blueprint but structured)
  {
    id: "c11-salt-analysis",
    title: "Qualitative Salt Analysis",
    classLevel: 11,
    subject: "chemistry",
    chapter: "Practical Inorganic Analysis",
    experimentType: "analysis",
    difficulty: "advanced",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Anion-cation tests",
    objective: "Identify radicals using sequential wet tests.",
    proceduralFocus: ["Dry test", "Wet test", "Inference tree"],
    vivaPrompts: ["Why is group separation required?", "How is confirmatory test different?"],
    status: "blueprint",
  },
  {
    id: "c11-kinetics",
    title: "Rate of Chemical Reaction",
    classLevel: 11,
    subject: "chemistry",
    chapter: "Chemical Kinetics",
    experimentType: "measurement",
    difficulty: "advanced",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Rate dependence",
    objective: "Observe concentration and temperature effects on reaction speed.",
    proceduralFocus: ["Timer use", "Temperature profile", "Rate graph"],
    vivaPrompts: ["Why does rate increase with temperature?", "What is activation energy?"],
    status: "blueprint",
  },
  {
    id: "c12-meter-bridge",
    title: "Meter Bridge Resistance Measurement",
    classLevel: 12,
    subject: "physics",
    chapter: "Current Electricity",
    experimentType: "measurement",
    difficulty: "advanced",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Wheatstone principle",
    objective: "Determine unknown resistance using bridge balance condition.",
    proceduralFocus: ["Null point detection", "Jockey placement", "Error minimization"],
    vivaPrompts: ["Why avoid end errors?", "Why reverse known and unknown resistance?"],
    status: "blueprint",
  },
  {
    id: "c12-galvanometer",
    title: "Galvanometer to Voltmeter Conversion",
    classLevel: 12,
    subject: "physics",
    chapter: "Current Electricity",
    experimentType: "analysis",
    difficulty: "advanced",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Meter conversion",
    objective: "Convert galvanometer to voltmeter using high resistance in series.",
    proceduralFocus: ["Series conversion", "Range setting", "Calibration check"],
    vivaPrompts: ["Why use high resistance for voltmeter?", "What causes zero error?"],
    status: "blueprint",
  },
  {
    id: "c11-mitosis-slide",
    title: "Mitosis Observation in Onion Root Tip",
    classLevel: 11,
    subject: "biology",
    chapter: "Cell Cycle",
    experimentType: "observation",
    difficulty: "advanced",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Cell division phases",
    objective: "Identify phases of mitosis and estimate phase frequency.",
    proceduralFocus: ["Slide prep", "Staining", "Phase counting"],
    vivaPrompts: ["Which phase is longest?", "How is chromosome visibility achieved?"],
    status: "blueprint",
  },
  {
    id: "c12-transpiration",
    title: "Transpiration Rate Factors",
    classLevel: 12,
    subject: "biology",
    chapter: "Plant Physiology",
    experimentType: "investigation",
    difficulty: "advanced",
    supportedModes: ["guided", "exam", "sandbox"],
    ncertTopic: "Potometer",
    objective: "Determine effect of humidity and airflow on transpiration.",
    proceduralFocus: ["Airtight setup", "Bubble movement", "Comparative analysis"],
    vivaPrompts: ["Why is cut stem underwater?", "How does wind affect transpiration?"],
    status: "blueprint",
  },
];

export function practicalsByFilters(input: {
  classLevel?: ClassLevel | "all";
  subject?: PracticalSubject | "all";
  mode?: PracticalMode | "all";
  chapter?: string | "all";
  difficulty?: PracticalDifficulty | "all";
}) {
  return CBSE_PRACTICALS.filter((p) => {
    if (input.classLevel && input.classLevel !== "all" && p.classLevel !== input.classLevel) return false;
    if (input.subject && input.subject !== "all" && p.subject !== input.subject) return false;
    if (input.mode && input.mode !== "all" && !p.supportedModes.includes(input.mode)) return false;
    if (input.chapter && input.chapter !== "all" && p.chapter !== input.chapter) return false;
    if (input.difficulty && input.difficulty !== "all" && p.difficulty !== input.difficulty) return false;
    return true;
  });
}

export function chaptersFor(classLevel: ClassLevel | "all", subject: PracticalSubject | "all") {
  return Array.from(new Set(practicalsByFilters({ classLevel, subject }).map((p) => p.chapter))).sort();
}

export function classScopedGuidance(classLevel: ClassLevel): string {
  if (classLevel <= 8) return "Exploratory mode: focus on concept visualization and safe handling basics.";
  if (classLevel <= 10) return "CBSE core mode: prioritize procedure fidelity, observations, and viva readiness.";
  return "Advanced practical mode: optimize calibration, error control, and scientific inference depth.";
}
