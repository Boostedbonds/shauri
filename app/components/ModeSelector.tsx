"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "600", "700"] });

type StudentContext = { name: string; class: string; board: string };
type Tab = "lastYears" | "checkResult" | "career" | "timetable" | "importantDates";

// ─── DATA ────────────────────────────────────────────────────
const LAST_YEARS = [
  { year: "2024", subjects: ["Science", "Mathematics", "English", "Hindi", "Social Science"] },
  { year: "2023", subjects: ["Science", "Mathematics", "English", "Hindi", "Social Science"] },
  { year: "2022", subjects: ["Science", "Mathematics", "English", "Hindi", "Social Science"] },
  { year: "2020", subjects: ["Science", "Mathematics", "English", "Hindi", "Social Science"] },
  { year: "2019", subjects: ["Science", "Mathematics", "English", "Hindi", "Social Science"] },
];

const TIMETABLE_2025 = [
  { date: "15 Feb 2025", day: "Saturday",  subject: "Hindi Course A & B",           code: "002/085" },
  { date: "17 Feb 2025", day: "Monday",    subject: "Mathematics Basic & Standard",  code: "241/041" },
  { date: "19 Feb 2025", day: "Wednesday", subject: "Science",                       code: "086" },
  { date: "21 Feb 2025", day: "Friday",    subject: "Social Science",                code: "087" },
  { date: "24 Feb 2025", day: "Monday",    subject: "English Language & Literature", code: "184" },
  { date: "26 Feb 2025", day: "Wednesday", subject: "Sanskrit",                      code: "122" },
  { date: "28 Feb 2025", day: "Friday",    subject: "Computer Applications",         code: "165" },
  { date: "03 Mar 2025", day: "Monday",    subject: "Home Science",                  code: "064" },
  { date: "05 Mar 2025", day: "Wednesday", subject: "Elements of Business",          code: "054" },
  { date: "07 Mar 2025", day: "Friday",    subject: "Painting",                      code: "049" },
  { date: "12 Mar 2025", day: "Wednesday", subject: "National Cadet Corps",          code: "076" },
  { date: "15 Mar 2025", day: "Saturday",  subject: "Urdu Course A & B",             code: "003/303" },
  { date: "17 Mar 2025", day: "Monday",    subject: "Elements of Book Keeping",      code: "254" },
  { date: "19 Mar 2025", day: "Wednesday", subject: "Music (Hindustani)",            code: "031/032/033" },
  { date: "22 Mar 2025", day: "Saturday",  subject: "Retail / Security / IT / Auto", code: "401-411" },
];

const IMPORTANT_DATES = [
  { event: "Board Exam Registration",       date: "Aug – Oct 2024",  status: "done",     icon: "📋" },
  { event: "Admit Card Download",           date: "Jan 2025",        status: "done",     icon: "🪪" },
  { event: "Class 10 Board Exams Begin",    date: "15 Feb 2025",     status: "done",     icon: "✍️" },
  { event: "Class 10 Board Exams End",      date: "22 Mar 2025",     status: "done",     icon: "🏁" },
  { event: "Practical / Internal Exams",    date: "Jan – Feb 2025",  status: "done",     icon: "🔬" },
  { event: "Result Declaration (Expected)", date: "May 2025",        status: "upcoming", icon: "🏆" },
  { event: "Compartment Exams",             date: "July 2025",       status: "upcoming", icon: "📝" },
  { event: "Class 11 Admission",            date: "May – June 2025", status: "upcoming", icon: "🎓" },
  { event: "NTSE Stage 1",                  date: "Nov 2024",        status: "done",     icon: "🧠" },
  { event: "NTSE Stage 2",                  date: "June 2025",       status: "upcoming", icon: "🧠" },
];

