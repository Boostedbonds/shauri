"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "600", "700"] });

type StudentContext = { name: string; class: string; board: string };
type Tab = "about" | "lastYears" | "checkResult" | "career" | "timetable" | "importantDates";

// ─── PAPER DATA ────────────────────────────────────────────────
// Two types:
//   "sqp"   = Sample Question Paper (pre-exam practice, released by CBSE Academics)
//   "board" = Actual board exam paper (released after exam via Question Bank)
//
// URL patterns confirmed from cbseacademic.nic.in:
//   SQP 2025-26 : /web_material/SQP/ClassX_2025_26/{Subject}-SQP.pdf
//   SQP 2024-25 : /web_material/SQP/ClassX_2024_25/{Subject}-SQP.pdf
//   SQP 2023-24 : /web_material/SQP/ClassX_2023_24/{Subject}-SQP.pdf
//   Board QPs   : /web_material/Qpapers/{year}/classX/{Subject}.pdf

type SubjectLinks = { sqp?: string; ms?: string; board?: string };
type YearData = {
  year: string;
  label: string;
  badge?: string;
  type: "sqp" | "board" | "both";
  listingUrl: string; // fallback listing page
  subjects: Record<string, SubjectLinks>;
};

const BASE = "https://cbseacademic.nic.in";

const YEAR_DATA: YearData[] = [
  {
    year: "2025-26",
    label: "SQP 2025–26",
    badge: "LATEST SQP",
    type: "sqp",
    listingUrl: `${BASE}/sqp_classx_2025-26.html`,
    subjects: {
      "Science":          { sqp: `${BASE}/web_material/SQP/ClassX_2025_26/Science-SQP.pdf`,       ms: `${BASE}/web_material/SQP/ClassX_2025_26/Science-MS.pdf` },
      "Maths Standard":   { sqp: `${BASE}/web_material/SQP/ClassX_2025_26/MathsStandard-SQP.pdf`, ms: `${BASE}/web_material/SQP/ClassX_2025_26/MathsStandard-MS.pdf` },
      "Maths Basic":      { sqp: `${BASE}/web_material/SQP/ClassX_2025_26/MathsBasic-SQP.pdf`,    ms: `${BASE}/web_material/SQP/ClassX_2025_26/MathsBasic-MS.pdf` },
      "English (L&L)":    { sqp: `${BASE}/web_material/SQP/ClassX_2025_26/EnglishL-SQP.pdf`,      ms: `${BASE}/web_material/SQP/ClassX_2025_26/EnglishL-MS.pdf` },
      "Hindi A":          { sqp: `${BASE}/web_material/SQP/ClassX_2025_26/HindiCourseA-SQP.pdf`,  ms: `${BASE}/web_material/SQP/ClassX_2025_26/HindiCourseA-MS.pdf` },
      "Hindi B":          { sqp: `${BASE}/web_material/SQP/ClassX_2025_26/HindiCourseB-SQP.pdf`,  ms: `${BASE}/web_material/SQP/ClassX_2025_26/HindiCourseB-MS.pdf` },
      "Social Science":   { sqp: `${BASE}/web_material/SQP/ClassX_2025_26/SocialScience-SQP.pdf`, ms: `${BASE}/web_material/SQP/ClassX_2025_26/SocialScience-MS.pdf` },
      "Computer App":     { sqp: `${BASE}/web_material/SQP/ClassX_2025_26/ComputerApplication-SQP.pdf`, ms: `${BASE}/web_material/SQP/ClassX_2025_26/ComputerApplication-MS.pdf` },
    },
  },
  {
    year: "2024-25",
    label: "SQP 2024–25",
    badge: "SQP",
    type: "sqp",
    listingUrl: `${BASE}/sqp_classx_2024-25.html`,
    subjects: {
      "Science":          { sqp: `${BASE}/web_material/SQP/ClassX_2024_25/Science-SQP.pdf`,           ms: `${BASE}/web_material/SQP/ClassX_2024_25/Science-MS.pdf` },
      "Maths Standard":   { sqp: `${BASE}/web_material/SQP/ClassX_2024_25/MathsStandard-SQP.pdf`,     ms: `${BASE}/web_material/SQP/ClassX_2024_25/MathsStandard-MS.pdf` },
      "Maths Basic":      { sqp: `${BASE}/web_material/SQP/ClassX_2024_25/MathsBasic-SQP.pdf`,        ms: `${BASE}/web_material/SQP/ClassX_2024_25/MathsBasic-MS.pdf` },
      "English (L&L)":    { sqp: `${BASE}/web_material/SQP/ClassX_2024_25/EnglishL-SQP.pdf`,          ms: `${BASE}/web_material/SQP/ClassX_2024_25/EnglishL-MS.pdf` },
      "Hindi A":          { sqp: `${BASE}/web_material/SQP/ClassX_2024_25/HindiCourseA-SQP.pdf`,      ms: `${BASE}/web_material/SQP/ClassX_2024_25/HindiCourseA-MS.pdf` },
      "Hindi B":          { sqp: `${BASE}/web_material/SQP/ClassX_2024_25/HindiCourseB-SQP.pdf`,      ms: `${BASE}/web_material/SQP/ClassX_2024_25/HindiCourseB-MS.pdf` },
      "Social Science":   { sqp: `${BASE}/web_material/SQP/ClassX_2024_25/SocialScience-SQP.pdf`,     ms: `${BASE}/web_material/SQP/ClassX_2024_25/SocialScience-MS.pdf` },
      "Computer App":     { sqp: `${BASE}/web_material/SQP/ClassX_2024_25/ComputerApplication-SQP.pdf`, ms: `${BASE}/web_material/SQP/ClassX_2024_25/ComputerApplication-MS.pdf` },
    },
  },
  {
    year: "2023-24",
    label: "SQP 2023–24",
    badge: "SQP",
    type: "sqp",
    listingUrl: `${BASE}/SQP_CLASSX_2023-24.html`,
    subjects: {
      "Science":          { sqp: `${BASE}/web_material/SQP/ClassX_2023_24/Science-SQP.pdf`,           ms: `${BASE}/web_material/SQP/ClassX_2023_24/Science-MS.pdf` },
      "Maths Standard":   { sqp: `${BASE}/web_material/SQP/ClassX_2023_24/MathsStandard-SQP.pdf`,     ms: `${BASE}/web_material/SQP/ClassX_2023_24/MathsStandard-MS.pdf` },
      "Maths Basic":      { sqp: `${BASE}/web_material/SQP/ClassX_2023_24/MathsBasic-SQP.pdf`,        ms: `${BASE}/web_material/SQP/ClassX_2023_24/MathsBasic-MS.pdf` },
      "English (L&L)":    { sqp: `${BASE}/web_material/SQP/ClassX_2023_24/EnglishL-SQP.pdf`,          ms: `${BASE}/web_material/SQP/ClassX_2023_24/EnglishL-MS.pdf` },
      "Hindi A":          { sqp: `${BASE}/web_material/SQP/ClassX_2023_24/HindiCourseA-SQP.pdf`,      ms: `${BASE}/web_material/SQP/ClassX_2023_24/HindiCourseA-MS.pdf` },
      "Social Science":   { sqp: `${BASE}/web_material/SQP/ClassX_2023_24/SocialScience-SQP.pdf`,     ms: `${BASE}/web_material/SQP/ClassX_2023_24/SocialScience-MS.pdf` },
    },
  },
  {
    year: "2024-board",
    label: "Board Exam 2024",
    badge: "ACTUAL PAPER",
    type: "board",
    listingUrl: `${BASE}/qbclass10.html`,
    subjects: {
      "Science":          { board: `${BASE}/web_material/Qpapers/2024/classX/Science.pdf` },
      "Maths Standard":   { board: `${BASE}/web_material/Qpapers/2024/classX/Mathematics_Standard.pdf` },
      "Maths Basic":      { board: `${BASE}/web_material/Qpapers/2024/classX/Mathematics_Basic.pdf` },
      "English (L&L)":    { board: `${BASE}/web_material/Qpapers/2024/classX/English_LA.pdf` },
      "Hindi A":          { board: `${BASE}/web_material/Qpapers/2024/classX/Hindi_A.pdf` },
      "Hindi B":          { board: `${BASE}/web_material/Qpapers/2024/classX/Hindi_B.pdf` },
      "Social Science":   { board: `${BASE}/web_material/Qpapers/2024/classX/Social_Science.pdf` },
    },
  },
  {
    year: "2023-board",
    label: "Board Exam 2023",
    badge: "ACTUAL PAPER",
    type: "board",
    listingUrl: `${BASE}/qbclass10.html`,
    subjects: {
      "Science":          { board: `${BASE}/web_material/Qpapers/2023/classX/Science.pdf` },
      "Maths Standard":   { board: `${BASE}/web_material/Qpapers/2023/classX/Maths_Standard.pdf` },
      "Maths Basic":      { board: `${BASE}/web_material/Qpapers/2023/classX/Maths_Basic.pdf` },
      "English (L&L)":    { board: `${BASE}/web_material/Qpapers/2023/classX/English_LA.pdf` },
      "Hindi A":          { board: `${BASE}/web_material/Qpapers/2023/classX/Hindi_Course_A.pdf` },
      "Social Science":   { board: `${BASE}/web_material/Qpapers/2023/classX/Social_Science.pdf` },
    },
  },
  {
    year: "2020-board",
    label: "Board Exam 2020",
    badge: "ACTUAL PAPER",
    type: "board",
    listingUrl: `${BASE}/qbclass10.html`,
    subjects: {
      "Science":          { board: `${BASE}/web_material/Qpapers/2020/classX/Science.pdf` },
      "Maths Standard":   { board: `${BASE}/web_material/Qpapers/2020/classX/Mathematics_Standard.pdf` },
      "Maths Basic":      { board: `${BASE}/web_material/Qpapers/2020/classX/Mathematics_Basic.pdf` },
      "English (L&L)":    { board: `${BASE}/web_material/Qpapers/2020/classX/English_LA.pdf` },
      "Hindi A":          { board: `${BASE}/web_material/Qpapers/2020/classX/Hindi_Course_A.pdf` },
      "Social Science":   { board: `${BASE}/web_material/Qpapers/2020/classX/Social_Science.pdf` },
    },
  },
  {
    year: "2019-board",
    label: "Board Exam 2019",
    badge: "ACTUAL PAPER",
    type: "board",
    listingUrl: `${BASE}/qbclass10.html`,
    subjects: {
      "Science":          { board: `${BASE}/web_material/Qpapers/2019/classX/Science.pdf` },
      "Mathematics":      { board: `${BASE}/web_material/Qpapers/2019/classX/Mathematics.pdf` },
      "English (L&L)":    { board: `${BASE}/web_material/Qpapers/2019/classX/English_LA.pdf` },
      "Hindi A":          { board: `${BASE}/web_material/Qpapers/2019/classX/Hindi_Course_A.pdf` },
      "Social Science":   { board: `${BASE}/web_material/Qpapers/2019/classX/Social_Science.pdf` },
    },
  },
];

