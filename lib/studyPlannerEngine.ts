export type StudyIntensity = "light" | "medium" | "high";

export type PlannerTask = {
  subject: string;
  chapter: string;
  topic: string;
  objective: string;
  revisionObjective: string;
  practiceType: string;
  intent: string;
  estimatedMinutes: number;
  intensity: StudyIntensity;
  focus: "primary" | "secondary" | "maintenance" | "revision" | "test";
};

export type PlannerDay = {
  dayIndex: number;
  dayLabel: string;
  phase: "coverage" | "revision" | "intensive" | "exam";
  totalMinutes: number;
  workload: StudyIntensity;
  tasks: PlannerTask[];
};

export type PlannerProfile = {
  studentName: string;
  classLevel: number;
  board: string;
  examName: string;
  weeksUntilExam: number;
  hoursPerDay: number;
  targetMarks: number;
  primarySubject: string;
  secondarySubject: string;
  weakSubjects: string[];
  syllabusCompletionPct: number;
};

type ChapterMap = Record<string, string[]>;

const CBSE_MAP: Record<number, ChapterMap> = {
  9: {
    Mathematics: ["Number Systems", "Polynomials", "Coordinate Geometry", "Linear Equations in Two Variables", "Lines and Angles", "Triangles", "Quadrilaterals", "Circles", "Heron's Formula", "Surface Areas and Volumes", "Statistics", "Probability"],
    Science: ["Matter in Our Surroundings", "Is Matter Around Us Pure", "Atoms and Molecules", "Structure of the Atom", "The Fundamental Unit of Life", "Tissues", "Motion", "Force and Laws of Motion", "Gravitation", "Work and Energy", "Sound", "Why Do We Fall Ill", "Natural Resources", "Improvement in Food Resources"],
    "Social Science": ["The French Revolution", "Socialism in Europe", "Nazism and the Rise of Hitler", "India - Size and Location", "Physical Features of India", "Drainage", "Climate", "Natural Vegetation", "Population", "What is Democracy", "Constitutional Design", "Electoral Politics", "Working of Institutions", "Democratic Rights", "The Story of Village Palampur", "People as Resource", "Poverty as a Challenge", "Food Security in India"],
    English: ["Beehive Prose and Poems", "Moments Supplementary", "Grammar and Writing"],
    Hindi: ["Sparsh", "Sanchayan", "Vyakaran", "Lekhan"],
  },
  10: {
    Mathematics: ["Real Numbers", "Polynomials", "Pair of Linear Equations", "Quadratic Equations", "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry", "Applications of Trigonometry", "Circles", "Areas Related to Circles", "Surface Areas and Volumes", "Statistics", "Probability"],
    Science: ["Chemical Reactions and Equations", "Acids Bases and Salts", "Metals and Non-metals", "Carbon and Its Compounds", "Periodic Classification", "Life Processes", "Control and Coordination", "How do Organisms Reproduce", "Heredity and Evolution", "Light Reflection and Refraction", "Human Eye and Colourful World", "Electricity", "Magnetic Effects of Electric Current", "Our Environment", "Sustainable Management of Natural Resources"],
    "Social Science": ["Rise of Nationalism in Europe", "Nationalism in India", "Making of a Global World", "Age of Industrialization", "Print Culture", "Resources and Development", "Forest and Wildlife Resources", "Water Resources", "Agriculture", "Minerals and Energy Resources", "Manufacturing Industries", "Lifelines of National Economy", "Power Sharing", "Federalism", "Gender Religion and Caste", "Political Parties", "Outcomes of Democracy", "Development", "Sectors of Indian Economy", "Money and Credit", "Globalisation and Indian Economy", "Consumer Rights"],
    English: ["First Flight", "Footprints Without Feet", "Reading Skills", "Grammar", "Writing Skills"],
    Hindi: ["Sparsh", "Sanchayan", "Vyakaran", "Lekhan Kaushal"],
  },
  11: {
    Mathematics: ["Sets", "Relations and Functions", "Trigonometric Functions", "Complex Numbers", "Linear Inequalities", "Permutations and Combinations", "Binomial Theorem", "Sequences and Series", "Straight Lines", "Conic Sections", "Introduction to 3D", "Limits and Derivatives", "Statistics", "Probability"],
    Physics: ["Units and Measurements", "Motion in a Straight Line", "Motion in a Plane", "Laws of Motion", "Work Energy Power", "System of Particles", "Gravitation", "Properties of Bulk Matter", "Thermodynamics", "Oscillations", "Waves"],
    Chemistry: ["Some Basic Concepts", "Structure of Atom", "Classification of Elements", "Chemical Bonding", "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions", "Hydrogen", "The s-block Element", "Organic Chemistry Basics", "Hydrocarbons"],
    Biology: ["The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom", "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Cell", "Biomolecules", "Cell Cycle", "Photosynthesis", "Respiration in Plants", "Plant Growth and Development"],
    English: ["Hornbill", "Snapshots", "Writing and Grammar"],
  },
  12: {
    Mathematics: ["Relations and Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants", "Continuity and Differentiability", "Applications of Derivatives", "Integrals", "Applications of Integrals", "Differential Equations", "Vector Algebra", "3D Geometry", "Linear Programming", "Probability"],
    Physics: ["Electric Charges and Fields", "Electrostatic Potential", "Current Electricity", "Moving Charges and Magnetism", "Magnetism and Matter", "Electromagnetic Induction", "Alternating Current", "Electromagnetic Waves", "Ray Optics", "Wave Optics", "Dual Nature", "Atoms", "Nuclei", "Semiconductors"],
    Chemistry: ["Solutions", "Electrochemistry", "Chemical Kinetics", "d and f Block", "Coordination Compounds", "Haloalkanes and Haloarenes", "Alcohols Phenols Ethers", "Aldehydes Ketones and Carboxylic Acids", "Amines", "Biomolecules"],
    Biology: ["Reproduction in Organisms", "Sexual Reproduction in Flowering Plants", "Human Reproduction", "Reproductive Health", "Principles of Inheritance", "Molecular Basis of Inheritance", "Evolution", "Human Health and Disease", "Microbes in Human Welfare", "Biotechnology", "Ecology"],
    English: ["Flamingo", "Vistas", "Writing and Grammar"],
  },
};

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function getSubjectPool(classLevel: number): string[] {
  if (classLevel <= 10) return ["Mathematics", "Science", "Social Science", "English", "Hindi"];
  return ["Mathematics", "Physics", "Chemistry", "Biology", "English"];
}

