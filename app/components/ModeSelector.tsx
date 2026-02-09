"use client";

import Header from "./Header";

export default function ModeSelector() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #e0e7ff 100%)",
      }}
    >
      <Header onLogout={() => (window.location.href = "/")} />

      <main
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "64px 32px",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            fontSize: 40,
            marginBottom: 10,
          }}
        >
          Choose Your Learning Mode
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#475569",
            marginBottom: 56,
            fontSize: 18,
          }}
        >
          Select how you want to study today
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 36,
          }}
        >
          <ModeCard
            icon="👩‍🏫"
            title="Teacher Mode"
            desc="Learn concepts with clear NCERT-aligned explanations and examples."
            color="#2563eb"
            href="/teacher"
          />

          <ModeCard
            icon="🧪"
            title="Examiner Mode"
            desc="Practice full-length question papers with evaluation and feedback."
            color="#16a34a"
            href="/examiner"
          />

          <ModeCard
            icon="🗣️"
            title="Oral Mode"
            desc="Strengthen recall and confidence with spoken question practice."
            color="#9333ea"
            href="/oral"
          />

          <ModeCard
            icon="📊"
            title="Progress Dashboard"
            desc="Track performance, strengths, weaknesses, and improvements."
            color="#ea580c"
            href="/progress"
          />
        </div>
      </main>
    </div>
  );
}

function ModeCard(props: {
  icon: string;
  title: string;
  desc: string;
  color: string;
  href: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 22,
        padding: "32px 28px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 340,
      }}
    >
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{props.icon}</div>

        <h3 style={{ marginBottom: 14, fontSize: 24 }}>
          {props.title}
        </h3>

        <p
          style={{
            color: "#475569",
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          {props.desc}
        </p>
      </div>

      <a
        href={props.href}
        style={{
          marginTop: 28,
          padding: "14px",
          background: props.color,
          color: "#ffffff",
          borderRadius: 14,
          textDecoration: "none",
          textAlign: "center",
          fontWeight: 600,
          fontSize: 18,
        }}
      >
        Start Learning →
      </a>
    </div>
  );
}