// ─── FUTURE DATES ─────────────────────────────────────────────
const FUTURE_DATES = [
  { event: "CBSE Result Declaration (Expected)", date: "May 2026",       icon: "🏆", link: "https://results.cbse.nic.in" },
  { event: "Compartment Exams",                  date: "July 2026",      icon: "📝", link: "https://www.cbse.gov.in" },
  { event: "Class 11 Admission",                 date: "May–June 2026",  icon: "🎓", link: "https://www.cbse.gov.in" },
  { event: "NTSE Stage 2",                       date: "June 2026",      icon: "🧠", link: "https://ncert.nic.in/ntse.php" },
  { event: "Board Exam Registration 2026–27",    date: "Aug–Oct 2026",   icon: "📋", link: "https://www.cbse.gov.in" },
  { event: "JEE Main Session 1",                 date: "Jan–Feb 2027",   icon: "🔭", link: "https://jeemain.nta.ac.in" },
  { event: "NEET UG",                            date: "May 2027",       icon: "🧬", link: "https://neet.nta.nic.in" },
  { event: "CUET UG",                            date: "May–June 2027",  icon: "📚", link: "https://cuet.samarth.ac.in" },
  { event: "UPSC CSE Prelims",                   date: "June 2027",      icon: "🇮🇳", link: "https://upsc.gov.in" },
  { event: "CA Foundation",                      date: "June & Dec 2026",icon: "📒", link: "https://icai.org" },
];

// ─── CAREER DATA ──────────────────────────────────────────────
type Book = { title: string; freeLink: string; linkLabel: string };
type Exam = { name: string; icon: string; desc: string; dates: string; link: string; books: Book[] };
type Career = { name: string; icon: string; exams: string[] };

