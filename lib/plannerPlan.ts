// ─────────────────────────────────────────────────────────────
// plannerPlan.ts
// Single source of truth for the 90-day study plan.
// Synced with: CBSE Class X — 90-Day Planner (1 May – 30 Jul 2026)
//
// Used by:
//   • /lib/plannerState.ts  → planner UI state management
//   • /app/planner/page.tsx → planner UI display
//   • /app/examiner/page.tsx → URL params to exam generator
//   • /app/api/chat/route.ts → generateShauriPaper() topic boundary
//
// HOW TO UPDATE:
//   Edit the `topic` field in any day's topics array.
//   The exam generator automatically uses the topic as a hard boundary.
//   meta.type: "school" | "holiday" | "rev" | "mock"
//   meta.isRev: true  → triggers revision day format (50 marks, 90 min)
//   meta.isMock: true → triggers full mock test format
// ─────────────────────────────────────────────────────────────

export type PlannerDayPlan = {
  day: number;
  meta: {
    date: string;
    dow: string;
    type: "school" | "holiday" | "rev" | "mock";
    isRev?: boolean;
    isMock?: boolean;
    done?: boolean;
  };
  topics: Array<{
    subject: string;
    topic: string;
  }>;
  test: string;
  read: string;
  extra: string[];
};