const CAREER_STREAMS = [
  {
    stream: "Science (PCM)", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "🔭",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    careers: ["Engineering (JEE)", "Architecture (NATA)", "Defence (NDA)", "Merchant Navy", "BCA / B.Sc IT", "Data Science", "Pilot / Aviation"],
    exams: ["JEE Main", "JEE Advanced", "BITSAT", "NDA", "VITEEE"],
  },
  {
    stream: "Science (PCB)", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: "🧬",
    subjects: ["Physics", "Chemistry", "Biology"],
    careers: ["Medical (MBBS)", "Dentistry (BDS)", "Pharmacy", "Nursing", "Biotechnology", "Veterinary", "Physiotherapy"],
    exams: ["NEET UG", "AIIMS", "JIPMER", "NIPER"],
  },
  {
    stream: "Commerce", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "📊",
    subjects: ["Accountancy", "Business Studies", "Economics", "Mathematics (optional)"],
    careers: ["CA (Chartered Accountant)", "CS (Company Secretary)", "Banking / Finance", "MBA", "Economics / Statistics", "Stock Market / Trading"],
    exams: ["CA Foundation", "CS Foundation", "CLAT", "BBA Entrances", "IPM IIM"],
  },
  {
    stream: "Arts / Humanities", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: "🏛️",
    subjects: ["History", "Political Science", "Geography", "Psychology", "Sociology"],
    careers: ["IAS / IPS (UPSC)", "Law (LLB)", "Journalism", "Psychology", "Social Work", "Teaching / Education", "Mass Communication"],
    exams: ["UPSC CSE", "CLAT", "CUET", "NLU Entrances", "Mass Comm Entrances"],
  },
];

const SCHOLARSHIPS = [
  { name: "NTSE",                     amount: "₹1,250/month",          eligibility: "Class 10 board + NTSE Stage 1 & 2",         deadline: "Oct–Nov each year" },
  { name: "PM Yashasvi Scholarship",  amount: "₹75,000–1,25,000/year", eligibility: "OBC/EBC/DNT, income < ₹2.5L",               deadline: "Aug–Sep each year" },
  { name: "INSPIRE (DST)",            amount: "₹80,000/year",          eligibility: "Top 1% in Class 10, taking Science in 11",   deadline: "Dec each year" },
  { name: "Central Sector Scholarship",amount: "₹10,000–20,000/year", eligibility: "Top 80th percentile, income < ₹4.5L",        deadline: "After Class 12" },
  { name: "Vidyalakshmi Loan Portal", amount: "Up to ₹6.5L (no collateral)", eligibility: "Any student, bank-linked portal",    deadline: "Year-round" },
];

const UPSC_STEPS = [
  { stage: "Class 11–12", action: "Any stream works. Start reading NCERT carefully.",                  tip: "NCERT books are UPSC gold." },
  { stage: "Graduation",  action: "Any degree works. Start optional subject prep.",                    tip: "History, Pol Sci, Geography are popular optionals." },
  { stage: "Age 21–32",   action: "Apply for UPSC CSE (Prelims → Mains → Interview).",                tip: "Average age of selection: 26–27 years." },
  { stage: "Services",    action: "IAS, IPS, IFS, IRS, IAAS and 20+ other All India Services.",       tip: "Rank determines which service you get." },
];

// ─── TAB PANELS ──────────────────────────────────────────────

function LastYearsTab() {
  const [expanded, setExpanded] = useState<string | null>("2024");
  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 16 }}>
        Access official CBSE Class 10 previous year question papers. Click any subject to open.
      </p>
      {LAST_YEARS.map(({ year, subjects }) => (
        <div key={year} style={{ marginBottom: 10, border: "1px solid rgba(212,175,55,0.3)", borderRadius: 12, overflow: "hidden" }}>
          <button
            onClick={() => setExpanded(expanded === year ? null : year)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 18px", background: expanded === year ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.5)",
              border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#0a2540",
              fontFamily: "inherit",
            }}
          >
            <span>📄 CBSE Class 10 — {year}</span>
            <span style={{ color: "#D4AF37" }}>{expanded === year ? "▲" : "▼"}</span>
          </button>
          {expanded === year && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 18px", background: "rgba(255,255,255,0.7)" }}>
              {subjects.map(sub => (
                <a key={sub} href="https://cbseacademic.nic.in" target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: "6px 14px", borderRadius: 8, background: "rgba(212,175,55,0.1)",
                    border: "1px solid rgba(212,175,55,0.4)", color: "#0a2540", fontSize: 13,
                    fontWeight: 600, textDecoration: "none",
                  }}>
                  {sub} →
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
      <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 12 }}>
        💡 For all papers & marking schemes:{" "}
        <a href="https://cbseacademic.nic.in" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB" }}>cbseacademic.nic.in ↗</a>
      </p>
    </div>
  );
}