const CAREER_STREAMS: {
  stream: string; color: string; bg: string; border: string; icon: string;
  subjects: string[];
  careers: Career[];
  exams: Exam[];
}[] = [
  {
    stream: "Science (PCM)", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "🔭",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    careers: [
      { name: "Engineering",    icon: "⚙️",  exams: ["JEE Main", "JEE Advanced", "BITSAT", "VITEEE"] },
      { name: "Architecture",   icon: "🏛️",  exams: ["JEE Main", "NATA"] },
      { name: "Defence",        icon: "🪖",  exams: ["NDA"] },
      { name: "Data Science",   icon: "📊",  exams: ["JEE Main", "BITSAT", "VITEEE"] },
      { name: "Aviation",       icon: "✈️",  exams: ["NDA", "JEE Main"] },
      { name: "Merchant Navy",  icon: "🚢",  exams: ["JEE Main", "IMU CET"] },
    ],
    exams: [
      { name: "JEE Main", icon: "⚙️", desc: "Gateway to NITs, IIITs & GFTIs", dates: "Jan & Apr every year", link: "https://jeemain.nta.ac.in",
        books: [
          { title: "HC Verma — Concepts of Physics", freeLink: "https://archive.org/search?query=HC+Verma+physics", linkLabel: "Free on Archive.org" },
          { title: "RD Sharma — Mathematics", freeLink: "https://www.selfstudys.com/books/rd-sharma/english/class-11/mathematics", linkLabel: "Free on SelfStudys" },
          { title: "NCERT Chemistry XI & XII", freeLink: "https://ncert.nic.in/textbook.php?lech1=0-9", linkLabel: "Free Official NCERT PDF" },
          { title: "Arihant 41 Years JEE Papers", freeLink: "https://www.selfstudys.com/books/jee-main-previous-year-papers", linkLabel: "Free Previous Papers" },
        ],
      },
      { name: "JEE Advanced", icon: "🏆", desc: "Gateway to IITs — top 2.5L JEE Main qualifiers only", dates: "May–June every year", link: "https://jeeadv.ac.in",
        books: [
          { title: "Irodov — Problems in Physics", freeLink: "https://archive.org/search?query=irodov+problems+physics", linkLabel: "Free on Archive.org" },
          { title: "Morrison Boyd — Organic Chemistry", freeLink: "https://archive.org/search?query=morrison+boyd+organic+chemistry", linkLabel: "Free on Archive.org" },
          { title: "SL Loney — Trigonometry", freeLink: "https://archive.org/search?query=SL+Loney+trigonometry", linkLabel: "Free on Archive.org" },
          { title: "JEE Advanced Previous Papers", freeLink: "https://jeeadv.ac.in/pastqpppr.html", linkLabel: "Free Official Papers" },
        ],
      },
      { name: "BITSAT", icon: "💡", desc: "BITS Pilani, Goa, Hyderabad — top private engineering", dates: "May–June every year", link: "https://bitsadmission.com",
        books: [
          { title: "NCERT Physics, Chemistry, Maths", freeLink: "https://ncert.nic.in/textbook.php", linkLabel: "Free Official NCERT PDFs" },
          { title: "BITSAT Previous Year Papers", freeLink: "https://www.selfstudys.com/books/bitsat-previous-year-papers", linkLabel: "Free Papers" },
        ],
      },
      { name: "NDA", icon: "🪖", desc: "National Defence Academy — Army, Navy, Air Force", dates: "Apr & Sep every year", link: "https://upsc.gov.in",
        books: [
          { title: "NDA Previous Year Papers (Official)", freeLink: "https://upsc.gov.in/examinations/previous-question-papers", linkLabel: "Free Official Papers" },
          { title: "NCERT Maths Class 11–12", freeLink: "https://ncert.nic.in/textbook.php?kemh1=0-16", linkLabel: "Free Official NCERT PDF" },
          { title: "Wren & Martin — English Grammar", freeLink: "https://archive.org/search?query=wren+martin+english+grammar", linkLabel: "Free on Archive.org" },
        ],
      },
      { name: "NATA", icon: "🏗️", desc: "National Aptitude Test for Architecture", dates: "Apr–Jun every year", link: "https://nata.in",
        books: [
          { title: "NATA Previous Year Papers", freeLink: "https://www.selfstudys.com/books/nata-previous-year-papers", linkLabel: "Free Papers" },
          { title: "Drawing Practice Guide", freeLink: "https://nata.in/study-material", linkLabel: "Official Site" },
        ],
      },
      { name: "VITEEE", icon: "🎓", desc: "VIT University — top private engineering college", dates: "Apr–May every year", link: "https://vit.ac.in/viteee",
        books: [
          { title: "NCERT Physics, Chemistry, Maths", freeLink: "https://ncert.nic.in/textbook.php", linkLabel: "Free Official NCERT PDFs" },
          { title: "VITEEE Previous Year Papers", freeLink: "https://www.selfstudys.com/books/viteee-previous-year-papers", linkLabel: "Free Papers" },
        ],
      },
      { name: "IMU CET", icon: "🚢", desc: "Indian Maritime University — Merchant Navy", dates: "May every year", link: "https://imu.edu.in",
        books: [
          { title: "IMU CET Previous Papers", freeLink: "https://www.selfstudys.com/books/imu-cet-previous-year-papers", linkLabel: "Free Papers" },
          { title: "NCERT Physics & Chemistry", freeLink: "https://ncert.nic.in/textbook.php", linkLabel: "Free Official NCERT PDFs" },
        ],
      },
    ],
  },
  {
    stream: "Science (PCB)", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: "🧬",
    subjects: ["Physics", "Chemistry", "Biology"],
    careers: [
      { name: "Medicine (MBBS)",  icon: "🏥", exams: ["NEET UG", "AIIMS", "JIPMER"] },
      { name: "Dentistry (BDS)",  icon: "🦷", exams: ["NEET UG"] },
      { name: "Pharmacy",         icon: "💊", exams: ["NEET UG", "CUET UG"] },
      { name: "Nursing",          icon: "🩺", exams: ["CUET UG"] },
      { name: "Biotechnology",    icon: "🔬", exams: ["NEET UG", "CUET UG", "JEE Main"] },
      { name: "Veterinary",       icon: "🐾", exams: ["NEET UG"] },
    ],
    exams: [
      { name: "NEET UG", icon: "🏥", desc: "Only gateway to MBBS, BDS, BAMS, BHMS in India", dates: "May every year", link: "https://neet.nta.nic.in",
        books: [
          { title: "NCERT Biology XI & XII", freeLink: "https://ncert.nic.in/textbook.php?kebo1=0-22", linkLabel: "Free Official NCERT PDF" },
          { title: "DC Pandey — Physics for NEET", freeLink: "https://www.selfstudys.com/books/dc-pandey-physics-neet", linkLabel: "Free on SelfStudys" },
          { title: "OP Tandon — Chemistry", freeLink: "https://archive.org/search?query=op+tandon+chemistry", linkLabel: "Free on Archive.org" },
          { title: "NEET Previous Year Papers (Official)", freeLink: "https://neet.nta.nic.in/previous-papers", linkLabel: "Free Official Papers" },
        ],
      },
      { name: "AIIMS", icon: "🔬", desc: "Top medical college — now via NEET only", dates: "Via NEET score", link: "https://www.aiims.edu",
        books: [
          { title: "NCERT Biology (read 5+ times)", freeLink: "https://ncert.nic.in/textbook.php?kebo1=0-22", linkLabel: "Free Official NCERT PDF" },
          { title: "MTG NEET Champion series", freeLink: "https://www.selfstudys.com/books/neet-champion", linkLabel: "Free on SelfStudys" },
        ],
      },
      { name: "JIPMER", icon: "💊", desc: "Premier government medical institute", dates: "Via NEET score", link: "https://jipmer.edu.in",
        books: [
          { title: "NEET Prep + JIPMER Past Papers", freeLink: "https://www.selfstudys.com/books/jipmer-previous-year-papers", linkLabel: "Free Papers" },
        ],
      },
      { name: "CUET UG", icon: "📚", desc: "Central Universities for B.Sc programs", dates: "May–June every year", link: "https://cuet.samarth.ac.in",
        books: [
          { title: "NCERT XII Science", freeLink: "https://ncert.nic.in/textbook.php", linkLabel: "Free Official NCERT PDFs" },
          { title: "CUET Previous Papers", freeLink: "https://cuet.samarth.ac.in/index.php/site/previousyearqp", linkLabel: "Free Official Papers" },
        ],
      },
    ],
  },
  {
    stream: "Commerce", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "📊",
    subjects: ["Accountancy", "Business Studies", "Economics", "Mathematics (optional)"],
    careers: [
      { name: "Chartered Accountancy", icon: "📒", exams: ["CA Foundation"] },
      { name: "Company Secretary",     icon: "⚖️",  exams: ["CS Foundation"] },
      { name: "Banking / Finance",     icon: "🏦",  exams: ["CUET UG", "CA Foundation"] },
      { name: "MBA",                   icon: "💼",  exams: ["IPM IIM", "CUET UG"] },
      { name: "Stock Market / Trading",icon: "📈",  exams: ["CA Foundation", "CUET UG"] },
      { name: "Law",                   icon: "🏛️",  exams: ["CLAT"] },
    ],
    exams: [
      { name: "CA Foundation", icon: "📒", desc: "Chartered Accountancy — most respected finance career in India", dates: "June & Dec every year", link: "https://icai.org",
        books: [
          { title: "ICAI Official Study Material (Free PDF)", freeLink: "https://www.icai.org/post/ca-foundation-study-material", linkLabel: "Free Official ICAI PDF" },
          { title: "ICAI Practice Manual (Free PDF)", freeLink: "https://www.icai.org/post/ca-foundation-practice-manual", linkLabel: "Free Official ICAI PDF" },
          { title: "ICAI Past Papers", freeLink: "https://www.icai.org/post/past-examination-papers", linkLabel: "Free Official Papers" },
        ],
      },
      { name: "CS Foundation", icon: "⚖️", desc: "Company Secretary — corporate law & governance", dates: "June & Dec every year", link: "https://icsi.edu",
        books: [
          { title: "ICSI Official Study Material (Free PDF)", freeLink: "https://www.icsi.edu/student/foundation-programme/study-material/", linkLabel: "Free Official ICSI PDF" },
          { title: "ICSI Past Papers", freeLink: "https://www.icsi.edu/student/foundation-programme/past-examination-papers/", linkLabel: "Free Official Papers" },
        ],
      },
      { name: "CUET UG", icon: "🎓", desc: "Central Universities — B.Com, BA Economics etc", dates: "May–June every year", link: "https://cuet.samarth.ac.in",
        books: [
          { title: "NCERT XII Commerce", freeLink: "https://ncert.nic.in/textbook.php", linkLabel: "Free Official NCERT PDFs" },
          { title: "CUET Previous Papers", freeLink: "https://cuet.samarth.ac.in/index.php/site/previousyearqp", linkLabel: "Free Official Papers" },
        ],
      },
      { name: "IPM IIM", icon: "💼", desc: "5-year Integrated Management Programme at IIMs", dates: "May every year", link: "https://iimidr.ac.in/ipm",
        books: [
          { title: "Quantitative Aptitude — Arun Sharma", freeLink: "https://archive.org/search?query=arun+sharma+quantitative+aptitude", linkLabel: "Free on Archive.org" },
          { title: "IPM Previous Year Papers", freeLink: "https://www.selfstudys.com/books/ipm-previous-year-papers", linkLabel: "Free Papers" },
        ],
      },
      { name: "CLAT", icon: "🏛️", desc: "Law entrance for National Law Universities", dates: "Dec every year", link: "https://consortiumofnlus.ac.in",
        books: [
          { title: "CLAT Previous Year Papers (Official)", freeLink: "https://consortiumofnlus.ac.in/clat-2025/previous-years-question-papers.html", linkLabel: "Free Official Papers" },
          { title: "Legal Reasoning Guide", freeLink: "https://archive.org/search?query=legal+reasoning+law+entrance", linkLabel: "Free on Archive.org" },
          { title: "Current Affairs (Daily)", freeLink: "https://www.thehindu.com", linkLabel: "The Hindu — Free" },
        ],
      },
    ],
  },
  {
    stream: "Arts / Humanities", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: "🏛️",
    subjects: ["History", "Political Science", "Geography", "Psychology", "Sociology"],
    careers: [
      { name: "IAS / IPS (UPSC)",  icon: "🇮🇳", exams: ["UPSC CSE"] },
      { name: "Law",               icon: "⚖️",  exams: ["CLAT"] },
      { name: "Journalism",        icon: "📰",  exams: ["CUET UG"] },
      { name: "Psychology",        icon: "🧠",  exams: ["CUET UG"] },
      { name: "Teaching",          icon: "🏫",  exams: ["CUET UG", "SSC CGL"] },
      { name: "Government Jobs",   icon: "👮",  exams: ["SSC CGL", "UPSC CSE"] },
    ],
    exams: [
      { name: "UPSC CSE", icon: "🇮🇳", desc: "Civil Services — IAS, IPS, IFS and 20+ services", dates: "Prelims: June | Mains: Sep", link: "https://upsc.gov.in",
        books: [
          { title: "NCERT 6–12 All Subjects (Free)", freeLink: "https://ncert.nic.in/textbook.php", linkLabel: "Free Official NCERT PDFs" },
          { title: "Lakshmikant — Indian Polity", freeLink: "https://archive.org/search?query=lakshmikant+indian+polity", linkLabel: "Free on Archive.org" },
          { title: "Spectrum — Modern History", freeLink: "https://archive.org/search?query=spectrum+modern+history", linkLabel: "Free on Archive.org" },
          { title: "UPSC Previous Year Papers (Official)", freeLink: "https://upsc.gov.in/examinations/previous-question-papers", linkLabel: "Free Official Papers" },
        ],
      },
      { name: "CLAT", icon: "⚖️", desc: "Law entrance for top NLUs across India", dates: "Dec every year", link: "https://consortiumofnlus.ac.in",
        books: [
          { title: "CLAT Previous Year Papers (Official)", freeLink: "https://consortiumofnlus.ac.in/clat-2025/previous-years-question-papers.html", linkLabel: "Free Official Papers" },
          { title: "Current Affairs — The Hindu", freeLink: "https://www.thehindu.com", linkLabel: "Free Daily" },
        ],
      },
      { name: "CUET UG", icon: "📚", desc: "Central Universities — BA History, Pol Sci, Psychology etc", dates: "May–June every year", link: "https://cuet.samarth.ac.in",
        books: [
          { title: "NCERT XII Humanities", freeLink: "https://ncert.nic.in/textbook.php", linkLabel: "Free Official NCERT PDFs" },
          { title: "CUET Previous Papers", freeLink: "https://cuet.samarth.ac.in/index.php/site/previousyearqp", linkLabel: "Free Official Papers" },
        ],
      },
      { name: "SSC CGL", icon: "👮", desc: "Staff Selection Commission — multiple government jobs", dates: "Year-round", link: "https://ssc.nic.in",
        books: [
          { title: "SSC CGL Previous Year Papers", freeLink: "https://ssc.nic.in/Portal/Previous-Year-Question-Papers", linkLabel: "Free Official Papers" },
          { title: "Lucent GK", freeLink: "https://archive.org/search?query=lucent+gk+general+knowledge", linkLabel: "Free on Archive.org" },
          { title: "RS Aggarwal — Reasoning", freeLink: "https://archive.org/search?query=rs+aggarwal+reasoning", linkLabel: "Free on Archive.org" },
        ],
      },
    ],
  },
];

