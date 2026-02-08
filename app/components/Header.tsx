"use client";

import { clearStudent } from "../lib/student";

export default function Header() {
  function changeClass() {
    if (!confirm("Change student name or class?")) return;
    clearStudent();
    location.reload();
  }

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: "1px solid #ddd",
      }}
    >
      <strong>StudyMate</strong>

      <button
        onClick={changeClass}
        style={{
          fontSize: "12px",
          padding: "6px 10px",
          cursor: "pointer",
        }}
      >
        Change Class / Name
      </button>
    </header>
  );
}
