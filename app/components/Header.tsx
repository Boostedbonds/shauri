"use client";

export default function Header({ onLogout }: { onLogout?: () => void }) {
  return (
    <header
      style={{
        padding: "18px 36px",
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            color: "#1e3a8a",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          SHAURI
        </h2>
        <small
          style={{
            color: "#475569",
            fontSize: 14,
          }}
        >
          CBSE-Aligned Adaptive Learning Platform
        </small>
      </div>

      {onLogout && (
        <button
          onClick={onLogout}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "1px solid #2563eb",
            background: "#ffffff",
            color: "#2563eb",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          Logout
        </button>
      )}
    </header>
  );
}