// ─── UPSC RESOURCES ───────────────────────────────────────────
const UPSC_RESOURCES = [
  { stage: "Free NCERT & Basics", icon: "📖", color: "#2563EB", items: [
    { label: "NCERT Free PDFs (Official)", link: "https://ncert.nic.in/textbook.php", desc: "Free download — Class 6 to 12 all subjects. Backbone of UPSC." },
    { label: "Drishti IAS — Free Portal",  link: "https://www.drishtiias.com",        desc: "Best free UPSC portal in India — notes, current affairs, videos." },
    { label: "Vision IAS Free Material",   link: "https://visionias.in/resources/",   desc: "Free current affairs, monthly magazines, test series." },
    { label: "Unacademy Free Classes",     link: "https://unacademy.com/goal/upsc-civil-services-examination-ias/KSCGY", desc: "Free live UPSC classes by top educators." },
  ]},
  { stage: "Current Affairs", icon: "📰", color: "#16A34A", items: [
    { label: "The Hindu (Newspaper)",      link: "https://www.thehindu.com",   desc: "Most recommended newspaper for UPSC. Read daily." },
    { label: "PIB — Press Info Bureau",    link: "https://pib.gov.in",         desc: "Official government news — directly asked in UPSC Prelims & Mains." },
    { label: "Yojana Magazine (Free PDF)", link: "https://yojana.gov.in",      desc: "Government magazine — must read for GS Paper II & III." },
    { label: "Kurukshetra Magazine",       link: "https://kurukshetra.gov.in", desc: "Rural development & economy. Key UPSC topic." },
  ]},
  { stage: "Key Books", icon: "📚", color: "#D97706", items: [
    { label: "Indian Polity — M Lakshmikant",    link: "https://archive.org/search?query=lakshmikant+polity",      desc: "Bible of UPSC Polity. Read cover to cover." },
    { label: "Modern India — Spectrum",          link: "https://archive.org/search?query=spectrum+modern+history", desc: "Most used Modern History book for UPSC." },
    { label: "Indian Economy — Ramesh Singh",    link: "https://archive.org/search?query=ramesh+singh+economy",    desc: "Standard Economy reference for UPSC Mains." },
    { label: "Certificate Physical Geo — Leong", link: "https://archive.org/search?query=gc+leong+geography",      desc: "Geography standard reference book." },
  ]},
  { stage: "Practice & Mock Tests", icon: "✍️", color: "#7C3AED", items: [
    { label: "UPSC Previous Year Papers (Free)",  link: "https://upsc.gov.in/examinations/previous-question-papers", desc: "Official previous papers — start solving from Class 10 itself." },
    { label: "Insights IAS — Free Tests",         link: "https://www.insightsonindia.com",                           desc: "Free UPSC tests & answer writing practice." },
    { label: "ForumIAS Community",                link: "https://forumias.com",                                      desc: "UPSC community, test series, answer writing — huge free resources." },
    { label: "BYJU's Free IAS Prep",              link: "https://byjus.com/free-ias-prep/",                          desc: "Topic-wise free study material & videos." },
  ]},
];

// ─── AI TIMETABLE ─────────────────────────────────────────────
type TimetableEntry = { day: string; subject: string; topic: string; hours: number; notes: string };