function CheckResultTab() {
  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 16 }}>
        Check your CBSE Class 10 result directly on the official portal. Results expected <strong>May 2025</strong>.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Official CBSE Result", url: "https://results.cbse.nic.in", color: "#D4AF37" },
          { label: "DigiLocker",           url: "https://www.digilocker.gov.in", color: "#16A34A" },
          { label: "UMANG App",            url: "https://web.umang.gov.in",      color: "#7C3AED" },
        ].map(({ label, url, color }) => (
          <a key={label} href={url} target="_blank" rel="noopener noreferrer"
            style={{
              padding: "10px 20px", borderRadius: 10,
              border: `2px solid ${color}`, color: color,
              fontSize: 14, fontWeight: 700, textDecoration: "none",
              background: "rgba(255,255,255,0.6)",
            }}>
            {label} ↗
          </a>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "What you need", items: ["Roll Number (from Admit Card)", "School Number", "Date of Birth", "Centre Number"] },
          { label: "After result",  items: ["Download Marksheet from DigiLocker", "Apply for Re-evaluation if needed", "Start Class 11 admission process", "Keep original marksheet safe"] },
        ].map(({ label, items }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "14px 16px", border: "1px solid rgba(212,175,55,0.25)" }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540", marginBottom: 8 }}>{label}</p>
            {items.map(item => <p key={item} style={{ fontSize: 12, color: "#5c6f82", marginBottom: 5 }}>• {item}</p>)}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#92400e", marginTop: 12, background: "rgba(254,243,199,0.8)", padding: "10px 14px", borderRadius: 8 }}>
        ⚠️ Result links only activate after CBSE officially declares results. Bookmark and check back in May 2025.
      </p>
    </div>
  );
}

