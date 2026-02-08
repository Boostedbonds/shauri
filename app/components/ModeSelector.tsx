"use client";

export type Mode =
  | "teacher"
  | "examiner"
  | "oral"
  | "progress";

export default function ModeSelector({
  onSelect,
}: {
  onSelect: (mode: Mode) => void;
}) {
  return (
    <div className="screen">
      <div className="card stack">
        <h2>Select Mode</h2>
        <button onClick={() => onSelect("teacher")}>Teacher</button>
        <button onClick={() => onSelect("examiner")}>Examiner</button>
        <button onClick={() => onSelect("oral")}>Oral</button>
        <button className="secondary" onClick={() => onSelect("progress")}>
          Progress Dashboard
        </button>
      </div>
    </div>
  );
}