async function generateTimetable(exam: string, weeks: number, hoursPerDay: number, name: string): Promise<TimetableEntry[]> {
  try {
    const key = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!key) throw new Error("No key");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        messages: [
          { role: "system", content: `You are a CBSE expert study planner. Return ONLY a valid JSON array of 7 objects. No markdown, no explanation. Each object: { "day": "Monday", "subject": "Physics", "topic": "Laws of Motion", "hours": 2, "notes": "Focus on numericals" }. Sunday must be rest day with hours: 1.` },
          { role: "user",   content: `Weekly study plan for ${name} preparing for ${exam}. ${weeks} weeks left, ${hoursPerDay} hours/day available. Make it balanced and CBSE-realistic. Return only the JSON array.` },
        ],
      }),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "[]";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return [
      { day: "Monday",    subject: exam,  topic: "Chapters 1–3 Review",   hours: hoursPerDay, notes: "Concepts + examples" },
      { day: "Tuesday",   subject: exam,  topic: "Chapters 4–6 Review",   hours: hoursPerDay, notes: "MCQ practice" },
      { day: "Wednesday", subject: exam,  topic: "Chapters 7–9 Review",   hours: hoursPerDay, notes: "Previous year Qs" },
      { day: "Thursday",  subject: exam,  topic: "Chapters 10–12 Review", hours: hoursPerDay, notes: "Short answers" },
      { day: "Friday",    subject: exam,  topic: "Full Revision",          hours: hoursPerDay, notes: "Mind maps & notes" },
      { day: "Saturday",  subject: exam,  topic: "Mock Test + Analysis",   hours: hoursPerDay, notes: "Timed paper" },
      { day: "Sunday",    subject: "Rest",topic: "Light reading only",     hours: 1,           notes: "Relax & recharge 🌟" },
    ];
  }
}

// ─── BADGE COLORS ─────────────────────────────────────────────
function getBadgeStyle(badge?: string) {
  if (!badge) return {};
  if (badge === "LATEST SQP") return { background: "#22c55e", color: "#fff" };
  if (badge === "ACTUAL PAPER") return { background: "#2563EB", color: "#fff" };
  return { background: "#6b7280", color: "#fff" };
}

// ─── TAB: ABOUT ───────────────────────────────────────────────
function AboutTab() {
  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0a2540", marginBottom: 12 }}>What is SHAURI?</h3>
      <p style={{ fontSize: 13, color: "#425466", lineHeight: 1.8, marginBottom: 14 }}>
        <strong>SHAURI</strong> is a CBSE-aligned adaptive learning platform for Class 6–12 students. It uses AI to help you learn smarter — not harder.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { icon: "🧠", title: "Learn Mode",         desc: "AI-powered CBSE concept explanations" },
          { icon: "🧪", title: "Examiner Mode",       desc: "Full mock papers with AI evaluation" },
          { icon: "🗣️", title: "Oral Mode",           desc: "Spoken practice & fluency building" },
          { icon: "📊", title: "Progress Dashboard",  desc: "Track growth across subjects over time" },
        ].map(f => (
          <div key={f.title} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(212,175,55,0.25)" }}>
            <p style={{ fontSize: 18, marginBottom: 5 }}>{f.icon}</p>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540", marginBottom: 3 }}>{f.title}</p>
            <p style={{ fontSize: 12, color: "#5c6f82" }}>{f.desc}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#5c6f82", lineHeight: 1.7 }}>
        🔒 <strong>Privacy first:</strong> Your learning data stays on your device. No ads. No tracking.
      </p>
    </div>
  );
}