function CareerTab({ studentName }: { studentName: string }) {
  const [activeStream, setActiveStream] = useState(0);
  const [section, setSection] = useState<"streams" | "scholarships" | "upsc">("streams");
  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 14 }}>
        Hey {studentName}! Here's your complete career roadmap after Class 10 boards.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "streams", label: "🎯 Stream Guide" },
          { key: "scholarships", label: "💰 Scholarships" },
          { key: "upsc", label: "🏛️ UPSC Path" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setSection(key as any)}
            style={{
              padding: "7px 16px", borderRadius: 20,
              border: `2px solid ${section === key ? "#D4AF37" : "rgba(212,175,55,0.3)"}`,
              background: section === key ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.5)",
              color: section === key ? "#0a2540" : "#5c6f82",
              fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>
            {label}
          </button>
        ))}
      </div>

      {section === "streams" && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {CAREER_STREAMS.map((s, i) => (
              <button key={i} onClick={() => setActiveStream(i)}
                style={{
                  padding: "6px 14px", borderRadius: 8,
                  border: `2px solid ${activeStream === i ? s.color : "rgba(212,175,55,0.25)"}`,
                  background: activeStream === i ? s.bg : "rgba(255,255,255,0.5)",
                  color: activeStream === i ? s.color : "#5c6f82",
                  fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}>
                {s.icon} {s.stream}
              </button>
            ))}
          </div>
          {(() => {
            const s = CAREER_STREAMS[activeStream];
            return (
              <div style={{ border: `2px solid ${s.border}`, borderRadius: 14, padding: 18, background: s.bg }}>
                <p style={{ fontWeight: 800, fontSize: 15, color: s.color, marginBottom: 14 }}>{s.icon} {s.stream}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 12, color: "#0a2540", marginBottom: 8 }}>📚 Subjects</p>
                    {s.subjects.map(sub => <p key={sub} style={{ fontSize: 12, color: "#425466", marginBottom: 4 }}>• {sub}</p>)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 12, color: "#0a2540", marginBottom: 8 }}>🚀 Careers</p>
                    {s.careers.map(c => <p key={c} style={{ fontSize: 12, color: "#425466", marginBottom: 4 }}>• {c}</p>)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 12, color: "#0a2540", marginBottom: 8 }}>📝 Entrance Exams</p>
                    {s.exams.map(e => (
                      <span key={e} style={{
                        display: "inline-block", margin: "0 4px 6px 0", padding: "3px 9px",
                        borderRadius: 20, background: "#fff", border: `1px solid ${s.border}`,
                        fontSize: 11, color: s.color, fontWeight: 600,
                      }}>{e}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {section === "scholarships" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SCHOLARSHIPS.map(s => (
            <div key={s.name} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "14px 18px", border: "1px solid rgba(212,175,55,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#0a2540" }}>{s.name}</p>
                <span style={{ padding: "3px 10px", borderRadius: 20, background: "#d1fae5", color: "#065f46", fontSize: 12, fontWeight: 700 }}>{s.amount}</span>
              </div>
              <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 5 }}>✅ <strong>Eligibility:</strong> {s.eligibility}</p>
              <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 3 }}>📅 <strong>Deadline:</strong> {s.deadline}</p>
            </div>
          ))}
        </div>
      )}

      {section === "upsc" && (
        <div>
          <p style={{ fontSize: 13, color: "#5c6f82", marginBottom: 14, lineHeight: 1.6 }}>
            UPSC is India's most prestigious exam. <strong>Any stream</strong> from Class 11 works — what matters is dedication and the right strategy.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {UPSC_STEPS.map((u, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(212,175,55,0.25)" }}>
                <span style={{ minWidth: 28, height: 28, borderRadius: "50%", background: "#0a2540", color: "#D4AF37", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540" }}>{u.stage}</p>
                  <p style={{ fontSize: 12, color: "#425466", marginTop: 3 }}>{u.action}</p>
                  <p style={{ fontSize: 11, color: "#D97706", marginTop: 3 }}>💡 {u.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimetableTab() {
  const today = new Date();
  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 14 }}>
        Official CBSE Class 10 Board Exam Timetable 2025. All exams start at <strong>10:30 AM</strong>.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0a2540" }}>
              {["Date", "Day", "Subject", "Code"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#D4AF37", fontWeight: 700, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIMETABLE_2025.map((row, i) => {
              const isPast = new Date(row.date + " 2025") < today;
              return (
                <tr key={i} style={{ background: isPast ? "rgba(255,255,255,0.3)" : i % 2 === 0 ? "rgba(255,255,255,0.6)" : "rgba(255,243,217,0.5)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: isPast ? "#94a3b8" : "#0a2540", whiteSpace: "nowrap" }}>{row.date}</td>
                  <td style={{ padding: "10px 14px", color: isPast ? "#94a3b8" : "#425466" }}>{row.day}</td>
                  <td style={{ padding: "10px 14px", color: isPast ? "#94a3b8" : "#0a2540", fontWeight: isPast ? 400 : 600 }}>{isPast ? "✓ " : "📌 "}{row.subject}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: isPast ? "rgba(148,163,184,0.15)" : "rgba(212,175,55,0.15)", color: isPast ? "#94a3b8" : "#92400e" }}>{row.code}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 12 }}>
        📥 Download official timetable:{" "}
        <a href="https://www.cbse.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB" }}>cbse.gov.in ↗</a>
      </p>
    </div>
  );
}

function ImportantDatesTab() {
  return (
    <div>
      <p style={{ color: "#5c6f82", fontSize: 13, marginBottom: 14 }}>
        Key CBSE dates for Class 10 students — 2024-25 academic year.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {IMPORTANT_DATES.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14,
            background: item.status === "upcoming" ? "rgba(254,243,199,0.8)" : "rgba(255,255,255,0.5)",
            borderRadius: 10, padding: "12px 16px",
            border: `1px solid ${item.status === "upcoming" ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.2)"}`,
          }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#0a2540" }}>{item.event}</p>
              <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 2 }}>📅 {item.date}</p>
            </div>
            <span style={{
              padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: item.status === "upcoming" ? "rgba(212,175,55,0.2)" : "#d1fae5",
              color: item.status === "upcoming" ? "#92400e" : "#065f46",
            }}>
              {item.status === "upcoming" ? "⏳ Upcoming" : "✅ Done"}
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#5c6f82", marginTop: 12 }}>
        🔔 Follow{" "}
        <a href="https://www.cbse.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB" }}>cbse.gov.in ↗</a>
        {" "}for real-time updates.
      </p>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function ModeSelector() {
  const [student, setStudent] = useState<StudentContext | null>(null);
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
    { key: "lastYears",      label: "Last Years",      icon: "📄" },
    { key: "checkResult",    label: "Check Result",    icon: "🏆" },
    { key: "career",         label: "Career Guide",    icon: "🎯" },
    { key: "timetable",      label: "Timetable",       icon: "📅" },
    { key: "importantDates", label: "Important Dates", icon: "🔔" },
  ];

  return (
    <div className={orbitron.className} style={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 45%, #E6F2FF 100%)",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .modes-main {
          flex: 1; width: 100%; max-width: 1400px;
          margin: 0 auto;
          padding: clamp(16px, 4vw, 40px) clamp(16px, 4vw, 32px) 48px;
          display: flex; flex-direction: column;
        }
        .about-link {
          font-size: clamp(10px, 2vw, 13px);
          letter-spacing: 0.18em; color: #5c6f82;
          text-decoration: none; display: block;
          margin-bottom: clamp(16px, 3vw, 28px);
        }
        .welcome-name {
          font-size: clamp(18px, 5.5vw, 42px);
          letter-spacing: clamp(0.06em, 2vw, 0.22em);
          color: #0a2540; font-weight: 600;
          margin-bottom: 8px; text-align: center;
          word-break: break-word;
        }
        .welcome-class {
          font-size: clamp(10px, 2.2vw, 14px);
          letter-spacing: 0.18em; color: #5c6f82;
          text-align: center;
          margin-bottom: clamp(20px, 4vw, 28px);
        }

        /* ── TABS ── */
        .tabs-bar {
          width: 100%;
          border-bottom: 1.5px solid rgba(212,175,55,0.35);
          margin-bottom: 0;
          overflow-x: auto;
          display: flex;
          gap: 0;
          scrollbar-width: none;
        }
        .tabs-bar::-webkit-scrollbar { display: none; }
        .tab-btn {
          padding: 12px 18px;
          border: none;
          border-bottom: 3px solid transparent;
          background: none;
          cursor: pointer;
          font-weight: 700;
          font-size: clamp(11px, 2vw, 14px);
          color: #5c6f82;
          font-family: inherit;
          white-space: nowrap;
          transition: all 0.15s;
          letter-spacing: 0.05em;
        }
        .tab-btn.active {
          color: #D4AF37;
          border-bottom-color: #D4AF37;
        }
        .tab-panel {
          background: rgba(255,255,255,0.45);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(212,175,55,0.25);
          border-top: none;
          border-radius: 0 0 16px 16px;
          padding: clamp(16px, 3vw, 24px);
          margin-bottom: clamp(20px, 4vw, 34px);
          animation: fadeSlide 0.2s ease;
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .choose-h2 {
          text-align: center;
          font-size: clamp(13px, 3.5vw, 30px);
          letter-spacing: clamp(0.06em, 2vw, 0.28em);
          color: #0a2540;
          margin-bottom: 8px;
        }
        .choose-sub {
          text-align: center;
          font-size: clamp(9px, 2vw, 14px);
          letter-spacing: clamp(0.05em, 1vw, 0.18em);
          color: #5c6f82;
          margin-bottom: clamp(20px, 4vw, 44px);
        }
        .cards-grid {
          display: grid;
          gap: clamp(12px, 3vw, 28px);
          grid-template-columns: 1fr;
        }
        @media (min-width: 560px) {
          .cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1100px) {
          .cards-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .mode-card {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          border: 1px solid rgba(212,175,55,0.35);
          text-decoration: none;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
          padding: clamp(16px, 3vw, 22px) clamp(14px, 3vw, 20px);
          transition: transform 0.15s, box-shadow 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .mode-card:active { transform: scale(0.97); }
        @media (min-width: 1100px) {
          .mode-card {
            flex-direction: column; align-items: flex-start;
            justify-content: space-between;
            min-height: 280px;
            padding: 28px 24px;
          }
        }
        .card-icon {
          font-size: clamp(32px, 7vw, 44px);
          flex-shrink: 0; line-height: 1;
        }
        .card-body { flex: 1; min-width: 0; }
        .card-title {
          font-size: clamp(10px, 2.5vw, 16px);
          letter-spacing: 0.12em; color: #D4AF37;
          margin-bottom: 6px; font-weight: 700;
        }
        .card-desc {
          font-size: clamp(11px, 2vw, 14px);
          color: #425466; line-height: 1.55;
          letter-spacing: 0;
        }
        .card-cta { display: none; }
        @media (min-width: 1100px) {
          .card-cta {
            display: block; margin-top: 22px; width: 100%;
            padding: 12px; border-radius: 999px;
            border: 1px solid #D4AF37; color: #0a2540;
            text-align: center; font-size: 13px;
            letter-spacing: 0.16em; font-family: inherit;
            text-decoration: none;
          }
        }
        .privacy {
          margin-top: clamp(28px, 5vw, 54px);
          text-align: center; font-size: clamp(9px, 1.8vw, 12px);
          letter-spacing: 0.04em; color: #6b7c8f; line-height: 1.6;
        }
      `}</style>

      <Header onLogout={() => (window.location.href = "/")} />

      <main className="modes-main">
        <a href="/about" className="about-link">ABOUT SHAURI</a>

        <h1 className="welcome-name">WELCOME, {student.name.toUpperCase()}</h1>
        <p className="welcome-class">CLASS {student.class} · {student.board}</p>

        {/* ── TABS BAR ── */}
        <div className="tabs-bar">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`tab-btn${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(activeTab === tab.key ? null : tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB PANEL ── */}
        {activeTab && (
          <div className="tab-panel">
            {activeTab === "lastYears"      && <LastYearsTab />}
            {activeTab === "checkResult"    && <CheckResultTab />}
            {activeTab === "career"         && <CareerTab studentName={student.name} />}
            {activeTab === "timetable"      && <TimetableTab />}
            {activeTab === "importantDates" && <ImportantDatesTab />}
          </div>
        )}

        <h2 className="choose-h2">CHOOSE YOUR LEARNING MODE</h2>
        <p className="choose-sub">SELECT YOUR PATH TO BEGIN THE ASCENT</p>

        <div className="cards-grid">
          <ModeCard icon="🧠" title="LEARN MODE"
            desc="Learn concepts with clear CBSE-aligned explanations and examples."
            href="/learn" cta="BEGIN LEARNING" />
          <ModeCard icon="🧪" title="EXAMINER MODE"
            desc="Practice full-length question papers in real exam conditions."
            href="/examiner" cta="BEGIN TEST" />
          <ModeCard icon="🗣️" title="ORAL MODE"
            desc="Strengthen recall, fluency, and spoken confidence."
            href="/oral" cta="BEGIN SPEAKING" />
          <ModeCard icon="📊" title="PROGRESS DASHBOARD"
            desc="Review strengths, identify gaps, and track your growth."
            href="/progress" cta="VIEW PROGRESS" />
        </div>

        <p className="privacy">
          Your learning data remains private and stays on this device unless you explicitly export or share it.
        </p>
      </main>
    </div>
  );
}

function ModeCard({ icon, title, desc, href, cta }: {
  icon: string; title: string; desc: string; href: string; cta: string;
}) {
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