export const THIRTY_DAY_PLAN: PlannerDayPlan[] = [

  // ════════════════════════════════════════════════════════════
  // MAY — FOUNDATION MONTH (Days 1–30)
  // ════════════════════════════════════════════════════════════

  // ── WEEK 1 (1 May Fri → 7 May Thu) · Revision: Day 3 Sun ──

  {
    day: 1,
    meta: { date: "1 May", dow: "Friday", type: "school", done: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 1 Real Numbers – Euclid's Division Lemma & Algorithm; HCF computation; Ex 1.1 complete",
      },
      {
        subject: "English",
        topic:
          "First Flight Prose Ch 1: A Letter to God | Poem Ch 1: Dust of Snow – theme & figures of speech",
      },
    ],
    test: "Test: Real Numbers Ex 1.1 (4 Qs) + Comprehension passage",
    read: "Newspaper editorial + 5 vocab: faith, harvest, miracle, drought, indebted",
    extra: [
      "Euclid: a = bq + r, 0 ≤ r < b; HCF(306,657) step-by-step",
      "Dust of Snow: crow + hemlock + snow → mood change; symbolism of nature",
    ],
  },

  {
    day: 2,
    meta: { date: "2 May", dow: "Saturday", type: "holiday", done: true },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 1 Chemical Reactions & Equations – Physical vs chemical change; balancing equations; Combination & Decomposition reactions",
      },
      {
        subject: "History",
        topic:
          "Ch 1 Nationalism in Europe – Frederic Sorrieu's vision; French Revolution; liberty, equality, nation-state",
      },
    ],
    test: "Balance 5 equations + History MCQs (5 Qs)",
    read: "5 terms: reactant, product, catalyst, precipitate, effervescence",
    extra: [
      "Law of conservation of mass; Combination & Decomposition reactions",
      "Marianne & Germania as national symbols",
    ],
  },

  {
    day: 3,
    meta: { date: "3 May", dow: "Sunday", type: "rev", isRev: true, done: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION: Ch 1 Real Numbers – Euclid's Lemma, HCF; Science Ch 1 – All 6 reaction types + balancing equations",
      },
      {
        subject: "English",
        topic:
          "REVISION: English Ch 1 (A Letter to God, Dust of Snow) | History Ch 1 – French Revolution; nationalism symbols",
      },
    ],
    test: "Mini Mock: 5 Maths + 5 Science + 5 History + 5 English = 20 Qs (40 min)",
    read: "Error log: note every wrong answer; list weak areas",
    extra: [
      "Self-check: Prove √2 in <5 min without notes?",
      "Self-check: Write all 6 reaction types from memory?",
      "Score target: 16+/20",
    ],
  },

  {
    day: 4,
    meta: { date: "4 May", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 1 Real Numbers – Fundamental Theorem of Arithmetic: prime factorisation; HCF & LCM using FTA with 3 numbers; Ex 1.2 Q1–6 fully solved",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Kavya Khand Ch 1: Kabir ke Dohe – all 5 dohas; nirguna bhakti philosophy; Anupras alankar",
      },
    ],
    test: "HCF & LCM using FTA (3 Qs) + 2 Kabir doha meanings",
    read: "Hindi literary passage + 5 new Hindi words with meanings",
    extra: [
      "FTA: Every integer >1 has unique prime factorisation",
      "HCF×LCM = product of two numbers ONLY",
      "Kabir: nirguna = formless God; Doha = 11+13 matras",
    ],
  },

  {
    day: 5,
    meta: { date: "5 May", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 1 Real Numbers – Irrational numbers; proof that √2, √3, √5 are irrational (proof by contradiction); Ex 1.3; Decimal expansions: terminating vs non-terminating",
      },
      {
        subject: "History",
        topic:
          "Ch 1 Nationalism in Europe – Napoleon's reforms (Civil Code, abolition of feudalism); Congress of Vienna 1815; Metternich's conservatism",
      },
    ],
    test: "Prove √7 irrational (1 Q) + Identify terminating/non-terminating (3 Qs) + Napoleon's 3 reforms (1 Q)",
    read: "5 vocab: terminating, recurring, irrational, contradiction, assumption",
    extra: [
      "Proof √2: assume p/q → 2q²=p² → both even → contradicts HCF=1",
      "p/q terminates if denominator has only 2s and 5s (after simplification)",
      "Congress of Vienna 1815: Metternich restored old monarchies",
    ],
  },

  {
    day: 6,
    meta: { date: "6 May", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 1 Chemical Reactions – Double Displacement, Precipitation, Endothermic/Exothermic reactions; OIL RIG rule; All 6 reaction types summary table",
      },
      {
        subject: "English",
        topic:
          "First Flight Prose Ch 2: Nelson Mandela (Long Walk to Freedom); Poem Ch 2: Fire and Ice (Robert Frost) – symbolism of desire and hatred",
      },
    ],
    test: "Identify reaction type for 5 equations + 3 Mandela questions",
    read: "Unseen passage (150 words) + 5 words: apartheid, inauguration, equality, obligation, democracy",
    extra: [
      "OIL RIG: Oxidation = electron Loss; Reduction = electron Gain",
      "Mandela: ANC 1912; Robben Island 1964–1990; first black SA president 1994",
      "Double displacement: swap partners; precipitation = insoluble product",
    ],
  },

  {
    day: 7,
    meta: { date: "7 May", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 2 Acids, Bases & Salts Pt 1 – Properties; Acid+Metal/Metal oxide/Carbonate reactions; Ex 2 Q1–5",
      },
      {
        subject: "Geography",
        topic:
          "Ch 1 Resources & Development – classification; resource planning; Brundtland Commission 1987",
      },
    ],
    test: "Write & balance 3 acid reactions + classify 6 resources",
    read: "5 terms: litmus, indicator, neutralisation, renewable, non-renewable",
    extra: [
      "Acid+metal: Zn+H₂SO₄→ZnSO₄+H₂↑; Cu does NOT react",
      "Acid+carbonate: CO₂ test with lime water",
      "Brundtland 1987: sustainable development defined",
    ],
  },

  // ── WEEK 2 (8 May Fri → 14 May Thu) · Revision: Day 10 Sun ──

  {
    day: 8,
    meta: { date: "8 May", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 2 Polynomials Pt 1 – Degree, types; zeroes from graph (x-intercepts); sketching quadratic graphs; Sum α+β = –b/a; Product αβ = c/a; Ex 2.1",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Kavya Khand Ch 2: Meera ke Pad – virahotkantha; saguna vs nirguna bhakti; Anuprasa/Yamak/Utpreksha alankar",
      },
    ],
    test: "Draw graph + find zeroes for 2 quadratics + Meera pad meaning + poetic device",
    read: "5 examples of Anupras alankar from any poem",
    extra: [
      "Zeroes = x-intercepts; Sum α+β = –b/a; Product αβ = c/a",
      "Meera (1503–1546): princess of Merta; devoted to Krishna; saguna bhakti",
    ],
  },

  {
    day: 9,
    meta: { date: "9 May", dow: "Saturday", type: "holiday" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 2 Acids, Bases & Salts Pt 2 – pH scale; indicators; acid rain; aqua regia; strong vs weak acids; Ex 2 Q6–12",
      },
      {
        subject: "History",
        topic:
          "Ch 2 Nationalism in India – Rowlatt Act 1919; Jallianwala Bagh massacre 13 April 1919; Khilafat movement",
      },
    ],
    test: "pH of 6 substances + Jallianwala Bagh cause & consequences",
    read: "5 terms: pH, dilution, aqua regia, Rowlatt Act, Khilafat",
    extra: [
      "pH < 7 = acidic; 7 = neutral; > 7 = basic. Stomach ≈1.5; Blood ≈7.4",
      "Aqua regia = 3HCl + 1HNO₃; dissolves gold",
      "Jallianwala: Dyer ordered firing; 379 killed; 10 min; one narrow exit",
    ],
  },

  {
    day: 10,
    meta: { date: "10 May", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION: Maths Ch 1 complete (Euclid, FTA, irrationals, decimal expansions) + Ch 2 Polynomials intro (zeroes, graphical meaning); Science Ch 1 all 6 reaction types + Ch 2 Acids Parts 1–2 (pH, indicators, salts)",
      },
      {
        subject: "English",
        topic:
          "REVISION: History Ch 1–2 intro (Nationalism Europe+India, Rowlatt, Khilafat); Hindi Sparsh Ch 1–2 (Kabir, Meera); English Ch 1–2 + Poems 1–2",
      },
    ],
    test: "Full Mock: 5 Maths + 5 Science + 5 History + 5 English + 5 Hindi = 25 Qs (50 min)",
    read: "Error analysis. Update formula sheet. 'Weak spots' list.",
    extra: [
      "Self-check: Prove √2 in <5 min without notes?",
      "Self-check: Write all 6 reaction types from memory?",
      "Score target: 20+/25",
    ],
  },

  {
    day: 11,
    meta: { date: "11 May", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 2 Polynomials Pt 2 – Relationship between zeroes and coefficients (PROOF); form quadratic when zeroes given; p(x) = k[x² – (α+β)x + αβ]; Ex 2.2 all 5 Qs",
      },
      {
        subject: "History",
        topic:
          "Ch 2 Nationalism in India – Non-Cooperation Movement launch 1920: forms of non-cooperation; peasants, tribals, plantation workers",
      },
    ],
    test: "Form 3 quadratic polynomials from zeroes + 2 NCM groups with specific reasons",
    read: "Comprehension on freedom movement + 5 words: non-cooperation, boycott, swadeshi, satyagraha, civil disobedience",
    extra: [
      "Form quadratic: p(x) = k[x² – (α+β)x + αβ]",
      "NCM 1920: first mass movement; women participated; Assam plantation workers tied by Inland Emigration Act",
    ],
  },

  {
    day: 12,
    meta: { date: "12 May", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 2 Acids Pt 3 – NaCl, NaHCO₃, Na₂CO₃, Bleaching powder, Plaster of Paris; Chlor-alkali process (NaCl+H₂O → Cl₂+H₂+NaOH); Ex 2 Q13–18",
      },
      {
        subject: "English",
        topic:
          "First Flight Prose Ch 3: Two Stories About Flying (seagull + black aeroplane); Poem Ch 3: A Tiger in the Zoo – zoo vs forest stanzas",
      },
    ],
    test: "Balanced equation for washing soda + chlor-alkali products + compare flying stories",
    read: "Unseen passage + 5 words: instinct, valour, determination, mystique, beacon",
    extra: [
      "Chlor-alkali: NaCl+H₂O → Cl₂(anode)+H₂(cathode)+NaOH",
      "His First Flight: hunger overcame fear. Tiger: 'quiet rage' vs 'vivid stripes'",
    ],
  },

  {
    day: 13,
    meta: { date: "13 May", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 2 Polynomials Pt 3 – Division Algorithm; long division step-by-step; zeroes of cubic when one zero given; Ex 2.3 & 2.4",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Kavya Khand Ch 3: Maithilisharan Gupt – Manushyata; humanity, sacrifice (Dadhichi, Karna, Sib); patriotic themes",
      },
    ],
    test: "Divide x³–3x²+5x–3 by x²–2 + find all zeroes of cubic + explain Manushyata in 5 Hindi lines",
    read: "Hindi Samas: 5 examples with vigraha vakya",
    extra: [
      "Division Algo: degree of r(x) < degree of g(x)",
      "Cubic: α+β+γ=–b/a; sum of pairs=c/a; product=–d/a",
      "M.S. Gupt (1886–1964): Rashtrakavi; Chhayavad era",
    ],
  },

  {
    day: 14,
    meta: { date: "14 May", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 3 Metals & Non-metals Pt 1 – Physical & chemical properties; reactions with O₂/H₂O/acids; Full Reactivity Series K→Au; mnemonic",
      },
      {
        subject: "Geography",
        topic:
          "Ch 2 Forest & Wildlife – Reserved/Protected/Unclassed forests; biodiversity; Project Tiger 1973; Sacred groves; Bishnoi, Chipko",
      },
    ],
    test: "Na vs Al properties + Reactivity series K→Au + Reserved vs Protected forests difference",
    read: "5 terms: malleability, ductility, allotrope, biodiversity, endemic species",
    extra: [
      "Reactivity: K>Na>Ca>Mg>Al>Zn>Fe>Pb>H>Cu>Hg>Ag>Au",
      "Mnemonic: 'King Nora Can Make A Zoo; From Her Cage A Happy Angel'",
      "Project Tiger 1973: 9→50+ reserves; ~3000+ tigers now",
    ],
  },

  // ── WEEK 3 (15 May Fri → 21 May Thu) · Revision: Day 17 Sun ──

  {
    day: 15,
    meta: { date: "15 May", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 3 Linear Equations in Two Variables – Graphical method; conditions for unique/no/infinite solutions using ratios a₁/a₂ vs b₁/b₂ vs c₁/c₂; Ex 3.1",
      },
      {
        subject: "English",
        topic:
          "First Flight Prose Ch 4: From the Diary of Anne Frank – Holocaust background; writing as escape; Poem Ch 4: Amanda! – childhood freedom",
      },
    ],
    test: "Check consistency for 3 pairs (ratio method) + short answer on Anne Frank",
    read: "5 words: persevere, oppression, resilience, refuge, Holocaust",
    extra: [
      "Unique: a₁/a₂ ≠ b₁/b₂; No solution: a₁/a₂=b₁/b₂≠c₁/c₂; Infinite: all equal",
      "Anne Frank (1929–1945): hid July 1942; arrested Aug 1944; died Bergen-Belsen Feb 1945",
    ],
  },

  {
    day: 16,
    meta: { date: "16 May", dow: "Saturday", type: "holiday" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 3 Linear Equations – Substitution Method in full detail; 4 complete examples; word problems: age, number; Ex 3.2",
      },
      {
        subject: "Geography",
        topic:
          "Ch 3 Water Resources – scarcity causes; Bhakra-Nangal, Tehri, Sardar Sarovar; Narmada Bachao Andolan; traditional harvesting",
      },
    ],
    test: "Solve 3 pairs by substitution + water scarcity cause + dam advantage/disadvantage",
    read: "5 terms: irrigation, multipurpose project, watershed, eutrophication, rainwater harvesting",
    extra: [
      "Substitution: express y in x from eq1 → substitute in eq2 → find x → back-substitute",
      "Bhakra-Nangal: Sutlej river; highest gravity dam; Gobind Sagar reservoir",
      "Narmada Bachao Andolan: Medha Patkar; displacement of tribals",
    ],
  },

  {
    day: 17,
    meta: { date: "17 May", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION: Maths Ch 2 Polynomials FULL (zeroes, relationship, division algorithm) + Ch 3 graphical + substitution (4 problems); Science Ch 2 complete (salts, chlor-alkali) + Ch 3 Metals Pt1 (properties + reactivity series)",
      },
      {
        subject: "English",
        topic:
          "REVISION: History Ch 2 NCM table (events + dates); Geography Ch 2–3 (Forest, Water); Hindi Sparsh Ch 1–3; English Ch 3–4 + Poems 3–4",
      },
    ],
    test: "Full Mock: 5 Maths + 5 Science + 5 SST + 5 English + 5 Hindi = 25 Qs (50 min)",
    read: "Error analysis. Reactivity series + polynomial division — most tested. Redo all wrong Qs.",
    extra: [
      "Polynomial: p(x) = g(x)·q(x) + r(x). Always verify.",
      "Reactivity: write K→Au twice without looking. Time yourself.",
      "Score target: 21+/25",
    ],
  },

  {
    day: 18,
    meta: { date: "18 May", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 3 Linear Equations – Elimination Method + Cross-Multiplication Method (derivation); when to use which; Ex 3.3 & 3.4",
      },
      {
        subject: "History",
        topic:
          "Ch 2 Nationalism in India – Chauri Chaura Feb 1922; Simon Commission 1927; Dandi March 1930 (date, route, significance)",
      },
    ],
    test: "Solve 2 pairs by elimination + 1 by cross-multiplication + Why did Gandhi withdraw NCM?",
    read: "5 words: elimination, coefficient, civil disobedience, franchise, dominion status",
    extra: [
      "Cross-mult: x/(b₁c₂–b₂c₁) = y/(c₁a₂–c₂a₁) = 1/(a₁b₂–a₂b₁)",
      "Chauri Chaura: Feb 4, 1922 UP; 22 policemen killed; Gandhi: non-violence is soul of satyagraha",
      "Dandi March: March 12–April 6, 1930; 240 miles; broke salt law",
    ],
  },

  {
    day: 19,
    meta: { date: "19 May", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 3 Metals & Non-metals Pt 2 – Ionic bond (NaCl, MgO, MgCl₂); extraction: ore vs mineral; reduction; electrolytic refining; corrosion & galvanisation; Ex 3 Q1–8",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Kavya Khand Ch 4: Sumitranandan Pant – Parvat Pradesh ke Paavs; mountains in monsoon; Rupak and Upama alankar",
      },
    ],
    test: "Draw ionic bond for MgCl₂ + explain galvanisation + 3 nature images from Pant with poetic device",
    read: "Hindi Muhavare – 5 idioms about nature/courage",
    extra: [
      "Ionic bond: metal loses e⁻ (cation), non-metal gains (anion); electrostatic attraction",
      "Galvanisation: iron coated with zinc; ZnO protective layer prevents rusting",
      "Pant (1900–1977): Jnanpith 1968; Chhayavad; nature poetry specialist",
    ],
  },

  {
    day: 20,
    meta: { date: "20 May", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 3 Linear Equations – Word Problems: age, fraction, speed-distance, number, mixture; Ex 3.5 & 3.6 all problems",
      },
      {
        subject: "English",
        topic:
          "First Flight Prose Ch 5: Glimpses of India (Goa Baker, Coorg, Tea from Assam); Poem Ch 5: The Trees (Adrienne Rich) – feminist symbolism",
      },
    ],
    test: "Set up + solve 2 word problems + compare 2 of 3 places in Glimpses",
    read: "5 words: compassion, vivid, eloquent, festive, indigenous – write paragraph using 3",
    extra: [
      "Word problem: define variables first; form 2 equations; solve; verify in original context",
      "Coorg: 'Scotland of India'; Kodavas warriors; coffee and cardamom",
      "The Trees: move from glass house to forest = women breaking free from patriarchy",
    ],
  },

  {
    day: 21,
    meta: { date: "21 May", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 4 Carbon & Its Compounds – tetravalency, catenation; allotropes (diamond, graphite, fullerene C₆₀); covalent bonds; electron dot structures CH₄, C₂H₆, C₂H₄, C₂H₂",
      },
      {
        subject: "Geography",
        topic:
          "Ch 4 Agriculture – Kharif/Rabi/Zaid seasons; rice, wheat, cash crops; Green Revolution; food security",
      },
    ],
    test: "Electron dot structure for C₂H₄ (double bond) + Diamond vs Graphite + 3 kharif + 3 rabi crops with areas",
    read: "5 terms: catenation, tetravalency, allotrope, kharif, rabi",
    extra: [
      "Diamond: tetrahedral C–C; hardest; insulator. Graphite: hexagonal layers; conductor; lubricant",
      "Fullerene C₆₀: 20 hexagons + 12 pentagons; Nobel 1996",
      "Green Revolution: Norman Borlaug HYV seeds + fertilisers → food self-sufficient",
    ],
  },

  // ── WEEK 4 (22 May Fri → 30 May Sat) · Revision: Day 24 Sun ──

  {
    day: 22,
    meta: { date: "22 May", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 4 Quadratic Equations – Factorisation method (split middle term): find p,q where p×q=ac AND p+q=b; standard form ax²+bx+c=0; Ex 4.1 & 4.2",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Kavya Khand Ch 5: Viren Dangwal – Topiwala; Ch 6: Kaffi Azmi – Ek Phool ki Chah (caste discrimination)",
      },
    ],
    test: "Solve by factorisation: x²–3x–10=0 and 2x²–7x+3=0 + central message of Ek Phool ki Chah in 5 Hindi sentences",
    read: "Hindi: Vakya bhed – 5 examples each of Saral/Sanyukt/Mishra vakya",
    extra: [
      "Split middle: find p,q: p×q=ac AND p+q=b",
      "Azmi (1919–2002): Ek Phool ki Chah — Untouchable father wants marigold; daughter dies of plague",
    ],
  },

  {
    day: 23,
    meta: { date: "23 May", dow: "Saturday", type: "holiday" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 4 Carbon Pt 2 – Homologous series; IUPAC naming (prefix + suffix table); first 5 members of alkane/alkene/alkyne; functional groups (–OH, –COOH, –CHO, –CO); Ex 4 Q1–8",
      },
      {
        subject: "History",
        topic:
          "Ch 2 Nationalism in India – Gandhi's vision of Swaraj; Round Table Conference 1930–32; Gandhi-Irwin Pact 1931; Poona Pact 1932 (Ambedkar)",
      },
    ],
    test: "IUPAC names for 5 compounds + Gandhi-Irwin Pact terms & significance",
    read: "5 terms: homologous, functional group, IUPAC, Swaraj, Round Table Conference",
    extra: [
      "Alkanes: CₙH₂ₙ₊₂; alkenes: CₙH₂ₙ; alkynes: CₙH₂ₙ₋₂",
      "Gandhi-Irwin Pact 1931: release political prisoners; Gandhi attends 2nd RTC; suspend CDM",
      "Poona Pact 1932: joint electorate with reserved seats for Dalits (after Gandhi's fast)",
    ],
  },

  {
    day: 24,
    meta: { date: "24 May", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION: Maths Ch 3 Linear Equations FULL (all 4 algebraic methods + 5 word problems) + Ch 4 intro (factorisation 6 problems); Science Ch 3 Metals FULL (ionic bonds, extraction) + Ch 4 Carbon (allotropes, IUPAC 10 compounds)",
      },
      {
        subject: "English",
        topic:
          "REVISION: History Ch 2 full timeline (10 events + dates: Rowlatt→JB→NCM→CC→Simon→Salt March→GI Pact); Geography Ch 3–4; Hindi Sparsh Ch 4–6; English Ch 4–5 + Poems 4–5",
      },
    ],
    test: "Full Mock: 5 Maths + 5 Science + 5 SST + 5 English + 5 Hindi = 25 Qs (50 min)",
    read: "Error analysis. IUPAC naming 8 compounds without notes? History 8 dates?",
    extra: [
      "NCM-CDM timeline: 1919 Rowlatt→JB→1920 NCM→1922 CC→1927 Simon→1930 Salt March→1931 GI Pact",
      "Score target: 22+/25",
    ],
  },

  {
    day: 25,
    meta: { date: "25 May", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 4 Quadratic Equations – Completing the Square + Quadratic Formula derivation; Discriminant D=b²–4ac: nature of roots (D>0/D=0/D<0); Ex 4.3 & 4.4",
      },
      {
        subject: "English",
        topic:
          "First Flight Prose Ch 6: Mijbil the Otter; Poem Ch 6: Fog (Carl Sandburg) – extended metaphor; Grammar: Formal Letter format (all 6 parts) + 1 practice letter",
      },
    ],
    test: "Solve by formula: 2x²–7x+3=0 and x²+4x+5=0 + write formal letter to principal (study leave)",
    read: "5 words: instinctive, amphibious, domesticated, elusive, persistent",
    extra: [
      "Completing square: x²+6x=(x+3)²–9; derive formula from this",
      "D<0: no real roots. Formal letter: Sender→Date→Receiver→Subject→Salutation→Body→Yours faithfully",
      "Fog: 'on little cat feet' — entire poem = extended personification",
    ],
  },

  {
    day: 26,
    meta: { date: "26 May", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 4 Carbon Pt 3 – Ethanol properties + reactions; Ethanoic acid properties; Esterification; Soaps & Detergents; micelle formation; Ex 4 Q9–15",
      },
      {
        subject: "Geography",
        topic:
          "Ch 5 Minerals & Energy Resources Pt 1 – Ferrous/non-ferrous minerals; distribution; coal types; petroleum; energy crisis",
      },
    ],
    test: "Ethanol reaction with Na + esterification equation + 2 ferrous + 2 non-ferrous minerals with states",
    read: "5 terms: ester, saponification, micelle, ferrous, haematite",
    extra: [
      "Esterification: CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O (conc. H₂SO₄, heat; reversible)",
      "Micelle: hydrophobic tail in oil, hydrophilic head in water → spherical cluster",
      "Iron ore: Jharkhand, Odisha, Chhattisgarh, Karnataka",
    ],
  },

  {
    day: 27,
    meta: { date: "27 May", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 5 Arithmetic Progressions Pt 1 – Definition; common difference; nth term aₙ = a+(n–1)d (derivation); find nth term; check if number is a term; Ex 5.1 & 5.2",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Kavya Khand Ch 7: Tagore – Atmatraan (prayer; strength, not sympathy); Gadya Khand Ch 8: Premchand – Bade Bhai Sahab (irony of formal vs real education)",
      },
    ],
    test: "Find nth term + check if 200 is a term in AP + Tagore's 3 requests in own words + character sketch of Bade Bhai Sahab",
    read: "Hindi unseen passage 150 words + 5 words on courage/self-reliance",
    extra: [
      "AP derivation: a, a+d, a+2d, ..., a+(n–1)d",
      "Tagore (1861–1941): Nobel 1913; Gitanjali; wrote national anthems of India AND Bangladesh",
      "Premchand (1880–1936): Godan, Nirmala; social realism",
    ],
  },

  {
    day: 28,
    meta: { date: "28 May", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 5 Arithmetic Progressions Pt 2 – Sum Sₙ = n/2[2a+(n–1)d] (Gauss derivation); Sₙ = n/2(a+l); aₙ = Sₙ–Sₙ₋₁; word problems; Ex 5.3 & 5.4",
      },
      {
        subject: "Science",
        topic:
          "Ch 5 Life Processes Pt 1 – Autotrophic/Heterotrophic nutrition; Photosynthesis in full (raw materials, products, chloroplasts, stomata, factors): 6CO₂+6H₂O+light→C₆H₁₂O₆+6O₂",
      },
    ],
    test: "Find sum of AP + find n when sum given + draw leaf cross-section with stomata + photosynthesis equation",
    read: "5 terms: stomata, chloroplast, chlorophyll, mesophyll, transpiration",
    extra: [
      "Sum derivation: S+reversed S → 2S=n(a+l) → S=n/2(a+l)",
      "Photosynthesis: 6CO₂+6H₂O+light → C₆H₁₂O₆+6O₂",
      "Stomata: open day (gas exchange); guard cells control by osmosis",
    ],
  },

  {
    day: 29,
    meta: { date: "29 May", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 5 Life Processes Pt 2 – Aerobic respiration (glycolysis, Krebs cycle, 38 ATP); Anaerobic (yeast→ethanol; muscle→lactic acid); Xylem vs phloem; double circulation intro",
      },
      {
        subject: "Geography",
        topic:
          "Ch 5 Minerals Pt 2 + Ch 6 Manufacturing Industries – Non-conventional energy; textile (cotton/jute); sugar industry; industrial pollution",
      },
    ],
    test: "Aerobic vs anaerobic table + xylem vs phloem differences + 3 non-conventional energy sources in India",
    read: "5 terms: glycolysis, Krebs cycle, ATP, xylem, phloem",
    extra: [
      "38 ATP aerobic; 2 ATP anaerobic",
      "Lactic acid = muscle cramp; hot water bath helps",
      "India: largest wind power in Asia; Rajasthan = most solar potential",
    ],
  },

  {
    day: 30,
    meta: { date: "30 May", dow: "Saturday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MAY MONTH-END REVISION – Maths Ch 1–5 FULL: solve 2 problems per chapter = 10 problems under timed conditions (45 min); verify all formulas; redo weakest chapter completely",
      },
      {
        subject: "Science",
        topic:
          "MAY MONTH-END REVISION – Science Ch 1–5 complete write-from-memory; History Ch 2 timeline; Geography Ch 1–5 key facts; English Ch 1–6 themes; Hindi Sparsh Ch 1–8 author+theme chart",
      },
    ],
    test: "MAY MOCK: 10 Maths + 10 Science + 8 SST + 7 English + 5 Hindi = 40 Qs (70 min)",
    read: "Prepare JUNE PLAN: note weakest topics from May. These get priority in June.",
    extra: [
      "May check: Maths Ch 1–5 ✓ | Science Ch 1–5 ✓ | History Ch 2 ✓ | Geography Ch 1–5 ✓ | English Ch 1–6 ✓ | Hindi Sparsh Ch 1–8 ✓",
      "FOUNDATION month complete. Enter June with formula sheet ready + error log updated.",
    ],
  },

  // ════════════════════════════════════════════════════════════
  // JUNE — BUILDING MONTH (Days 31–60)
  // ════════════════════════════════════════════════════════════

  // ── WEEK 1 (1 Jun Mon → 7 Jun Sun) · Revision: Day 37 Sun ──

  {
    day: 31,
    meta: { date: "1 Jun", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 6 Triangles Pt 1 – Similar vs Congruent; BPT (Thales' Theorem): full PROOF; Converse of BPT; Ex 6.1",
      },
      {
        subject: "History",
        topic:
          "Ch 3 Making of Global World – Silk routes; pre-modern world; indentured labour (Caribbean, Mauritius, Fiji); abolition 1921",
      },
    ],
    test: "Prove or apply BPT (2 Qs) + Indentured labour: what, why, conditions (3 Qs)",
    read: "5 terms: proportionality, theorem, collinear, indentured, migration",
    extra: [
      "BPT proof: areas of △ADE, △BDE via common height → ratio of areas = ratio of bases",
      "Indentured labour: 5-year contract; 'new system of slavery'; Indian diaspora: Trinidad, Guyana, Mauritius, Fiji",
    ],
  },

  {
    day: 32,
    meta: { date: "2 Jun", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 6 Triangles Pt 2 – AA, SAS, SSS similarity criteria; practice examples; Ex 6.2",
      },
      {
        subject: "Science",
        topic:
          "Ch 5 Life Processes Pt 3 – Nephron structure; filtration, reabsorption, secretion; dialysis; excretion in plants",
      },
    ],
    test: "Find unknown side in 2 similarity problems + draw labelled nephron + explain filtration and reabsorption",
    read: "5 terms: similar, congruent, criterion, nephron, dialysis",
    extra: [
      "AA: 2 equal angles → third also equal; SAS: sides in ratio + included angle equal",
      "Nephron: Bowman's capsule → glomerulus (ball of capillaries); high-pressure filtration",
      "Dialysis: semi-permeable membrane; waste diffuses out",
    ],
  },

  {
    day: 33,
    meta: { date: "3 Jun", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 6 Triangles Pt 3 – Area of similar triangles theorem (PROOF); Pythagoras Theorem (PROOF using similarity); Converse; Ex 6.3",
      },
      {
        subject: "Geography",
        topic:
          "Ch 6 Manufacturing Industries – Iron & Steel (Jamshedpur, Bhilai, Rourkela, Durgapur, Bokaro); Chemical industries; Industrial pollution (Air Act 1981, Water Act 1974)",
      },
    ],
    test: "Area ratio theorem application + Pythagoras proof summary + Iron & steel: raw materials + 3 centres",
    read: "5 terms: smelting, ore, agglomeration, effluent, pollution",
    extra: [
      "Area theorem: area(ABC)/area(PQR) = (AB/PQ)² = (BC/QR)²",
      "Pythagoras proof: altitude from right angle → 3 similar triangles",
      "Jamshedpur (Tata 1907): coal from Jharia, iron from Noamundi; 'Pittsburgh of India'",
    ],
  },

  {
    day: 34,
    meta: { date: "4 Jun", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 6 Control & Coordination Pt 1 – Neuron structure; types (sensory, motor, relay); Reflex arc: full pathway + examples; why reflex is faster",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Gadya Khand Ch 9: Sitaram Seksaria – Diary ka Ek Panna; 26 January 1931 in Kolkata; hoisting flag under lathicharge",
      },
    ],
    test: "Draw labelled neuron + trace reflex arc for 'stepping on nail' + explain significance of 26 Jan 1931",
    read: "Hindi: Lokoktiyan – 5 proverbs with meaning and situation of use",
    extra: [
      "Synapse: electrical → chemical (neurotransmitter) → electrical; gap between neurons",
      "Reflex arc bypasses brain → faster (0.1s vs 0.3s); spinal cord = reflex centre",
      "26 Jan 1930 = Purna Swaraj Day; annually celebrated → became Republic Day 1950",
    ],
  },

  {
    day: 35,
    meta: { date: "5 Jun", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 7 Coordinate Geometry Pt 1 – Distance formula (derivation using Pythagoras); check triangle type; collinearity; Ex 7.1",
      },
      {
        subject: "English",
        topic:
          "First Flight Prose Ch 7: Madam Rides the Bus (Valli); Poem Ch 7: The Tale of Custard the Dragon (Ogden Nash) – humour and bravery vs reputation",
      },
    ],
    test: "Distance formula: is given triangle isoceles or right-angled? + character sketch of Valli",
    read: "5 words: inquisitive, initiative, unnerve, immaculate, obstinate",
    extra: [
      "Distance: d=√[(x₂–x₁)²+(y₂–y₁)²]; Collinear: area = 0",
      "Valli: 8 years old; saves 60 paise; round trip for 1 rupee",
      "Custard fights the pirate. Moral: true courage shown in action",
    ],
  },

  {
    day: 36,
    meta: { date: "6 Jun", dow: "Saturday", type: "holiday" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 6 Control & Coordination Pt 2 – Human brain (cerebrum, cerebellum, medulla); CSF protection; Endocrine glands: pituitary, thyroid, parathyroid, adrenal, pancreas, gonads – hormone + function table",
      },
      {
        subject: "Civics",
        topic:
          "Ch 1 Power Sharing – Prudential & moral reasons; Belgium (equal community govt) vs Sri Lanka (Sinhala-only 1956 → LTTE war); Majoritarianism dangers",
      },
    ],
    test: "Name brain part for: breathing/balance/thinking/memory + Compare Belgium and Sri Lanka",
    read: "5 terms: cerebrum, cerebellum, medulla, majoritarian, federal",
    extra: [
      "Medulla: heartbeat, breathing, blood pressure — vital; damage = death",
      "Pituitary: 'master gland'; growth hormone (excess=gigantism)",
      "Thyroid: thyroxine; iodine deficiency = goitre",
      "Belgium 1970: Dutch 59%, French 40%, German 1%; equal community governments",
    ],
  },

  {
    day: 37,
    meta: { date: "7 Jun", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION: Maths Ch 6 (BPT, similarity, area theorem, Pythagoras) 6 problems + Ch 7 intro (distance 4 problems); Science Ch 5 (photosynthesis, respiration, transport, excretion) + Ch 6 (neuron, reflex, brain, hormones)",
      },
      {
        subject: "English",
        topic:
          "REVISION: History Ch 3 intro; Geography Ch 6; Civics Ch 1; Hindi Sparsh Ch 9; English Ch 7",
      },
    ],
    test: "Full Mock: 5 Maths + 5 Science + 5 SST + 5 English + 5 Hindi = 25 Qs (50 min)",
    read: "Error analysis. Draw neuron + reflex arc + brain from MEMORY. These appear every year in boards.",
    extra: [
      "BPT exam tip: draw diagram first; label AD, DB, AE, EC clearly",
      "Hormone flashcards: pituitary/thyroid/adrenal/pancreas — hormone + function",
      "Score target: 22+/25",
    ],
  },

  // ── WEEK 2 (8 Jun Mon → 14 Jun Sun) · Revision: Day 44 Sun ──

  {
    day: 38,
    meta: { date: "8 Jun", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 7 Coordinate Geometry Pt 2 – Section formula (internal division, derivation); Midpoint; Trisection; Find ratio given point; Ex 7.2",
      },
      {
        subject: "History",
        topic:
          "Ch 3 Making of Global World – Great Depression 1929 (causes, US stock crash; effects on India); Post-war: Bretton Woods 1944 (IMF, World Bank)",
      },
    ],
    test: "Section formula: find coordinates of point (3 Qs) + Great Depression: 3 causes + 2 effects on India",
    read: "5 terms: section formula, midpoint, depression, decolonisation, Bretton Woods",
    extra: [
      "Section: x=(mx₂+nx₁)/(m+n); y=(my₂+ny₁)/(m+n)",
      "To find ratio: let k:1, substitute, equate to given point",
      "Bretton Woods 1944: IMF (short-term loans) + World Bank (long-term development loans)",
    ],
  },

  {
    day: 39,
    meta: { date: "9 Jun", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 7 Coordinate Geometry Pt 3 – Area of triangle using coordinates (derivation); Collinearity; Mixed problems; Ex 7.3 & 7.4",
      },
      {
        subject: "Science",
        topic:
          "Ch 6 Control & Coordination Pt 3 – Plant hormones: Auxin, Gibberellin, Cytokinin, ABA (abscisic acid); Phototropism mechanism with auxin redistribution",
      },
    ],
    test: "Area of triangle using coords (2 Qs) + collinearity using area (1 Q) + explain how auxin causes phototropism step by step",
    read: "5 terms: auxin, gibberellin, cytokinin, tropism, phototropism",
    extra: [
      "Area: ½|x₁(y₂–y₃)+x₂(y₃–y₁)+x₃(y₁–y₂)|; area=0 → collinear",
      "Phototropism: light from left → auxin moves to right (shade) → right grows faster → bends toward light",
      "ABA = stress hormone; closes stomata in drought",
    ],
  },

  {
    day: 40,
    meta: { date: "10 Jun", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 8 Trigonometry Pt 1 – sin, cos, tan, cosec, sec, cot defined; relationships: cosec=1/sin, sec=1/cos, cot=1/tan, tan=sin/cos; find all ratios if one given; Ex 8.1 Q1–8",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Gadya Khand Ch 10: Liladhar Mandloi – Tantara-Vamiro Katha; Nicobar folk tale; love vs social convention; magical realism",
      },
    ],
    test: "Find all 6 trig ratios if sin A = 3/5 + explain tragic climax of Tantara-Vamiro Katha",
    read: "5 examples of Upma alankar from any Hindi poem",
    extra: [
      "sin A=3/5 → build right triangle: opp=3, hyp=5, adj=4 (Pythagoras); all 6 ratios systematic",
      "Tantara-Vamiro: two villages forbidden to intermarry; Tantara turns into tree/rock — tribal oral tradition",
      "Mandloi (b.1954): poet and TV producer; tribal/folk culture",
    ],
  },

  {
    day: 41,
    meta: { date: "11 Jun", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 8 Trigonometry Pt 2 – Standard angles 0°,30°,45°,60°,90° (DERIVE using equilateral + isoceles right triangles); Complementary angles identities; Ex 8.2 & 8.3",
      },
      {
        subject: "Geography",
        topic:
          "Ch 7 Lifelines of National Economy – Roadways (NH/SH); Railways (gauges); Waterways (NW1,NW2,NW3); Airways; 13 major ports; Communication media",
      },
    ],
    test: "Evaluate sin60°·cos30°+cos60°·sin30° + complementary identities + 3 National Waterways with river/region",
    read: "5 terms: complementary, adjacent, hypotenuse, waterway, gauge",
    extra: [
      "Standard values: sin: 0,½,1/√2,√3/2,1 = √0/2,√1/2,√2/2,√3/2,√4/2; cos is reverse",
      "NW1: Haldia–Allahabad on Ganga (1620 km) — longest",
      "13 major ports: Mumbai (largest), JNPT (busiest), Chennai, Kandla, Kochi…",
    ],
  },

  {
    day: 42,
    meta: { date: "12 Jun", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 8 Trigonometry Pt 3 – Three fundamental identities (PROOF): sin²θ+cos²θ=1 → divide by cos²θ → 1+tan²θ=sec²θ; divide by sin²θ → 1+cot²θ=cosec²θ; prove trig statements; Ex 8.4",
      },
      {
        subject: "Science",
        topic:
          "Ch 7 Reproduction Pt 1 – Why reproduce? Asexual: binary fission (Amoeba), budding (Hydra/Yeast), spore formation (Rhizopus), fragmentation (Spirogyra), regeneration (Planaria), vegetative propagation",
      },
    ],
    test: "Prove 1+tan²θ=sec²θ (derivation) + list all asexual methods with organism + explain binary fission in Amoeba",
    read: "5 terms: binary fission, budding, fragmentation, regeneration, vegetative propagation",
    extra: [
      "Identity 1 from Pythagoras: perpendicular²+base²=hyp²; divide by hyp²",
      "Binary fission Amoeba: nucleus divides (mitosis) → cytoplasm divides → 2 daughter cells",
      "Fragmentation ≠ regeneration: each piece grows vs organism regrows from cut",
    ],
  },

  {
    day: 43,
    meta: { date: "13 Jun", dow: "Saturday", type: "holiday" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 9 Applications of Trigonometry – Line of sight; angle of elevation/depression; height & distance problems; Ex 9.1 all questions with diagrams",
      },
      {
        subject: "Civics",
        topic:
          "Ch 2 Federalism Pt 1 – Types: coming together vs holding together; India: Union List (97), State List (66), Concurrent List (47); Linguistic reorganisation 1956",
      },
    ],
    test: "Solve 2 height & distance problems (angle of elevation) + difference Union List vs State List with 3 examples each",
    read: "5 terms: angle of elevation, depression, federation, concurrent, residuary",
    extra: [
      "Height/distance: always draw diagram first; label h, d, θ; tan(angle of elevation) = h/d",
      "India Concurrent List: education, forests, trade unions — both Centre & State can legislate; Centre prevails in conflict",
    ],
  },

  {
    day: 44,
    meta: { date: "14 Jun", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION: Maths Ch 7 Coord Geom complete (5 mixed) + Ch 8 Trig complete (prove 2 identities) + Ch 9 intro (3 height/distance); Science Ch 6 (all hormones, plant hormones, tropisms) + Ch 7 intro (asexual all methods)",
      },
      {
        subject: "English",
        topic:
          "REVISION: History Ch 3 (Depression, Bretton Woods); Geography Ch 7 (transport/ports); Civics Ch 1–2; Hindi Sparsh Ch 10; English Ch 7–8",
      },
    ],
    test: "Full Mock: 5 Maths + 5 Science + 5 SST + 5 English + 5 Hindi = 25 Qs (50 min)",
    read: "Error analysis. Trig table from memory in 3 min. Reactivity series in 2 min. Both frequently tested.",
    extra: [
      "Trig identities: sin²+cos²=1 is parent; others derived by division — understand, don't memorise",
      "Section formula vs Midpoint: midpoint is section with m=n; learn ONE formula",
      "Score target: 23+/25",
    ],
  },

  // ── WEEK 3 (15 Jun Mon → 21 Jun Sun) · Revision: Day 51 Sun ──

  {
    day: 45,
    meta: { date: "15 Jun", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 10 Circles Pt 1 – Tangent to circle; Theorem 1: Tangent ⊥ radius (PROOF); Theorem 2: Two tangents from external point equal (PROOF); Ex 10.1 & 10.2",
      },
      {
        subject: "History",
        topic:
          "Ch 4 Age of Industrialisation – Proto-industrialisation (putting-out system); early textile mills; workers' conditions; impact on Indian weavers (British cloth + tariff removal)",
      },
    ],
    test: "Prove tangents from external point equal (full proof + diagram) + explain proto-industrialisation + why Indian weavers suffered",
    read: "5 terms: tangent, point of contact, perpendicular, proto-industrialisation, putting-out system",
    extra: [
      "Tangent ⊥ radius: OT ⊥ TP; O=centre, T=contact point. Key result for all circle problems.",
      "Two tangents from P: PA=PB; OP bisects angle APB",
      "Indian weavers: Manchester cloth flooded India → handloom weavers lost livelihood → poverty in Bengal, Surat",
    ],
  },

  {
    day: 46,
    meta: { date: "16 Jun", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 7 Reproduction Pt 2 – Sexual reproduction in flowering plants: flower parts; pollination (self/cross; agents); fertilisation; double fertilisation; seed/fruit formation",
      },
      {
        subject: "Civics",
        topic:
          "Ch 2 Federalism Pt 2 – 73rd Amendment 1992 (Panchayati Raj: gram panchayat/samiti/zila parishad; gram sabha); 74th Amendment (urban bodies); Women's reservation 33%",
      },
    ],
    test: "Explain double fertilisation with diagram + difference between 73rd and 74th Amendment",
    read: "5 terms: pollination, fertilisation, zygote, panchayat, gram sabha",
    extra: [
      "Double fertilisation (unique to angiosperms): 1 pollen + egg → zygote; 1 pollen + 2 polar nuclei → endosperm",
      "After fertilisation: ovule → seed; ovary → fruit",
      "Gram Sabha = all adult voters in village; watchdog of panchayat",
    ],
  },

  {
    day: 47,
    meta: { date: "17 Jun", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 11 Areas Related to Circles – Area of sector (θ/360 × πr²); arc length; area of segment (sector – triangle); Ex 11.1 & 11.2",
      },
      {
        subject: "English",
        topic:
          "First Flight Prose Ch 8: Sermon at Benares (Buddha, Kisa Gotami, mustard seeds – death is universal); Poem Ch 8: For Anne Gregory (Yeats – external vs unconditional love)",
      },
    ],
    test: "Area of sector + segment for given angle and radius + moral of Sermon at Benares: how does mustard seed story teach the lesson?",
    read: "5 words: sermon, parable, enlightenment, immortal, unconditional",
    extra: [
      "Sector: 'pizza slice'; area=(θ/360)πr²; if θ=90° → ¼πr²",
      "Segment = sector area – triangle area (for minor segment)",
      "Kisa Gotami: mustard from house with no death → realised death is universal → wisdom",
      "Yeats: men love Anne for yellow hair (external); only God loves for inner worth",
    ],
  },

  {
    day: 48,
    meta: { date: "18 Jun", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 7 Reproduction Pt 3 – Human reproductive system (male + female); menstrual cycle; fertilisation; implantation; placenta; contraception methods; reproductive health",
      },
      {
        subject: "History",
        topic:
          "Ch 4 Age of Industrialisation – Textile mills in India (Bombay 1854; Jute Calcutta); Indian industrialists; WWI as turning point for Indian industry; impact on craftsmen",
      },
    ],
    test: "Draw + label male reproductive system + function of placenta + How did WWI help Indian industrialisation?",
    read: "5 terms: seminiferous tubule, placenta, implantation, tariff, industrialisation",
    extra: [
      "Testes outside body: sperm need 2–3°C lower than body temp",
      "Placenta: disc-shaped; umbilical cord; exchange nutrients/O₂/waste but no direct blood mixing",
      "Bombay mills 1854: Cowasji Davar; by 1895 over 80 mills",
      "WWI 1914–18: Manchester cloth imports stopped → Indian mills supplied army → industrialisation boost",
    ],
  },

  {
    day: 49,
    meta: { date: "19 Jun", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 12 Surface Areas & Volumes Pt 1 – All formulas; combination of solids (cone+cylinder, hemisphere+cylinder); TSA and volume; Ex 12.1",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Gadya Khand Ch 11 (Priyamvad) + Ch 12: Nida Fazli – Ghazal philosophy; acceptance of pain; Sufi influence; compare with Kaffi Azmi",
      },
    ],
    test: "TSA of cylinder with hemispherical ends (r=3.5cm, total length=10cm) + Discuss how Nida Fazli's philosophy differs from Kabir",
    read: "Hindi: Samas – 5 Tatpurusha examples with vigraha vakya",
    extra: [
      "TSA combination: identify EXPOSED surfaces only — don't add individual TSAs",
      "Hemisphere+cylinder: CSA cylinder + CSA hemisphere + 1 base circle",
      "Nida Fazli (1938–2016): Muktibodh Samman 2013; Urdu-Hindi mix; partition themes",
    ],
  },

  {
    day: 50,
    meta: { date: "20 Jun", dow: "Saturday", type: "holiday" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 12 Surface Areas Pt 2 – Conversion of solid (volume conserved when recast); Frustum (l=√[h²+(R–r)²], volume=πh/3(R²+r²+Rr), CSA); Ex 12.2 & 12.3",
      },
      {
        subject: "Civics",
        topic:
          "Ch 3 Gender, Religion & Caste – Sexual division of labour; women's political representation (33% debate); Communalism in politics; India's secular approach (principled distance)",
      },
    ],
    test: "Frustum volume and CSA problem + What is communalism? 2 examples of how it enters politics in India",
    read: "5 terms: frustum, communalism, secularism, gender division, reservation",
    extra: [
      "Frustum: cone with top cut off; slant height l=√[h²+(R–r)²]",
      "India: not strict separation (USA) but principled distance — state can reform religion for equality",
      "Communalism: religion = political community; basis for economic/political power",
    ],
  },

  {
    day: 51,
    meta: { date: "21 Jun", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION: Maths Ch 10 (tangent proofs), Ch 11 (sector/segment), Ch 12 (combinations, frustum) — 6 problems; Science Ch 7 Reproduction full (asexual 6 methods, flowering plant, human system, contraception)",
      },
      {
        subject: "English",
        topic:
          "REVISION: History Ch 4 (proto-industrialisation, Indian mills, WWI); Civics Ch 2–3; Hindi Sparsh Ch 11–12; English Ch 8; Chapter-by-chapter summary table for ALL chapters so far",
      },
    ],
    test: "Full Mock: 5 Maths + 5 Science + 5 SST + 5 English + 5 Hindi = 25 Qs (50 min)",
    read: "Self-quiz: draw female reproductive system + explain menstrual cycle. Board exam 5-mark favourite.",
    extra: [
      "Circles: 2 theorems by heart: (1) tangent ⊥ radius, (2) tangents from ext point equal",
      "Areas: segment = sector – triangle; use correct triangle formula",
      "Score target: 23+/25",
    ],
  },

  // ── WEEK 4 (22 Jun Mon → 30 Jun Tue) · Revision: Day 58 Sun ──

  {
    day: 52,
    meta: { date: "22 Jun", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 13 Statistics Pt 1 – Mean: Direct Method, Assumed Mean Method, Step Deviation Method; compare all 3 on same example; Ex 13.1 & 13.2",
      },
      {
        subject: "History",
        topic:
          "Ch 5 Print Culture – Gutenberg (1440s); Luther's 95 Theses spread by print; first press in India (Goa 1556); William Carey; vernacular press; Indian languages in print",
      },
    ],
    test: "Find mean by all 3 methods for same grouped data + How did print help spread Reformation in Europe?",
    read: "5 terms: direct method, assumed mean, step deviation, printing press, Reformation",
    extra: [
      "Direct: Σfxᵢ/Σf; Assumed mean: a+Σfdᵢ/Σf; Step deviation: a+(Σfuᵢ/Σf)×h; all same answer",
      "Gutenberg 1440s: moveable type; Bible printed 1455; 180 copies",
      "Luther 1517: 95 Theses → printed → spread across Europe in 2 months",
    ],
  },

  {
    day: 53,
    meta: { date: "23 Jun", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 13 Statistics Pt 2 – Median of grouped data (cumulative frequency, median class, formula); Ogive (less than + more than); Mode (modal class, formula); compare mean/median/mode; Ex 13.3",
      },
      {
        subject: "Science",
        topic:
          "Ch 8 Heredity Pt 1 – Mendel and pea plants; Monohybrid cross (TT×tt→Tt→3:1); Dihybrid cross (9:3:3:1); Law of Segregation; Law of Independent Assortment",
      },
    ],
    test: "Find median and mode for grouped data + monohybrid cross F1 and F2 with Punnett square",
    read: "5 terms: genotype, phenotype, dominant, recessive, allele",
    extra: [
      "Median formula: l+[(n/2–cf)/f]×h; Mode: l+[f₁–f₀/(2f₁–f₀–f₂)]×h",
      "Punnett square F2: TT, Tt, Tt, tt → 3 tall : 1 dwarf",
      "Law of Segregation: two alleles separate during gamete formation",
    ],
  },

  {
    day: 54,
    meta: { date: "24 Jun", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 14 Probability Pt 1 – Classical probability; P(E)=favourable/total; complementary events; coin, dice, cards; Ex 14.1 Q1–15",
      },
      {
        subject: "Hindi",
        topic:
          "Sparsh Gadya Khand Ch 13: P. Kelekar – Jheel ke dil mein; Ch 14: Habib Tanvir – Sab Se Anmol Dhan (the most precious wealth)",
      },
    ],
    test: "Probability: 2 dice + card from deck (4 Qs) + What is the 'most precious wealth' according to Habib Tanvir?",
    read: "Hindi: 5 Virodhi shabd (antonyms) + 5 Paryayvachi shabd (synonyms) for common Hindi words",
    extra: [
      "Card deck: 52 = 4 suits × 13 ranks; 4 aces, 4 kings, 26 red, 26 black",
      "Dice: P(even)=3/6=½; P(prime)={2,3,5}/6=½; P(>4)={5,6}/6=⅓",
      "Habib Tanvir (1923–2009): Agra Bazaar, Charandas Chor; Padma Vibhushan; Chhattisgarhi folk theatre",
    ],
  },

  {
    day: 55,
    meta: { date: "25 Jun", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 8 Heredity Pt 2 – Sex determination (XX/XY; father determines); Evolution: Darwin's natural selection; homologous/analogous/vestigial organs; human evolution; speciation",
      },
      {
        subject: "Civics",
        topic:
          "Ch 4 Political Parties – Functions; National vs State parties (recognition criteria); Congress, BJP, BSP, CPM, NCP — founding year, ideology; Challenges: dynastic politics, money power, criminalisation",
      },
    ],
    test: "Sex determination diagram + homologous vs analogous with examples + 4 national parties with ideology",
    read: "5 terms: natural selection, homologous, analogous, vestigial, speciation",
    extra: [
      "Mother always gives X; father gives X (girl) or Y (boy)",
      "Homologous: same origin, different function (arm/wing/flipper) → divergent evolution",
      "Analogous: different origin, same function (butterfly wing, bat wing) → convergent evolution",
      "Vestigial: coccyx, appendix — evidence of evolution",
    ],
  },

  {
    day: 56,
    meta: { date: "26 Jun", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Ch 14 Probability Pt 2 – Complex problems; geometric probability; complementary events; past-year board questions; Ex 14.2",
      },
      {
        subject: "History",
        topic:
          "Ch 5 Print Culture – Indian vernacular press 19th c. (Sambad Kaumudi 1821, Kesari 1881); Women and print; caste and print (Phule); Vernacular Press Act 1878; print and nationalism",
      },
    ],
    test: "3 probability problems using complementary events + How did vernacular press help nationalism? 2 specific examples",
    read: "5 words: vernacular, censorship, nationalism, literacy, reform",
    extra: [
      "Complementary: P(at least 1 head in 3 flips) = 1–(1/2)³ = 7/8",
      "VPA 1878: Lytton; magistrates could seize press if 'seditious'",
      "Kesari (Marathi): Tilak 1881; 'Swaraj is my birthright and I shall have it'",
    ],
  },

  {
    day: 57,
    meta: { date: "27 Jun", dow: "Saturday", type: "holiday" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 9 Light Pt 1 – Reflection; Spherical mirrors: terms; mirror formula 1/v+1/u=1/f; sign convention; image formation by concave (6 cases) and convex (2 cases); magnification m=–v/u",
      },
      {
        subject: "Civics",
        topic:
          "Ch 5 Outcomes of Democracy – What do democracies deliver? Economic growth (mixed record); social differences and peace; dignity and freedom; why democracy despite limitations",
      },
    ],
    test: "Mirror numericals: find image position and nature for concave mirror + 3 outcomes of democracy in India with examples",
    read: "5 terms: focal length, magnification, virtual image, dignity, accountability",
    extra: [
      "Mirror sign convention: incident ray direction = positive. Object always negative (u<0).",
      "Concave: f<0; Convex: f>0. m>0=erect; m<0=inverted; |m|>1=magnified",
      "India: democratic elections since 1952; peaceful power transfers despite poverty and diversity",
    ],
  },

  {
    day: 58,
    meta: { date: "28 Jun", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION: Maths Ch 13 (mean 3 methods, median, mode, ogive) + Ch 14 (all probability types); Science Ch 8 (Mendel's laws, crosses, sex determination, evolution) + Ch 9 (mirror formula, all image cases)",
      },
      {
        subject: "English",
        topic:
          "REVISION: History Ch 5 Print Culture complete; Civics Ch 3–5; Hindi Sparsh Ch 13–14; English Ch 9 The Proposal; all SST dates and key facts",
      },
    ],
    test: "JUNE MONTH-END MOCK: 10 Maths + 10 Science + 10 SST + 5 English + 5 Hindi = 40 Qs (70 min)",
    read: "Error analysis. Prepare JULY PLAN. July = mastery + exam simulation. No new topics after Day 80.",
    extra: [
      "June completion: Maths Ch 6–14 ✓ | Science Ch 6–9 ✓ | History Ch 3–5 ✓ | Geography Ch 6–7 ✓ | Civics Ch 1–5 ✓ | English Ch 7–9 ✓ | Hindi Sparsh Ch 9–14 ✓",
      "Enter July with clear error log: top 5 weakest topics committed to mastery",
    ],
  },

  {
    day: 59,
    meta: { date: "29 Jun", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 9 Light Pt 2 – Refraction; Snell's Law; refractive index n=c/v=sin i/sin r; Lenses: convex/concave; lens formula 1/v–1/u=1/f; magnification m=v/u; Power P=1/f (Dioptre); image formation by convex (5 cases) and concave",
      },
      {
        subject: "English",
        topic:
          "First Flight Prose Ch 9: The Proposal (Chekhov) – farce comedy; Lomov vs Natalya (Oxen Meadows then dogs); Grammar: Active/Passive Voice all tenses + Reported Speech rules; 10+10 practice sentences",
      },
    ],
    test: "Lens numericals (position, nature, size) + 5 active → passive + 5 direct → indirect speech",
    read: "5 words: refraction, refractive index, lateral displacement, irony, farce",
    extra: [
      "Lens: f>0 convex; f<0 concave. Power P=1/f(m); convex P>0; concave P<0",
      "The Proposal: Chekhov satirises upper-class obsession with property; love secondary to land",
      "Passive voice: object becomes subject; is/am/are/was/were + V3",
    ],
  },

  {
    day: 60,
    meta: { date: "30 Jun", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "Ch 10 Human Eye – Structure; accommodation; defects: Myopia (concave), Hypermetropia (convex), Presbyopia (bifocal); Dispersion (prism, rainbow); Scattering (Tyndall effect, blue sky, red sunset)",
      },
      {
        subject: "Hindi",
        topic:
          "Sanchayan Ch 1: Harihar Kaka (Mithileshwar) – elderly man exploited by family AND temple mahant; property, loneliness, trust, exploitation of elderly; themes",
      },
    ],
    test: "Draw human eye + label 6 parts + explain accommodation + Why blue sky but red sunset? + Theme of Harihar Kaka",
    read: "5 terms: accommodation, scattering, dispersion, Tyndall effect, exploitation",
    extra: [
      "Myopia: image before retina; distant objects blurry → CONCAVE lens",
      "Hypermetropia: image behind retina; near objects blurry → CONVEX lens",
      "Blue sky: blue (short wavelength) scattered most. Red sunset: all scattered except red (longest wavelength)",
      "Harihar Kaka: childless old man; family neglects; mahant exploits → tragedy of property and old age",
    ],
  },

  // ════════════════════════════════════════════════════════════
  // JULY — MASTERY MONTH (Days 61–90)
  // ════════════════════════════════════════════════════════════

  // ── WEEK 1 (1 Jul Wed → 7 Jul Tue) · Revision: Day 65 Sun ──

  {
    day: 61,
    meta: { date: "1 Jul", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS DEEP REVISION – Ch 1 & 2: Reattempt NCERT exercises from scratch; 5 past-year CBSE board questions; common errors: irrational proof mistakes, wrong sign in zero-sum formula",
      },
      {
        subject: "Science",
        topic:
          "SCIENCE DEEP REVISION – Ch 1 & 2: Write all 6 reaction types + 2 examples each without notes; pH table; reattempt Ex 1–2; focus: corrosion, chlor-alkali, washing soda vs baking soda",
      },
    ],
    test: "3 past-year board Maths Ch1–2 + 3 past-year Science Ch1–2 (30 min)",
    read: "Error log review: compare today's errors with May error log — improvement?",
    extra: [
      "Board: Ch 1 usually 1 MCQ+1 VSA+1 SA (proof); 6 marks total",
      "Ch 2 Polynomials: usually 1 SA (find zeroes)+1 LA (division algorithm); 5 marks",
      "Science: wrong balancing = zero marks for that part",
      "July goal: every topic at confidence 8/10+",
    ],
  },

  {
    day: 62,
    meta: { date: "2 Jul", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS DEEP REVISION – Ch 3: Reattempt all 4 methods timed; 5 word problems from past-year boards; common errors: wrong sign when eliminating, not verifying",
      },
      {
        subject: "History",
        topic:
          "SST DEEP REVISION – History Ch 1 & 2: 1-page timeline per chapter; key names + what they did; past-year board Qs: Jallianwala, NCM, Dandi March",
      },
    ],
    test: "2 word problems for linear equations + 4 short-answer SST History Ch 1–2 (25 min)",
    read: "Prepare 1-page formula sheet for Maths Ch 1–5 (all formulas, no derivations)",
    extra: [
      "Always write 'Let x = ... and y = ...' before forming word problem equations",
      "Mazzini: 'Young Italy'; Garibaldi: Red Shirts; Bismarck: political unification Germany 1871",
      "History tip: CBSE often asks causes+effects in 3-mark format — practise this structure",
    ],
  },

  {
    day: 63,
    meta: { date: "3 Jul", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS DEEP REVISION – Ch 4 & 5: All 3 quadratic methods; discriminant; AP nth term + sum + 5 word problems; Board pattern: Quadratic 4 marks; AP 3 marks",
      },
      {
        subject: "Science",
        topic:
          "SCIENCE DEEP REVISION – Ch 3 & 4: Reactivity series (write twice); Ionic bonds; IUPAC 10 compounds; Soap micelle; Past-year boards: extraction, corrosion, ethanol vs ethanoic acid",
      },
    ],
    test: "2 quadratic + 2 AP + 2 Science (reactivity application + IUPAC) — 20 min",
    read: "5 past-year board questions from Maths Ch 4–5 — solve and check",
    extra: [
      "Quadratic word problem: note whether age NOW or N years ago — common trap",
      "AP trick: if Sn=3n²+5n then a₁=S₁=8; d=S₂–2S₁",
      "Carbon IUPAC suffix: ane/ene/yne/ol/al/oic acid/one",
    ],
  },

  {
    day: 64,
    meta: { date: "4 Jul", dow: "Saturday", type: "holiday" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS DEEP REVISION – Ch 6 & 7: BPT proof + 3 applications; similarity criteria + 3 examples; Pythagoras + 3 applications; Coord Geom 6 mixed problems",
      },
      {
        subject: "Geography",
        topic:
          "SST DEEP REVISION – Geography Ch 1–7: summary table (Chapter|Key topic|Key facts|Map items); India map practice: iron ore, coal, cotton textile, major ports, rivers (5 marks in boards)",
      },
    ],
    test: "1 Triangle proof + 2 Coord Geom problems + 5 map questions (blank India map)",
    read: "India map: 5 items per category (minerals, crops, industries, ports) — mark on blank map then verify",
    extra: [
      "Board map question: 5 marks; practice at least 20 items total from Geography NCERT",
      "Triangle exam: always write similarity criterion used (AA/SAS/SSS) as final step",
      "Coord Geom: area of quadrilateral = 2 triangles added",
    ],
  },

  {
    day: 65,
    meta: { date: "5 Jul", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION – Maths Full Sweep Ch 1–9: one problem from each chapter (9 problems); 2 min to pick, 5 min to solve each; then Ch 10–14 rapid sweep",
      },
      {
        subject: "Science",
        topic:
          "REVISION – Science Full Sweep Ch 1–8: one page of notes per chapter; write photosynthesis + respiration equations; draw neuron + reflex arc; monohybrid cross Punnett",
      },
    ],
    test: "JULY WEEK 1 MOCK: 15 Maths + 15 Science = 30 Qs in 50 min",
    read: "Error analysis: WHY wrong? Formula error? Concept unclear? Careless? Different categories need different remedies.",
    extra: [
      "Trig standard values: sin 0=0; 30=½; 45=1/√2; 60=√3/2; 90=1 — test in 90 seconds",
      "38 ATP aerobic; 2 ATP anaerobic — boards always asks this",
      "Score target: 27+/30",
    ],
  },

  // ── WEEK 2 (6 Jul Mon → 12 Jul Sun) · Mock: Day 71 Sat, Revision: Day 72 Sun ──

  {
    day: 66,
    meta: { date: "6 Jul", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS DEEP REVISION – Ch 8 & 9: Trig table from memory (2 min target); prove 2 identities; 3 height & distance problems with full diagrams; Board: Trig 7–8 marks; Applications 4 marks",
      },
      {
        subject: "History",
        topic:
          "SST DEEP REVISION – History Ch 3–5: table format dates/events; important names: Gutenberg, Luther, Ram Mohan Roy, Tilak, Phule; past-year board questions; 3-mark + 5-mark answer practice",
      },
    ],
    test: "3 trig problems + 1 application problem + 4 History short answers Ch 3–5 — 25 min",
    read: "Write model 3-mark answers for 3 SST questions — structure: intro + 2 points + conclusion",
    extra: [
      "Height & distance: label h, d, θ before writing equation; tan θ = opp/adj is most used formula",
      "SST 3-mark: 3 distinct points in 3 separate sentences; 5-mark: intro+4 points+conclusion",
      "Print Culture: Gutenberg(1440s)→Luther(1517)→India press(1556 Goa,1820s vernacular) — timeline",
    ],
  },

  {
    day: 67,
    meta: { date: "7 Jul", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS DEEP REVISION – Ch 10 & 11: Both tangent proofs once; 3 tangent problems; 4 area problems (sector+segment+combination); Board: Circles 3+3 marks; Areas 4 marks",
      },
      {
        subject: "Science",
        topic:
          "SCIENCE DEEP REVISION – Ch 5 & 6: Photosynthesis eq + leaf cross-section; Respiration aerobic vs anaerobic table; Draw heart (4 chambers + valves + blood flow); Nephron diagram; Neuron diagram; Reflex arc; Brain 3 regions + functions; Hormone table (6 glands)",
      },
    ],
    test: "1 tangent proof + 2 area problems + Draw and label heart (chambers, valves, blood flow direction) + 4 hormones and functions — 25 min",
    read: "Draw from memory: (1) heart, (2) nephron, (3) neuron, (4) reflex arc — board exam gold",
    extra: [
      "Area combination: draw clearly first; identify what to ADD vs SUBTRACT",
      "Heart: RA, LA (receive); RV, LV (pump). Valves: bicuspid (LA-LV), tricuspid (RA-RV)",
      "Nephron order: Bowman's capsule → PCT → Loop of Henle → DCT → Collecting duct",
    ],
  },

  {
    day: 68,
    meta: { date: "8 Jul", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS DEEP REVISION – Ch 12, 13, 14: 2 frustum problems; Statistics: mean+median+mode for same dataset (compare); 3 probability problems; Board: Surface Area 4 marks; Stats 3–4 marks; Probability 3 marks",
      },
      {
        subject: "Civics",
        topic:
          "SST DEEP REVISION – Civics Ch 1–5: 1-page summary per chapter; past-year boards; focus: Belgium model, 73rd/74th Amendment, communalism, political party functions",
      },
    ],
    test: "1 frustum + 1 statistics + 1 probability + 3 Civics short answers — 25 min",
    read: "Write model 5-mark answer: 'How does federalism help India manage its diversity?'",
    extra: [
      "Stats: mean≈mode≈median for symmetric; mode=3median–2mean (empirical, skewed)",
      "Probability: P(at least 1) = 1–P(none); always easier",
      "Civics: always mention India-specific examples alongside Belgium/Sri Lanka",
    ],
  },

  {
    day: 69,
    meta: { date: "9 Jul", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "SCIENCE DEEP REVISION – Ch 7 & 8: Reproduction: asexual table; flower diagram; double fertilisation; human system draw+label; Heredity: monohybrid + dihybrid Punnett squares; sex determination; Darwin, homologous/analogous/vestigial",
      },
      {
        subject: "Hindi",
        topic:
          "HINDI DEEP REVISION – Sparsh all 14 chapters: author-era-genre-theme table; 3-line summary per Kavya chapter; per Gadya chapter; poetic devices: Anupras, Rupak, Upama, Utpreksha, Yamak — 1 example each; Grammar: Samas 6 types, Sandhi, Muhavare, Lokoktiyan",
      },
    ],
    test: "Dihybrid cross F1 & F2 with Punnett square + How does natural selection lead to speciation? + Match 5 Sparsh authors to works — 25 min",
    read: "Hindi grammar: Samas 6 types with 2 examples each (Avyayibhav, Tatpurusha, Karmadharaya, Dvandva, Bahuvrihi, Dvighu)",
    extra: [
      "Dihybrid F2: 9 round yellow:3 round green:3 wrinkled yellow:1 wrinkled green = 9:3:3:1",
      "Samas tip: learn both directions — vigraha→type AND word→vigraha+type",
      "Anupras=alliteration; Yamak=same word diff meaning; Utpreksha=fancy/imagination (janu/manau)",
    ],
  },

  {
    day: 70,
    meta: { date: "10 Jul", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "Science",
        topic:
          "SCIENCE DEEP REVISION – Ch 9 & 10: 5 mirror + 5 lens numericals; Power of combination of lenses; Ray diagrams: concave mirror (6 positions), convex lens (5 positions); Eye defects + correction diagrams; Tyndall + blue sky + red sunset",
      },
      {
        subject: "English",
        topic:
          "ENGLISH DEEP REVISION – First Flight Prose Ch 1–9 + Poems Ch 1–9: author/character/theme/device for each; Footprints summaries; Grammar: Active/Passive, Direct/Indirect; Writing: article on 'Technology in Education' (200 words)",
      },
    ],
    test: "2 mirror + 2 lens numericals + 1 scattering explanation + English 2 grammar + 1 prose summary — 25 min",
    read: "English writing: 1 article (200 words) — title+intro+3 points+conclusion. Practise structure.",
    extra: [
      "Mirror: 1/f=1/v+1/u; Lens: 1/f=1/v–1/u; sign convention = KEY",
      "Power: P=1/f(metres); combined=P₁+P₂; units=Dioptre (D)",
      "English prose tip: always mention theme; answer must refer to text",
    ],
  },

  {
    day: 71,
    meta: { date: "11 Jul", dow: "Saturday", type: "mock", isMock: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "FULL MOCK TEST — MATHEMATICS (80 marks, 3 hours): All 14 chapters; Sections A MCQ + B VSA + C SA + D LA + E Case Study; Strictly timed; No help; Simulate exact board exam",
      },
      {
        subject: "Science",
        topic:
          "FULL MOCK TEST — SCIENCE (80 marks, 3 hours): Ch 1–10; All sections; Strictly timed",
      },
    ],
    test: "Self-evaluate: mark your own paper. Calculate marks. Which sections cost most?",
    read: "Analysis: marks lost in MCQ? Short answers? Diagrams? Proofs? Numericals? Specific breakdown.",
    extra: [
      "Target: Maths 65+/80; Science 65+/80",
      "Board pattern: 20×1=20; 5×2=10; 6×3=18; 4×5=20; 3×4=12; Total=80",
      "Time: MCQ 20min; VSA 10min; SA 30min; LA 50min; Case Study 20min; Check 10min",
    ],
  },

  {
    day: 72,
    meta: { date: "12 Jul", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "REVISION – Maths Mock Analysis: review every wrong Maths answer; categorise: (A) Formula/concept error → re-study, (B) Calculation error → be careful, (C) Reading error → read carefully; redo all wrong Qs; focus on 2 weakest chapters",
      },
      {
        subject: "Science",
        topic:
          "REVISION – Science Mock Analysis + SST: review Science mock; redo wrong Qs; SST revision: all 17 chapters 1-line key facts; India map practice: 25 items (minerals, crops, industries, ports, rivers) from memory",
      },
    ],
    test: "Targeted test: only topics where you scored below 50% in mock — 20 questions in 30 min",
    read: "Prepare 'Last 10 days formula sheet': 1 page each Maths + Science + SST — personal exam crib",
    extra: [
      "Mock analysis = as important as the mock itself",
      "Science diagrams: redraw any wrong diagram; you WILL be asked to draw in boards",
      "Score target next mock: Maths 70+/80; Science 70+/80",
    ],
  },

  // ── WEEK 3 (13 Jul Mon → 19 Jul Sun) · Mock: Day 78 Sat, Revision: Day 79 Sun ──

  {
    day: 73,
    meta: { date: "13 Jul", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "English",
        topic:
          "ENGLISH DEEP REVISION – Reading Comprehension: 3 passages (factual + discursive + literary); Technique: skim → read questions → read carefully → answer in own words; Editing/Omission exercises (10 sentences each); Gap filling",
      },
      {
        subject: "Hindi",
        topic:
          "HINDI DEEP REVISION – Sanchayan: (1) Harihar Kaka – themes, characters, ending; (2) Sapnon ke se Din (Gurdyal Singh) – school life, friendship, nostalgia; (3) Topi Shukla – Hindu-Muslim friendship (Topi+Ifan); identity; social pressures",
      },
    ],
    test: "1 unseen comprehension passage (5 questions) + 5 editing sentences + Hindi: 5-sentence summary of Topi Shukla — 25 min",
    read: "Comprehension tip: answers always in passage — paraphrase, don't copy. Practise 1 more passage.",
    extra: [
      "Unseen types: (1) Factual (find info), (2) Inferential (read between lines), (3) Vocabulary (meaning from context)",
      "Sapnon ke se Din: Punjabi writer Gurdyal Singh; 1950s school; football, friends, nostalgia",
      "Topi Shukla (Rahi Masoom Raza): 1950s UP; Topi (Hindu) + Ifan (Muslim) best friends; partition scars",
    ],
  },

  {
    day: 74,
    meta: { date: "14 Jul", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS FINAL REVISION – Ch 1–5: 2 problems per chapter (10 total) timed; Ch 1: 6 min; Ch 2: 8 min; Ch 3: 10 min; Ch 4: 8 min; Ch 5: 6 min; Total 38 min; Build speed",
      },
      {
        subject: "Science",
        topic:
          "SCIENCE FINAL REVISION – Ch 1–5: 1 per chapter type: balance equation; pH+salt; reactivity+extraction; IUPAC+ethanol; photosynthesis+respiration+nephron; 5 questions × 8 min = 40 min",
      },
    ],
    test: "Speed drill: 10 Maths (Ch 1–5) + 10 Science (Ch 1–5) = 20 questions in 30 min (90 sec each)",
    read: "Self-check without notes: (1) FTA with example, (2) Reactivity series, (3) IUPAC suffix table, (4) AP formulas, (5) Photosynthesis equation. Score 1 point each.",
    extra: [
      "Board: 180 min for 38–40 Qs = ~4.5 min average; many easy ones leave time for harder",
      "FTA: unique prime factorisation for every integer >1. HCF×LCM = product (only for 2 numbers)",
      "Photosynthesis: 6CO₂+6H₂O+light→C₆H₁₂O₆+6O₂ — reactants/products must be exactly right",
    ],
  },

  {
    day: 75,
    meta: { date: "15 Jul", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS FINAL REVISION – Ch 6–10: 2 problems each; Ch 6 (BPT/Pythagoras); Ch 7 (coord mixed); Ch 8 (identity proof + standard values); Ch 9 (height/distance); Ch 10 (tangent problem); 10 problems timed 38 min; Diagrams for every geometry",
      },
      {
        subject: "Geography",
        topic:
          "SST DEEP REVISION – Geography final Ch 1–7 + maps; mark on blank India map: Jharia coal, KGF gold, Singhbhum copper, Punjab wheat, West Bengal rice, Jamshedpur steel, Ahmedabad textile, Mumbai port, Chennai port, Kandla port",
      },
    ],
    test: "1 BPT problem + 1 height & distance + 1 trig identity + 5 items on blank India map — 25 min",
    read: "India map self-test: 10 items without NCERT map, then verify",
    extra: [
      "Geometry: label ALL given info on diagram BEFORE writing equations",
      "BPT: AD/DB=AE/EC AND DE∥BC — both conditions together",
      "Geography: Jharkhand=iron+coal; Rajasthan=zinc+lead; Karnataka=gold+manganese; Gujarat=salt+petroleum",
    ],
  },

  {
    day: 76,
    meta: { date: "16 Jul", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS FINAL REVISION – Ch 11–14: 2 problems each; Ch 11 (area combination); Ch 12 (combination+frustum); Ch 13 (mean+median+mode same dataset); Ch 14 (2 probability types); 8 problems timed 35 min",
      },
      {
        subject: "Science",
        topic:
          "SCIENCE FINAL REVISION – Ch 6–10: Draw and label: neuron (6 parts), reflex arc (5 steps), heart (4 chambers + blood path), nephron (5 parts), human eye (6 parts); Ch 8: Punnett square monohybrid; Ch 9: concave mirror ray diagram",
      },
    ],
    test: "1 frustum + statistics mean+median+mode + 2 probability + draw 2 diagrams from memory — 25 min",
    read: "Diagrams test: draw all 5 biology diagrams WITHOUT notes. Assess accuracy.",
    extra: [
      "Statistics: mean uses ALL data; median uses middle; mode uses most frequent. Mean=mode=median for symmetric.",
      "Probability: P(at least 1)=1–P(none) always easier. Geometric: P=favourable area/total area",
      "Biology diagrams: partial sketch with accurate labels still earns partial marks in boards",
    ],
  },

  {
    day: 77,
    meta: { date: "17 Jul", dow: "Friday", type: "school" },
    topics: [
      {
        subject: "English",
        topic:
          "ENGLISH FINAL: Article writing (2: formal+personal); Letter to editor; Diary entry; Notice writing; Grammar: 10 gap-fill + 5 editing + 5 rearranging; 1 unseen passage",
      },
      {
        subject: "Hindi",
        topic:
          "HINDI FINAL: Grammar — Samas (6 types), Sandhi (5 ex), Alankar (5 types from poems); Nibandh on 'Vigyan ke Chamatkar' (150 words); Civics Ch 1–5: model answers for 5 key questions",
      },
    ],
    test: "Write formal English letter (editor, water scarcity) + Hindi paragraph 150 words + 3 Civics short answers — 37 min",
    read: "Board writing tips: Article = title+3 paragraphs+word count. Letter = all 6 parts. Diary = date+day+emotional tone.",
    extra: [
      "Article format: catchy title | opening stat or question | 2–3 paragraphs | concluding thought | word count",
      "Formal letter to editor: start body with 'I am writing to...'; end with 'I hope you will...'",
      "Hindi Nibandh: bhumika + mool vishay (2 para) + upsanhar; use formal Hindi vocabulary",
    ],
  },

  {
    day: 78,
    meta: { date: "18 Jul", dow: "Saturday", type: "mock", isMock: true },
    topics: [
      {
        subject: "SST",
        topic:
          "FULL MOCK TEST — SOCIAL SCIENCE (80 marks, 3 hours): History Ch 1–5 + Geography Ch 1–7 + Civics Ch 1–5; All sections including Map Question (5 marks); Strictly timed",
      },
      {
        subject: "English",
        topic:
          "FULL MOCK TEST — ENGLISH (80 marks, 3 hrs): Reading+Writing+Grammar+Literature; HINDI MOCK (80 marks, 3 hrs): Reading+Writing+Grammar+Literature (Sparsh+Sanchayan)",
      },
    ],
    test: "Self-evaluate BOTH papers. SST target: 65+/80. English: 65+/80. Hindi: 65+/80.",
    read: "Analysis: Which section lost most marks? Writing? Grammar? Literature? Maps? Focus last 10 days there.",
    extra: [
      "SST map: 5 marks; lose all 5 = 6.25% of score — unacceptable; practise maps DAILY",
      "English literature: answer must refer to the text; always paraphrase from chapter",
      "Hindi Samas: 3–4 marks; all 6 types learnable at last minute — do it now",
      "Footprints: all 10 chapters asked in boards; ensure you've read them all",
    ],
  },

  {
    day: 79,
    meta: { date: "19 Jul", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "SST",
        topic:
          "REVISION – All 3 Mock Papers Analysis: SST redo wrong Qs + map practice; English redo grammar + rewrite weak answers; Hindi redo grammar + rewrite weak prose; reduce each paper's error count by 50%",
      },
      {
        subject: "Mathematics",
        topic:
          "REVISION – Maths + Science Quick Check: 20-min Maths speed test (10 questions all chapters); 20-min Science speed test (10 questions all chapters); maintain sharpness while language papers get focus",
      },
    ],
    test: "Combined mini-mock: 5 Maths + 5 Science + 5 SST + 5 English + 5 Hindi = 25 Qs in 40 min",
    read: "Finalize formula sheet and error log. 9 days left. Plan daily: which topics each day. No surprises.",
    extra: [
      "9 days left: quality > quantity. Targeted revision beats random reading.",
      "Focus: top 2 weak areas per subject × 6 subjects = 12 targets. 15 extra min each this week.",
      "Sleep, food, physical activity matter — brain must be sharp on exam day",
      "Score target final mock Day 84: Maths 72+; Science 72+; SST 68+; English 68+; Hindi 65+",
    ],
  },

  // ── WEEK 4 (20 Jul Mon → 28 Jul Tue) · Final Mock: Day 84 Fri ──

  {
    day: 80,
    meta: { date: "20 Jul", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS FINAL – Weak chapter deep-dive; Triangle area theorem (often skipped); frustum (tricky formula); ogive construction; CBSE 2025 sample paper under timed conditions",
      },
      {
        subject: "Science",
        topic:
          "SCIENCE FINAL – Ch 9 Light complete notes: mirrors, lenses, formulae, all ray diagrams; Ch 10 Human Eye full; CBSE 2025 sample paper Science timed",
      },
    ],
    test: "5 from CBSE sample Maths + 5 from CBSE sample Science (questions you got wrong in mock)",
    read: "NCERT examples: re-read all worked examples Ch 8–14. CBSE often lifts questions directly.",
    extra: [
      "NCERT examples = highest priority: CBSE paper setters use them directly — solve ALL examples Ch 8–14",
      "Ogive: median = x-coordinate where less-than and more-than ogives intersect",
      "Human eye: always draw diagram before explaining defects",
    ],
  },

  {
    day: 81,
    meta: { date: "21 Jul", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "History",
        topic:
          "SST FINAL – History Ch 3, 4, 5: quick read; 5 key points per chapter; map: 5 History-related items",
      },
      {
        subject: "English",
        topic:
          "ENGLISH FINAL – Footprints 10 chapters: key themes; Grammar final drill: 10 min each (active/passive, direct/indirect, editing); HINDI FINAL – Sparsh poetry Ch 1–7 with devices; Prose Ch 8–14 themes; all grammar types",
      },
    ],
    test: "3 SST questions (one each from History Ch 3,4,5) + English grammar drill (10 sentences) + Hindi poem analysis (2 Qs) — 25 min",
    read: "Footprints summaries: Ch 1 Bholi, Ch 3 Midnight Visitor, Ch 4 Miracle — author + theme + key event",
    extra: [
      "Footprints Ch 1 Bholi: education transforms disabled girl; refuses dowry marriage — empowerment",
      "Footprints Ch 3 Midnight Visitor: Ausable spy; suspense + wit",
      "CBSE value-based questions: answer in chapter context + personal opinion 1–2 lines",
    ],
  },

  {
    day: 82,
    meta: { date: "22 Jul", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "MATHS INTENSIVE DRILL – Most-tested CBSE Qs (last 10 years): (1) Polynomial division+zeroes, (2) Quadratic word problem, (3) Triangle proof (BPT/Pythagoras), (4) Statistics (median), (5) Probability (deck of cards); one of each in 35 min",
      },
      {
        subject: "Science",
        topic:
          "SCIENCE INTENSIVE DRILL – Most-tested CBSE Qs: (1) Balance equation+identify type, (2) Reactivity+extraction, (3) IUPAC+ethanol/ethanoic acid, (4) Photosynthesis+respiration, (5) Heredity monohybrid cross; one of each in 35 min",
      },
    ],
    test: "5 most-tested Maths + 5 most-tested Science = 10 Qs in 35 min. Target: 9/10+",
    read: "NCERT chapter-end questions: redo all chapter-end exercises for Maths Ch 1–4",
    extra: [
      "Board exam: write every step clearly — even if final answer wrong, stepwise marks given",
      "Diagrams: label neatly; partial diagrams with labels = partial marks",
      "Science: units always matter — write grams, metres, joules, watts, dioptre",
    ],
  },

  {
    day: 83,
    meta: { date: "23 Jul", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Civics",
        topic:
          "SST FINAL INTENSIVE – Geography: map practice (final); Civics: all 5 chapters, 1-line definitions for every bold NCERT term; History: answer bank — 6 important 3-mark Qs + model answers (40 words each)",
      },
      {
        subject: "English",
        topic:
          "ENGLISH FINAL – Writing intensive: 1 article (200 words) + 1 formal letter + 1 diary entry in 45 min; HINDI FINAL – 1 Nibandh (Pradushan ki Samasya, 200 words) + 1 formal Patra; Grammar: 10 Samas practice",
      },
    ],
    test: "Formal English letter (10 min) + Hindi Nibandh (15 min) + 3 SST Civics short answers (12 min) — 37 min",
    read: "CBSE marking scheme: 3-mark = 3 distinct points; 5-mark = intro(1)+3 points(3)+conclusion(1). Memorise this.",
    extra: [
      "English letter: 'I am writing to...'; end 'I hope you will take cognizance...'",
      "Hindi patra: left side = praishak ka pata; vishay; sambodhan (Mahoday); iti; naam",
      "SST answer bank: 5 most likely 5-mark questions per subject; write and memorise structure",
      "3 days to final mock: keep revising, stay rested",
    ],
  },

  {
    day: 84,
    meta: { date: "24 Jul", dow: "Friday", type: "mock", isMock: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "FINAL COMPREHENSIVE MOCK — MATHEMATICS (80 marks, 3 hours): All 14 chapters; Full CBSE 2025 pattern; No breaks; Simulate exact exam conditions (no phone, no notes, silent room)",
      },
      {
        subject: "SST",
        topic:
          "FINAL COMPREHENSIVE MOCK — SST (80 marks, 3 hrs) + ENGLISH (80 marks) + HINDI (80 marks); All chapters; Map question included",
      },
    ],
    test: "Complete self-evaluation of all papers tonight. Compare to Day 71 mock scores.",
    read: "Final analysis: Maths/Science 72+, SST 68+, English/Hindi 65+ → excellent. Last 4 days = only remaining gaps.",
    extra: [
      "Score trend: Day 10: 20/25 → Day 44: 23/25 → Day 71: 65/80 → Day 84: 72/80 target",
      "Last 4 days: NO new topics. Only revision, formula sheet, diagrams, past papers.",
      "Sleep 8 hours from tonight. Eat well. Light exercise.",
    ],
  },

  {
    day: 85,
    meta: { date: "25 Jul", dow: "Saturday", type: "holiday" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Final Mock Analysis + Maths Weak Spots: analyse Day 84 mock; rework every wrong Maths question; identify 3 chapters that lost most marks; spend 90 minutes on ONLY those 3 chapters",
      },
      {
        subject: "Science",
        topic:
          "Final Mock Analysis + Science Weak Spots: identify weakest 2–3 Science chapters; revise only those; draw all key diagrams from memory: heart, nephron, neuron, eye, reflex arc",
      },
    ],
    test: "Micro-test: 5 Maths from weakest chapter + 5 Science from weakest chapter — 20 min. Target: 8/10+",
    read: "Formula sheet final: 1 page Maths (all formulas) + 1 page Science (equations, reactivity, ATP, hormone table). Your exam morning review sheets.",
    extra: [
      "Day before exam: review formula sheets; eat well; sleep by 10 PM",
      "Exam morning: formula sheets 15 min only → breakfast → leave early → arrive 30 min before",
      "During exam: read all questions first (2 min); start with what you know best; come back to blanks",
    ],
  },

  {
    day: 86,
    meta: { date: "26 Jul", dow: "Sunday", type: "rev", isRev: true },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "FINAL LIGHT REVISION – Maths: flip through formula sheet; redo 3 favourite problems per chapter (no new problems); Science: read NCERT chapter summaries only; definitions, equations, key names; NO long problems",
      },
      {
        subject: "SST",
        topic:
          "FINAL LIGHT REVISION – SST: chapter headings, subheadings, bold terms only; Map: 1 final practice; English: themes list for all 9 prose + 9 poems + grammar 5 sentences each; Hindi: authors + themes table; Samas 6 types",
      },
    ],
    test: "Mini test: 5 questions across all subjects = 5 min. Just a warm-up, not evaluation.",
    read: "Prepare exam kit: pens (3), pencils, ruler, eraser, admit card, ID. Check exam centre. Sleep by 9:30 PM.",
    extra: [
      "Today is NOT intense study — it's calm consolidation. Overworking before exam reduces performance.",
      "Light revision + rest = optimal performance. Trust the 86 days of work.",
      "Stay hydrated. Eat simple, nutritious food. Light walk/exercise in evening.",
    ],
  },

  {
    day: 87,
    meta: { date: "27 Jul", dow: "Monday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "PRE-EXAM DAY – Mathematics: 30 MINUTES ONLY: read formula sheet once; redo 2–3 problems you always get right (confidence builders); check: trig table, AP formulas, probability rules; STOP after 30 min; REST",
      },
      {
        subject: "Science",
        topic:
          "PRE-EXAM DAY – Science: 30 MINUTES ONLY: read: balanced equations (6 types), reactivity series, photosynthesis/respiration equations, hormone table, eye defects; draw 1 diagram of your choice; STOP; REST",
      },
    ],
    test: "NO TEST TODAY. You are ready. Relax.",
    read: "Read something enjoyable for 20 min — fiction, comics, anything non-academic. Rest your brain.",
    extra: [
      "Sleep is revision. Brain consolidates during sleep. 8 hours tonight = better recall tomorrow.",
      "Exam morning: wake early → light exercise → formula sheet 15 min only → breakfast → leave early",
      "At exam hall: fill header carefully, read instructions, 2 deep breaths, begin.",
      "You have studied for 87 days. You know this. You've got this. 🎯",
    ],
  },

  {
    day: 88,
    meta: { date: "28 Jul", dow: "Tuesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "EXAM DAY — You Are Ready! 🎯 This is what 88 days of preparation built toward. Walk in with confidence. You have covered every NCERT chapter, solved hundreds of problems, drawn every diagram, written model answers. Your preparation is complete.",
      },
      {
        subject: "Science",
        topic:
          "During the Exam — Strategy: (1) Read paper fully in first 3 min; (2) Start with strongest section; (3) Show all steps in Maths; (4) Label all diagrams; (5) Attempt all questions; (6) Review in last 10 min",
      },
    ],
    test: "Post-exam: do NOT discuss answers with friends — causes unnecessary anxiety. Trust your preparation.",
    read: "Celebrate! 88 days of dedicated study deserves acknowledgment. Treat yourself tonight.",
    extra: [
      "✅ Maths: 14 chapters ALL COVERED",
      "✅ Science: 10 chapters ALL COVERED",
      "✅ History: 5 chapters ALL COVERED",
      "✅ Geography: 7 chapters ALL COVERED",
      "✅ Civics: 5 chapters ALL COVERED",
      "✅ English: First Flight + Footprints + Grammar ALL COVERED",
      "✅ Hindi: Sparsh Ch 1–14 + Sanchayan + Grammar ALL COVERED",
      "🌟 90-DAY JOURNEY COMPLETE. NCERT 100% COVERAGE. BEST OF LUCK! 🌟",
    ],
  },

  {
    day: 89,
    meta: { date: "29 Jul", dow: "Wednesday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "Post-Exam Recovery + Reflection: rest day; review exam paper lightly (not obsessively); note confident vs uncertain topics — valuable feedback; read something enjoyable",
      },
      {
        subject: "Science",
        topic:
          "What's Next? Plan for remaining subjects; Class 11 stream choice; begin thinking about subjects of interest; the study habits you've built — carry them forward",
      },
    ],
    test: "Self-reflection: rate performance on each day of 90-day plan (1–5 stars). What worked? What would you do differently?",
    read: "Celebrate your discipline: 89 days of consistent study is an extraordinary achievement.",
    extra: [
      "The habits you built — daily study, error logs, revision schedules — will serve you your entire life",
      "Discipline is the bridge between goals and achievement. You crossed that bridge.",
    ],
  },

  {
    day: 90,
    meta: { date: "30 Jul", dow: "Thursday", type: "school" },
    topics: [
      {
        subject: "Mathematics",
        topic:
          "🏆 Day 90 — Journey Complete: 90 days; 6 subjects; 14 Maths + 10 Science + 5 History + 7 Geography + 5 Civics + 9 English prose + 9 Poems + 14 Sparsh + 3 Sanchayan chapters; hundreds of practice problems; multiple mocks. You did it.",
      },
      {
        subject: "Science",
        topic:
          "The Real Achievement: the exam result is important — but the real achievement is the 90 days of discipline, consistency, and courage to show up every day even when it was hard.",
      },
    ],
    test: "No test. Just gratitude and rest.",
    read: "Write 3 things you learned about YOURSELF (not just subjects) during these 90 days. Keep that paper.",
    extra: [
      "🎓 90 DAYS COMPLETE — CBSE CLASS X FULL SYLLABUS COVERED",
      "📚 Total chapters: Maths 14 + Science 10 + History 5 + Geography 7 + Civics 5 + English 18 + Hindi 17 = 76 chapters",
      "🔬 ~18 comprehensive mock evaluations throughout the plan",
      "⚡ ~500+ practice problems across all subjects",
      "🌟 Best of luck in your results. Now go build something great.",
    ],
  },
];