// ─── TAB: LAST YEARS ──────────────────────────────────────────
function LastYearsTab() {
  const [expanded, setExpanded] = useState<string | null>(YEAR_DATA[0].year);

  function openPdf(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Group years: SQPs first, then Board papers
  const sqpYears   = YEAR_DATA.filter(y => y.type === "sqp");
  const boardYears = YEAR_DATA.filter(y => y.type === "board");

  function renderYearBlock(yd: YearData) {
    const isOpen = expanded === yd.year;
    const subjects = Object.entries(yd.subjects);

    return (
      <div key={yd.year} style={{ marginBottom: 8, border: "1px solid rgba(212,175,55,0.3)", borderRadius: 12, overflow: "hidden" }}>
        <button
          onClick={() => setExpanded(isOpen ? null : yd.year)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: isOpen ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#0a2540", fontFamily: "inherit" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            📄 CBSE Class 10 — {yd.label}
            {yd.badge && (
              <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, ...getBadgeStyle(yd.badge) }}>
                {yd.badge}
              </span>
            )}
          </span>
          <span style={{ color: "#D4AF37" }}>{isOpen ? "▲" : "▼"}</span>
        </button>

        {isOpen && (
          <div style={{ padding: "14px 18px", background: "rgba(255,255,255,0.7)" }}>
            {yd.type === "sqp" && (
              <p style={{ fontSize: 12, color: "#5c6f82", marginBottom: 10 }}>
                📌 <strong>Sample Question Paper</strong> — released by CBSE before the exam for practice. Click subject to open PDF, or get its Marking Scheme.
              </p>
            )}
            {yd.type === "board" && (
              <p style={{ fontSize: 12, color: "#2563EB", marginBottom: 10, background: "rgba(37,99,235,0.06)", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(37,99,235,0.2)" }}>
                🏫 <strong>Actual Board Exam Paper</strong> — the real paper that appeared in the exam. Official from CBSE Question Bank.
              </p>
            )}

            {/* Subject buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {subjects.map(([subName, links]) => (
                <div key={subName} style={{ display: "flex", gap: 4 }}>
                  {/* SQP / Board paper button */}
                  <button
                    onClick={() => openPdf((links.sqp || links.board || yd.listingUrl))}
                    style={{ padding: "8px 14px", borderRadius: 8, background: yd.type === "board" ? "rgba(37,99,235,0.08)" : "rgba(212,175,55,0.1)", border: `1.5px solid ${yd.type === "board" ? "rgba(37,99,235,0.35)" : "rgba(212,175,55,0.5)"}`, color: "#0a2540", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    onMouseOver={e => (e.currentTarget.style.opacity = "0.75")}
                    onMouseOut={e => (e.currentTarget.style.opacity = "1")}
                  >
                    📄 {subName}
                  </button>
                  {/* Marking Scheme button (SQP only) */}
                  {links.ms && (
                    <button
                      onClick={() => openPdf(links.ms!)}
                      title="Marking Scheme"
                      style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1.5px solid rgba(34,197,94,0.35)", color: "#15803d", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      ✅ MS
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Fallback listing link */}
            <p style={{ fontSize: 11, color: "#5c6f82" }}>
              💡 Papers not loading? Open the full listing:&nbsp;
              <a href={yd.listingUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB" }}>
                CBSE Official Page ↗
              </a>
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 14 }}>
        Click any subject to open the PDF directly. <strong>SQPs</strong> are pre-exam practice papers; <strong>Board Exam Papers</strong> are actual question papers from that year.
      </p>

      {/* SQP Section */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 12, color: "#0a2540", letterSpacing: "0.1em" }}>📝 SAMPLE QUESTION PAPERS (SQP)</span>
          <span style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.3)" }} />
        </div>
        {sqpYears.map(renderYearBlock)}
      </div>

      {/* Board Papers Section */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 12, color: "#0a2540", letterSpacing: "0.1em" }}>🏫 ACTUAL BOARD EXAM PAPERS</span>
          <span style={{ flex: 1, height: 1, background: "rgba(37,99,235,0.25)" }} />
        </div>
        {boardYears.map(renderYearBlock)}
      </div>

      <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 12 }}>
        💡 For more subjects & years, visit{" "}
        <a href="https://cbseacademic.nic.in" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB" }}>cbseacademic.nic.in ↗</a>
        &nbsp;→ Sample Question Paper / Question Bank → Class X
      </p>
    </div>
  );
}

// ─── TAB: CHECK RESULT ────────────────────────────────────────
function CheckResultTab({ student }: { student: StudentContext }) {
  const [rollNo, setRollNo]    = useState("");
  const [dob, setDob]          = useState("");
  const [school, setSchool]    = useState("");
  const [submitted, setSubmit] = useState(false);

  function handleCheck() {
    if (!rollNo || !dob) { alert("Please enter Roll Number and Date of Birth"); return; }
    setSubmit(true);
    const form = document.createElement("form");
    form.method = "GET";
    form.action = "https://results.cbse.nic.in/cbse2025/index.php";
    form.target = "_blank";
    [["regno", rollNo], ["dob", dob], ["school", school]].forEach(([n, v]) => {
      const inp = document.createElement("input");
      inp.name = n; inp.value = v; form.appendChild(inp);
    });
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 14 }}>
        Enter your details once — we'll take you directly to your CBSE result.
      </p>
      <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "18px", border: "1px solid rgba(212,175,55,0.3)", marginBottom: 14 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: "#0a2540", marginBottom: 14 }}>🎓 {student.name}'s Result Lookup</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5c6f82", display: "block", marginBottom: 5 }}>Roll Number *</label>
            <input value={rollNo} onChange={e => setRollNo(e.target.value)} placeholder="From your Admit Card"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid rgba(212,175,55,0.4)", background: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5c6f82", display: "block", marginBottom: 5 }}>Date of Birth *</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid rgba(212,175,55,0.4)", background: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#5c6f82", display: "block", marginBottom: 5 }}>School Number (optional)</label>
          <input value={school} onChange={e => setSchool(e.target.value)} placeholder="5-digit school code"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid rgba(212,175,55,0.4)", background: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
        </div>
        <button onClick={handleCheck}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #D4AF37, #92400e)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          🔍 Check My Result
        </button>
      </div>
      {submitted && (
        <div style={{ background: "rgba(34,197,94,0.1)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(34,197,94,0.3)", marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>✅ Opening CBSE result page. If blocked, use direct links below.</p>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "CBSE Results Portal", url: "https://results.cbse.nic.in" },
          { label: "DigiLocker",          url: "https://www.digilocker.gov.in" },
          { label: "UMANG App",           url: "https://web.umang.gov.in" },
        ].map(({ label, url }) => (
          <a key={label} href={url} target="_blank" rel="noopener noreferrer"
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,0.4)", color: "#0a2540", fontSize: 12, fontWeight: 600, textDecoration: "none", background: "rgba(255,255,255,0.6)" }}>
            {label} ↗
          </a>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#92400e", marginTop: 12, background: "rgba(254,243,199,0.8)", padding: "10px 14px", borderRadius: 8 }}>
        ⚠️ Result only available after CBSE officially declares it (expected May 2026). Save your Roll Number from your Admit Card now.
      </p>
    </div>
  );
}

// ─── TAB: CAREER ──────────────────────────────────────────────
function CareerTab({ studentName }: { studentName: string }) {
  const [activeStream, setActiveStream]     = useState(0);
  const [section, setSection]               = useState<"streams" | "upsc">("streams");
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [selectedExam, setSelectedExam]     = useState<Exam | null>(null);
  const [upscSection, setUpscSection]       = useState(0);

  const stream = CAREER_STREAMS[activeStream];
  const careerExams: Exam[] = selectedCareer
    ? stream.exams.filter(e => selectedCareer.exams.includes(e.name))
    : [];

  function handleStreamChange(i: number) {
    setActiveStream(i);
    setSelectedCareer(null);
    setSelectedExam(null);
  }

  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 14 }}>
        Hey {studentName}! Click a <strong>career</strong> to see which exams to prepare for, then click any exam for books & study links.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[{ key: "streams", label: "🎯 Streams & Exams" }, { key: "upsc", label: "🏛️ UPSC / Civil Services" }].map(({ key, label }) => (
          <button key={key} onClick={() => { setSection(key as any); setSelectedCareer(null); setSelectedExam(null); }}
            style={{ padding: "7px 16px", borderRadius: 20, border: `2px solid ${section === key ? "#D4AF37" : "rgba(212,175,55,0.3)"}`, background: section === key ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.5)", color: section === key ? "#0a2540" : "#5c6f82", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {label}
          </button>
        ))}
      </div>

      {section === "streams" && (
        <div>
          {!selectedExam && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {CAREER_STREAMS.map((s, i) => (
                <button key={i} onClick={() => handleStreamChange(i)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: `2px solid ${activeStream === i ? s.color : "rgba(212,175,55,0.25)"}`, background: activeStream === i ? s.bg : "rgba(255,255,255,0.5)", color: activeStream === i ? s.color : "#5c6f82", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  {s.icon} {s.stream}
                </button>
              ))}
            </div>
          )}

          {!selectedCareer && !selectedExam && (
            <div style={{ border: `2px solid ${stream.border}`, borderRadius: 14, padding: 18, background: stream.bg }}>
              <p style={{ fontWeight: 800, fontSize: 15, color: stream.color, marginBottom: 4 }}>{stream.icon} {stream.stream}</p>
              <p style={{ fontSize: 12, color: "#5c6f82", marginBottom: 14 }}>Subjects: {stream.subjects.join(", ")}</p>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540", marginBottom: 10 }}>👇 Click a career to see which entrance exams you need:</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {stream.careers.map(career => (
                  <button key={career.name} onClick={() => setSelectedCareer(career)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${stream.border}`, background: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                    onMouseOver={e => { e.currentTarget.style.background = stream.bg; e.currentTarget.style.borderColor = stream.color; }}
                    onMouseOut={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = stream.border; }}
                  >
                    <span style={{ fontSize: 22 }}>{career.icon}</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540" }}>{career.name}</p>
                      <p style={{ fontSize: 11, color: "#5c6f82" }}>{career.exams.length} exam{career.exams.length > 1 ? "s" : ""} to prepare</p>
                    </div>
                    <span style={{ marginLeft: "auto", color: stream.color }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedCareer && !selectedExam && (
            <div>
              <button onClick={() => setSelectedCareer(null)}
                style={{ marginBottom: 14, padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,0.3)", background: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#0a2540" }}>
                ← Back to Careers
              </button>
              <div style={{ border: `2px solid ${stream.border}`, borderRadius: 14, padding: 18, background: stream.bg }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{selectedCareer.icon}</span>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 16, color: stream.color }}>{selectedCareer.name}</p>
                    <p style={{ fontSize: 12, color: "#5c6f82" }}>via {stream.stream} stream</p>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, border: `1px solid ${stream.border}` }}>
                  <p style={{ fontSize: 12, color: "#5c6f82" }}>
                    To pursue <strong>{selectedCareer.name}</strong>, prepare for:
                    <strong style={{ color: stream.color }}> {selectedCareer.exams.join(", ")}</strong>
                  </p>
                </div>
                <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540", marginBottom: 10 }}>📝 Click any exam for dates, books & free study material:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {careerExams.map(exam => (
                    <button key={exam.name} onClick={() => setSelectedExam(exam)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 10, border: `1px solid ${stream.border}`, background: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                      onMouseOver={e => (e.currentTarget.style.background = stream.bg)}
                      onMouseOut={e => (e.currentTarget.style.background = "#fff")}
                    >
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "#0a2540" }}>{exam.icon} {exam.name}</p>
                        <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 2 }}>{exam.desc}</p>
                        <p style={{ fontSize: 11, color: stream.color, marginTop: 3 }}>📅 {exam.dates}</p>
                      </div>
                      <span style={{ color: stream.color, fontSize: 20, marginLeft: 12 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedExam && (
            <div>
              <button onClick={() => setSelectedExam(null)}
                style={{ marginBottom: 14, padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,0.3)", background: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#0a2540" }}>
                ← Back
              </button>
              <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "20px", border: "1px solid rgba(212,175,55,0.3)" }}>
                <p style={{ fontWeight: 800, fontSize: 18, color: "#0a2540", marginBottom: 4 }}>{selectedExam.icon} {selectedExam.name}</p>
                <p style={{ fontSize: 14, color: "#5c6f82", marginBottom: 16 }}>{selectedExam.desc}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "rgba(212,175,55,0.1)", borderRadius: 10, padding: "14px" }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540", marginBottom: 6 }}>📅 When to Appear</p>
                    <p style={{ fontSize: 13, color: "#425466" }}>{selectedExam.dates}</p>
                  </div>
                  <div style={{ background: "rgba(212,175,55,0.1)", borderRadius: 10, padding: "14px" }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540", marginBottom: 6 }}>🔗 Apply / Register</p>
                    <a href={selectedExam.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#2563EB", fontWeight: 700 }}>Official Portal ↗</a>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540", marginBottom: 4 }}>📚 Best Books — Click to Access Free Online</p>
                  <p style={{ fontSize: 11, color: "#5c6f82", marginBottom: 10 }}>All links go to free, legal study material — official PDFs, Archive.org, or official portals.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedExam.books.map(book => (
                      <a key={book.title} href={book.freeLink} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.8)", borderRadius: 10, border: "1px solid rgba(212,175,55,0.25)", textDecoration: "none" }}
                        onMouseOver={e => (e.currentTarget.style.background = "rgba(212,175,55,0.08)")}
                        onMouseOut={e => (e.currentTarget.style.background = "rgba(255,255,255,0.8)")}
                      >
                        <span style={{ fontSize: 20, flexShrink: 0 }}>📖</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: "#0a2540" }}>{book.title}</p>
                          <p style={{ fontSize: 11, color: "#2563EB", marginTop: 2 }}>🔗 {book.linkLabel}</p>
                        </div>
                        <span style={{ color: "#D4AF37", fontSize: 16, flexShrink: 0 }}>↗</span>
                      </a>
                    ))}
                  </div>
                </div>
                <a href={selectedExam.link} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 10, background: "linear-gradient(135deg, #D4AF37, #92400e)", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                  🚀 Go to Official {selectedExam.name} Portal
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {section === "upsc" && (
        <div>
          <div style={{ background: "linear-gradient(135deg, #0a2540, #1e3a5f)", borderRadius: 14, padding: "16px 20px", color: "#fff", marginBottom: 14 }}>
            <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>🇮🇳 UPSC Civil Services — Complete Free Guide</p>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>Any stream from Class 11 works. Many toppers start in Class 10–11. All resources below are <strong style={{ color: "#fbbf24" }}>free</strong>.</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {UPSC_RESOURCES.map((r, i) => (
              <button key={i} onClick={() => setUpscSection(i)}
                style={{ padding: "6px 14px", borderRadius: 8, border: `2px solid ${upscSection === i ? r.color : "rgba(212,175,55,0.25)"}`, background: upscSection === i ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)", color: upscSection === i ? r.color : "#5c6f82", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {r.icon} {r.stage}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {UPSC_RESOURCES[upscSection].items.map(item => (
              <a key={item.label} href={item.link} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.6)", borderRadius: 10, border: "1px solid rgba(212,175,55,0.25)", textDecoration: "none" }}>
                <span style={{ fontSize: 20 }}>🔗</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#0a2540" }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 3 }}>{item.desc}</p>
                </div>
                <span style={{ color: "#D4AF37", fontSize: 16, flexShrink: 0 }}>↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB: TIMETABLE ───────────────────────────────────────────
function TimetableTab({ student }: { student: StudentContext }) {
  const [exam, setExam]           = useState("Science");
  const [weeks, setWeeks]         = useState(4);
  const [hours, setHours]         = useState(3);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading]     = useState(false);
  const [editing, setEditing]     = useState<number | null>(null);
  const [editVal, setEditVal]     = useState<TimetableEntry | null>(null);

  const EXAMS = ["Science", "Mathematics", "Social Science", "English", "Hindi", "JEE Main", "NEET UG", "UPSC CSE", "CA Foundation", "CUET UG", "CLAT", "NDA"];

  async function handleGenerate() {
    setLoading(true);
    const t = await generateTimetable(exam, weeks, hours, student.name);
    setTimetable(t);
    setLoading(false);
  }

  function saveEdit(i: number) {
    if (!editVal) return;
    const updated = [...timetable];
    updated[i] = editVal;
    setTimetable(updated);
    setEditing(null);
    setEditVal(null);
  }

  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 14 }}>
        Generate a personalised AI study plan for any exam — then edit each day to match your schedule.
      </p>
      <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 14, padding: "16px", border: "1px solid rgba(212,175,55,0.3)", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5c6f82", display: "block", marginBottom: 5 }}>Exam / Subject</label>
            <select value={exam} onChange={e => setExam(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid rgba(212,175,55,0.4)", background: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "inherit", outline: "none" }}>
              {EXAMS.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5c6f82", display: "block", marginBottom: 5 }}>Weeks Until Exam</label>
            <select value={weeks} onChange={e => setWeeks(parseInt(e.target.value))}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid rgba(212,175,55,0.4)", background: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "inherit", outline: "none" }}>
              {[2, 4, 6, 8, 12, 16, 24, 48].map(w => <option key={w} value={w}>{w} weeks</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5c6f82", display: "block", marginBottom: 5 }}>Hours Per Day</label>
            <select value={hours} onChange={e => setHours(parseInt(e.target.value))}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid rgba(212,175,55,0.4)", background: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "inherit", outline: "none" }}>
              {[1, 2, 3, 4, 5, 6, 8].map(h => <option key={h} value={h}>{h}h/day</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: loading ? "#a0aec0" : "linear-gradient(135deg, #D4AF37, #92400e)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {loading ? "⏳ Generating AI Timetable..." : "✨ Generate My Personalised Study Plan"}
        </button>
      </div>

      {timetable.length > 0 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0a2540", marginBottom: 10 }}>
            📅 {student.name}'s Weekly Plan — {exam}
            <span style={{ fontSize: 11, fontWeight: 400, color: "#5c6f82", marginLeft: 8 }}>✏️ Click any row to edit</span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {timetable.map((entry, i) => (
              <div key={i}>
                {editing === i && editVal ? (
                  <div style={{ background: "rgba(212,175,55,0.12)", borderRadius: 10, padding: "10px 12px", border: "2px solid #D4AF37", display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                    <input value={editVal.subject} onChange={e => setEditVal({ ...editVal, subject: e.target.value })} placeholder="Subject"
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #D4AF37", fontSize: 13, fontFamily: "inherit" }} />
                    <input value={editVal.topic} onChange={e => setEditVal({ ...editVal, topic: e.target.value })} placeholder="Topic"
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #D4AF37", fontSize: 13, fontFamily: "inherit" }} />
                    <input value={editVal.notes} onChange={e => setEditVal({ ...editVal, notes: e.target.value })} placeholder="Notes"
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #D4AF37", fontSize: 13, fontFamily: "inherit" }} />
                    <button onClick={() => saveEdit(i)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#D4AF37", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>✓</button>
                  </div>
                ) : (
                  <div onClick={() => { setEditing(i); setEditVal({ ...entry }); }}
                    style={{ display: "grid", gridTemplateColumns: "80px 110px 1fr 50px 1fr", gap: 10, alignItems: "center", padding: "10px 14px", background: entry.subject === "Rest" ? "rgba(148,163,184,0.1)" : "rgba(255,255,255,0.6)", borderRadius: 10, border: "1px solid rgba(212,175,55,0.2)", cursor: "pointer" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#D4AF37" }}>{entry.day}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#0a2540" }}>{entry.subject}</span>
                    <span style={{ fontSize: 12, color: "#425466" }}>{entry.topic}</span>
                    <span style={{ fontSize: 12, color: "#5c6f82" }}>{entry.hours}h</span>
                    <span style={{ fontSize: 12, color: "#5c6f82", fontStyle: "italic" }}>{entry.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB: IMPORTANT DATES ─────────────────────────────────────
function ImportantDatesTab() {
  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 14 }}>
        Upcoming CBSE & entrance exam dates — only future events shown.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FUTURE_DATES.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(212,175,55,0.25)", textDecoration: "none" }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540" }}>{item.event}</p>
              <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 2 }}>📅 {item.date}</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: "rgba(212,175,55,0.15)", color: "#92400e", whiteSpace: "nowrap" }}>⏳ Upcoming ↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────
export default function ModeSelector() {
  const [student, setStudent]     = useState<StudentContext | null>(null);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shauri_student");
      if (!raw) { window.location.href = "/"; return; }
      const parsed = JSON.parse(raw);
      if (!parsed?.name || !parsed?.class) { window.location.href = "/"; return; }
      setStudent(parsed);
    } catch { window.location.href = "/"; }
  }, []);

  if (!student) return null;

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "about",          label: "About Shauri",   icon: "ℹ️"  },
    { key: "lastYears",      label: "Last Years",     icon: "📄"  },
    { key: "checkResult",    label: "Check Result",   icon: "🏆"  },
    { key: "career",         label: "Career Guide",   icon: "🎯"  },
    { key: "timetable",      label: "Study Planner",  icon: "📅"  },
    { key: "importantDates", label: "Upcoming Dates", icon: "🔔"  },
  ];

  return (
    <div className={orbitron.className} style={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 45%, #E6F2FF 100%)",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .modes-main { flex: 1; width: 100%; max-width: 1400px; margin: 0 auto; padding: clamp(16px,4vw,40px) clamp(16px,4vw,32px) 48px; display: flex; flex-direction: column; }
        .welcome-name { font-size: clamp(18px,5.5vw,42px); letter-spacing: clamp(0.06em,2vw,0.22em); color: #0a2540; font-weight: 600; margin-bottom: 8px; text-align: center; word-break: break-word; }
        .welcome-class { font-size: clamp(10px,2.2vw,14px); letter-spacing: 0.18em; color: #5c6f82; text-align: center; margin-bottom: clamp(12px,2vw,20px); }
        .top-nav { display: flex; align-items: stretch; gap: 0; border-bottom: 2px solid rgba(212,175,55,0.5); overflow-x: auto; scrollbar-width: none; background: rgba(10,37,64,0.06); backdrop-filter: blur(6px); border-radius: 12px 12px 0 0; padding: 0 4px; }
        .top-nav::-webkit-scrollbar { display: none; }
        .tab-btn { padding: 10px 15px; border: none; border-bottom: 3px solid transparent; background: none; cursor: pointer; font-weight: 700; font-size: clamp(10px,1.6vw,13px); color: #5c6f82; font-family: inherit; white-space: nowrap; transition: all 0.15s; letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px; }
        .tab-btn:hover { color: #0a2540; background: rgba(212,175,55,0.1); }
        .tab-btn.active { color: #92400e; border-bottom-color: #D4AF37; background: rgba(212,175,55,0.15); }
        .tab-panel { background: rgba(255,255,255,0.5); backdrop-filter: blur(10px); border: 1px solid rgba(212,175,55,0.25); border-top: none; border-radius: 0 0 16px 16px; padding: clamp(14px,3vw,24px); margin-bottom: clamp(16px,3vw,28px); animation: fadeSlide 0.2s ease; }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .choose-h2 { text-align: center; font-size: clamp(13px,3.5vw,30px); letter-spacing: clamp(0.06em,2vw,0.28em); color: #0a2540; margin-bottom: 8px; }
        .choose-sub { text-align: center; font-size: clamp(9px,2vw,14px); letter-spacing: clamp(0.05em,1vw,0.18em); color: #5c6f82; margin-bottom: clamp(20px,4vw,44px); }
        .cards-grid { display: grid; gap: clamp(12px,3vw,28px); grid-template-columns: 1fr; }
        @media (min-width:560px) { .cards-grid { grid-template-columns: repeat(2,1fr); } }
        @media (min-width:1100px) { .cards-grid { grid-template-columns: repeat(4,1fr); } }
        .mode-card { background: rgba(255,255,255,0.55); backdrop-filter: blur(10px); border-radius: 18px; border: 1px solid rgba(212,175,55,0.35); text-decoration: none; display: flex; flex-direction: row; align-items: center; gap: 16px; padding: clamp(16px,3vw,22px) clamp(14px,3vw,20px); transition: transform 0.15s, box-shadow 0.15s; -webkit-tap-highlight-color: transparent; }
        .mode-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .mode-card:active { transform: scale(0.97); }
        @media (min-width:1100px) { .mode-card { flex-direction: column; align-items: flex-start; justify-content: space-between; min-height: 280px; padding: 28px 24px; } }
        .card-icon { font-size: clamp(32px,7vw,44px); flex-shrink: 0; line-height: 1; }
        .card-body { flex: 1; min-width: 0; }
        .card-title { font-size: clamp(10px,2.5vw,16px); letter-spacing: 0.12em; color: #D4AF37; margin-bottom: 6px; font-weight: 700; }
        .card-desc { font-size: clamp(11px,2vw,14px); color: #425466; line-height: 1.55; letter-spacing: 0; }
        .card-cta { display: none; }
        @media (min-width:1100px) { .card-cta { display: block; margin-top: 22px; width: 100%; padding: 12px; border-radius: 999px; border: 1px solid #D4AF37; color: #0a2540; text-align: center; font-size: 13px; letter-spacing: 0.16em; font-family: inherit; text-decoration: none; } }
        .privacy { margin-top: clamp(28px,5vw,54px); text-align: center; font-size: clamp(9px,1.8vw,12px); letter-spacing: 0.04em; color: #6b7c8f; line-height: 1.6; }
      `}</style>

      <Header onLogout={() => (window.location.href = "/")} />

      <main className="modes-main">
        <div className="top-nav" style={{ marginBottom: 0 }}>
          {TABS.map(tab => (
            <button key={tab.key} className={`tab-btn${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(activeTab === tab.key ? null : tab.key)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab && (
          <div className="tab-panel">
            {activeTab === "about"          && <AboutTab />}
            {activeTab === "lastYears"      && <LastYearsTab />}
            {activeTab === "checkResult"    && <CheckResultTab student={student} />}
            {activeTab === "career"         && <CareerTab studentName={student.name} />}
            {activeTab === "timetable"      && <TimetableTab student={student} />}
            {activeTab === "importantDates" && <ImportantDatesTab />}
          </div>
        )}

        <h1 className="welcome-name" style={{ marginTop: "clamp(16px,3vw,28px)" }}>WELCOME, {student.name.toUpperCase()}</h1>
        <p className="welcome-class">CLASS {student.class} · {student.board}</p>
        <h2 className="choose-h2">CHOOSE YOUR LEARNING MODE</h2>
        <p className="choose-sub">SELECT YOUR PATH TO BEGIN THE ASCENT</p>

        <div className="cards-grid">
          <ModeCard icon="🧠" title="LEARN MODE"         desc="Learn concepts with clear CBSE-aligned explanations and examples."  href="/learn"    cta="BEGIN LEARNING" />
          <ModeCard icon="🧪" title="EXAMINER MODE"      desc="Practice full-length question papers in real exam conditions."       href="/examiner" cta="BEGIN TEST" />
          <ModeCard icon="🗣️" title="ORAL MODE"          desc="Strengthen recall, fluency, and spoken confidence."                  href="/oral"     cta="BEGIN SPEAKING" />
          <ModeCard icon="📊" title="PROGRESS DASHBOARD" desc="Review strengths, identify gaps, and track your growth."             href="/progress" cta="VIEW PROGRESS" />
        </div>

        <p className="privacy">Your learning data remains private and stays on this device unless you explicitly export or share it.</p>
      </main>
    </div>
  );
}

function ModeCard({ icon, title, desc, href, cta }: { icon: string; title: string; desc: string; href: string; cta: string }) {
  return (
    <a href={href} className="mode-card">
      <div className="card-icon">{icon}</div>
      <div className="card-body">
        <h3 className="card-title">{title}</h3>
        <p className="card-desc">{desc}</p>
      </div>
      <span className="card-cta">{cta}</span>
    </a>
  );
}