function getChapters(classLevel: number, subject: string): string[] {
  const map = CBSE_MAP[classLevel] || CBSE_MAP[10];
  return map[subject] || [];
}

function chapterAt(classLevel: number, subject: string, cursor: number): string {
  const chapters = getChapters(classLevel, subject);
  if (!chapters.length) return `${subject} core module`;
  return chapters[cursor % chapters.length];
}

function phaseForDay(dayIndex: number, totalDays: number): PlannerDay["phase"] {
  const progress = dayIndex / Math.max(totalDays, 1);
  if (progress < 0.62) return "coverage";
  if (progress < 0.82) return "revision";
  if (progress < 0.96) return "intensive";
  return "exam";
}

function intensityForDay(phase: PlannerDay["phase"], isSunday: boolean): StudyIntensity {
  if (isSunday) return "light";
  if (phase === "coverage") return "medium";
  if (phase === "revision") return "medium";
  return "high";
}

function addTask(tasks: PlannerTask[], task: PlannerTask) {
  tasks.push(task);
}

export function generateCbseBoardPlan(profile: PlannerProfile): PlannerDay[] {
  const totalDays = Math.max(7, profile.weeksUntilExam * 7);
  const minutesPerDay = Math.max(60, profile.hoursPerDay * 60);
  const classLevel = profile.classLevel >= 9 && profile.classLevel <= 12 ? profile.classLevel : 10;

  const primary = toTitleCase(profile.primarySubject || "Mathematics");
  const secondary = toTitleCase(profile.secondarySubject || "Science");
  const basePool = getSubjectPool(classLevel);
  const maintenancePool = basePool.filter((s) => s !== primary && s !== secondary);
  const weak = uniq((profile.weakSubjects || []).map((s) => toTitleCase(s)).filter(Boolean));

  const cursors: Record<string, number> = {};
  const nextChapter = (subject: string) => {
    const chapter = chapterAt(classLevel, subject, cursors[subject] || 0);
    cursors[subject] = (cursors[subject] || 0) + 1;
    return chapter;
  };

  const days: PlannerDay[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const dayName = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][(day - 1) % 7];
    const isSunday = dayName === "Sunday";
    const phase = phaseForDay(day, totalDays);
    const intensity = intensityForDay(phase, isSunday);
    const tasks: PlannerTask[] = [];

    if (isSunday) {
      addTask(tasks, {
        subject: "Weekly Revision",
        chapter: "Consolidation",
        topic: `Spaced revision of days ${Math.max(1, day - 6)}-${day - 1}`,
        objective: "Reinforce formulas, definitions, and frequent board mistakes",
        revisionObjective: "Close weak loops and refresh notes",
        practiceType: "Mixed test + correction log",
        intent: "Retention and confidence",
        estimatedMinutes: Math.min(minutesPerDay - 40, 130),
        intensity: "light",
        focus: "revision",
      });
      addTask(tasks, {
        subject: "Board Mock",
        chapter: "Timed Sectional",
        topic: "PYQ or sample paper section",
        objective: "Improve speed and presentation quality",
        revisionObjective: "Analyze errors and write one-page recovery actions",
        practiceType: "Timed paper",
        intent: "Exam temperament",
        estimatedMinutes: Math.min(110, Math.floor(minutesPerDay * 0.45)),
        intensity: "light",
        focus: "test",
      });
    } else {
      const primaryChapter = nextChapter(primary);
      const secondaryChapter = nextChapter(secondary);
      const maintenanceSubject = maintenancePool[(day - 1) % Math.max(maintenancePool.length, 1)] || secondary;
      const maintenanceChapter = nextChapter(maintenanceSubject);

      const primaryMinutes = Math.max(60, Math.floor(minutesPerDay * 0.45));
      const secondaryMinutes = Math.max(45, Math.floor(minutesPerDay * 0.28));
      const maintenanceMinutes = Math.max(30, Math.floor(minutesPerDay * 0.17));
      const revisionMinutes = Math.max(20, minutesPerDay - primaryMinutes - secondaryMinutes - maintenanceMinutes);

      addTask(tasks, {
        subject: primary,
        chapter: primaryChapter,
        topic: `${primaryChapter}: core concepts + NCERT exercise drills`,
        objective: "Deep concept build with board-style presentation",
        revisionObjective: `10-minute recap of last ${primary} chapter before starting`,
        practiceType: "NCERT examples + PYQ short set",
        intent: "Primary score growth",
        estimatedMinutes: primaryMinutes,
        intensity,
        focus: "primary",
      });

      addTask(tasks, {
        subject: secondary,
        chapter: secondaryChapter,
        topic: `${secondaryChapter}: concept application and mixed question practice`,
        objective: "Secondary progression with exam-oriented problem selection",
        revisionObjective: `Revisit previous ${secondary} weak mistake category`,
        practiceType: "MCQ + short answers",
        intent: "Secondary stability",
        estimatedMinutes: secondaryMinutes,
        intensity,
        focus: "secondary",
      });

      addTask(tasks, {
        subject: maintenanceSubject,
        chapter: maintenanceChapter,
        topic: `${maintenanceChapter}: maintenance loop and fast recall`,
        objective: "Keep full syllabus alive while priority subjects intensify",
        revisionObjective: "One-page summary revision",
        practiceType: "Flash revision + 8 question quiz",
        intent: "Whole syllabus maintenance",
        estimatedMinutes: maintenanceMinutes,
        intensity: "light",
        focus: "maintenance",
      });

      addTask(tasks, {
        subject: "Revision Loop",
        chapter: weak.length ? weak[(day - 1) % weak.length] : `${primary} formula bank`,
        topic: weak.length
          ? `Weak-topic resurfacing for ${weak[(day - 1) % weak.length]}`
          : `${primary}: formula and error-log reinforcement`,
        objective: "Spaced revision + weak topic correction",
        revisionObjective: "Update error log with one correction per mistake type",
        practiceType: "Error-book drill",
        intent: "Retention and recovery",
        estimatedMinutes: revisionMinutes,
        intensity: "light",
        focus: "revision",
      });

      if (phase === "intensive" || phase === "exam") {
        addTask(tasks, {
          subject: "Board Readiness",
          chapter: profile.examName,
          topic: "Timed section with answer-presentation rubric",
          objective: "Score-maximizing exam behavior",
          revisionObjective: "Check accuracy, time usage, and question selection",
          practiceType: "Sectional mock",
          intent: "Final exam conditioning",
          estimatedMinutes: Math.min(45, Math.floor(minutesPerDay * 0.22)),
          intensity: "high",
          focus: "test",
        });
      }
    }

    days.push({
      dayIndex: day,
      dayLabel: `Day ${day}`,
      phase,
      totalMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
      workload: intensity,
      tasks,
    });
  }

  return days;
}

export function rebalancePlanFromDay(plan: PlannerDay[], missedDayIndex: number): PlannerDay[] {
  if (missedDayIndex < 1 || missedDayIndex > plan.length) return plan;

  const updated = plan.map((d) => ({ ...d, tasks: d.tasks.map((t) => ({ ...t })) }));
  const missed = updated[missedDayIndex - 1];
  const carry = missed.tasks.filter((t) => t.focus === "primary" || t.focus === "secondary");
  if (!carry.length) return updated;

  let pointer = missedDayIndex;
  carry.forEach((task, idx) => {
    const targetIndex = Math.min(updated.length - 1, pointer + idx);
    const target = updated[targetIndex];
    const rebalanceTask: PlannerTask = {
      ...task,
      estimatedMinutes: Math.max(20, Math.floor(task.estimatedMinutes * 0.45)),
      objective: `${task.objective} (carry-forward)` ,
      intent: "Auto-rebalanced recovery",
      focus: "revision",
      intensity: "medium",
    };
    target.tasks.push(rebalanceTask);
    target.totalMinutes += rebalanceTask.estimatedMinutes;
  });

  return updated;
}
