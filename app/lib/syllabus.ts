/* 
  StudyMate – Locked Syllabus Authority
  Class: 9
  Source: User-provided NCERT books (PDFs + photos)
  Secondary Reference: Official NCERT / CBSE syllabus (clarification only)

  CORE PHILOSOPHY:
  - Keep student focused strictly on studies
  - Prevent distraction, trivia, or non-academic content
  - Enforce NCERT / CBSE boundary at all times
*/

export const syllabus = {
  class: 9,

  subjects: {
    science: {
      name: "Science",
      chapters: [
        { number: 1, name: "Matter in Our Surroundings" },
        { number: 2, name: "Is Matter Around Us Pure?" },
        { number: 3, name: "Atoms and Molecules" },
        { number: 4, name: "Structure of the Atom" },
        { number: 5, name: "The Fundamental Unit of Life" },
        { number: 6, name: "Tissues" },
        { number: 7, name: "Motion" },
        { number: 8, name: "Force and Laws of Motion" },
        { number: 9, name: "Gravitation" },
        { number: 10, name: "Work and Energy" },
        { number: 11, name: "Sound" },
        { number: 12, name: "Improvement in Food Resources" }
      ]
    },

    mathematics: {
      name: "Mathematics",
      chapters: [
        { number: 1, name: "Number Systems" },
        { number: 2, name: "Polynomials" },
        { number: 3, name: "Coordinate Geometry" },
        { number: 4, name: "Linear Equations in Two Variables" },
        { number: 5, name: "Introduction to Euclid’s Geometry" },
        { number: 6, name: "Lines and Angles" },
        { number: 7, name: "Triangles" },
        { number: 8, name: "Quadrilaterals" },
        { number: 9, name: "Areas of Parallelograms and Triangles" },
        { number: 10, name: "Circles" },
        { number: 11, name: "Constructions" },
        { number: 12, name: "Heron’s Formula" },
        { number: 13, name: "Surface Areas and Volumes" },
        { number: 14, name: "Statistics" },
        { number: 15, name: "Probability" }
      ]
    },

    social_science: {
      name: "Social Science",

      history: {
        name: "History",
        chapters: [
          { number: 1, name: "The French Revolution" },
          { number: 2, name: "Socialism in Europe and the Russian Revolution" },
          { number: 3, name: "Nazism and the Rise of Hitler" },
          { number: 4, name: "Forest Society and Colonialism" },
          { number: 5, name: "Pastoralists in the Modern World" }
        ],
        map_work: true
      },

      geography: {
        name: "Geography – Contemporary India I",
        chapters: [
          { number: 1, name: "India – Size and Location" },
          { number: 2, name: "Physical Features of India" },
          { number: 3, name: "Drainage" },
          { number: 4, name: "Climate" },
          { number: 5, name: "Natural Vegetation and Wildlife" },
          { number: 6, name: "Population" }
        ],
        map_work: true
      },

      civics: {
        name: "Civics – Democratic Politics I",
        chapters: [
          { number: 1, name: "What is Democracy? Why Democracy?" },
          { number: 2, name: "Constitutional Design" },
          { number: 3, name: "Electoral Politics" },
          { number: 4, name: "Working of Institutions" },
          { number: 5, name: "Democratic Rights" }
        ]
      },

      economics: {
        name: "Economics",
        chapters: [
          { number: 1, name: "The Story of Village Palampur" },
          { number: 2, name: "People as Resource" },
          { number: 3, name: "Poverty as a Challenge" },
          { number: 4, name: "Food Security in India" }
        ]
      }
    },

    english: {
      name: "English – Beehive",
      sections: {
        fiction: [
          "How I Taught My Grandmother to Read",
          "A Dog Named Duke",
          "The Man Who Knew Too Much",
          "Keeping It from Harold",
          "Best Seller"
        ],
        poetry: [
          "The Brook",
          "The Road Not Taken",
          "The Solitary Reaper",
          "The Seven Ages",
          "Oh, I Wish I'd Looked After Me Teeth",
          "Song of the Rain"
        ],
        drama: [
          "Villa for Sale",
          "The Bishop’s Candlesticks"
        ]
      }
    },

    hindi: {
      name: "Hindi",
      sections: {
        prose_poetry: [
          "गिल्लू",
          "स्मृति",
          "कल्लू कुम्हार की उनाकोटी",
          "मेरा छोटा-सा निजी पुस्तकालय",
          "हामिद खाँ",
          "दिए जल उठे"
        ],
        grammar: [
          "अपठित गद्यांश",
          "शब्द और पद",
          "अनुस्वार एवं अनुस्वरिक",
          "शब्द-निर्माण : उपसर्ग-प्रत्यय",
          "संधि",
          "विराम-चिह्न",
          "वाक्य-भेद",
          "अनुच्छेद-लेखन",
          "पत्र-लेखन",
          "संवाद-लेखन",
          "चित्र-वर्णन"
        ]
      }
    }
  }
};

/*
  STUDYMATE SYLLABUS ENFORCEMENT RULES (FINAL & STRICT):

  1. syllabus.ts is the PRIMARY authority.
  2. AI MUST NOT introduce new chapters, lessons, or out-of-class topics.
  3. If a topic is not explicitly listed here, AI MAY respond ONLY IF:
     - It belongs to the SAME chapter or subject listed above, AND
     - It is supported by OFFICIAL NCERT / CBSE syllabus guidance, AND
     - It does NOT expand the syllabus scope.
  4. AI MUST NOT answer ANY question that is:
     - Outside NCERT syllabus, OR
     - Outside CBSE syllabus, OR
     - Non-academic / non-study related.
  5. For such questions, AI must politely respond that:
     - The question is not related to studies or the NCERT/CBSE syllabus,
     - And therefore cannot be answered.
  6. Under no circumstance should AI entertain trivia, casual chat,
     or unrelated queries during study sessions.
*/
