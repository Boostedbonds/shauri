"use client";

// ============================================================
// /components/lab/ObservationTable.tsx — SHAURI Premium Redesign
// All logic preserved exactly. UI elevated to SHAURI design.
// ============================================================

import React, { useState, useCallback } from "react";
import type { ObservationTable as ObservationTableType, ObservationEntry } from "@/lib/lab/types";
import { validateObservationTable } from "@/lib/lab/reactionEngine";

interface ObservationTableProps {
  table: ObservationTableType;
}

export default function ObservationTable({ table }: ObservationTableProps) {
  const [entries, setEntries] = useState<ObservationEntry[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback(
    (rowId: string, value: string) => {
      setEntries((prev) => {
        const existing = prev.find((e) => e.rowId === rowId);
        if (existing)
          return prev.map((e) => (e.rowId === rowId ? { ...e, value } : e));
        return [...prev, { rowId, value }];
      });
      if (submitted) setSubmitted(false);
    },
    [submitted]
  );

  const getValue = (rowId: string) =>
    entries.find((e) => e.rowId === rowId)?.value ?? "";

  const allFilled = table.rows.every((row) => getValue(row.id).trim() !== "");

  const handleSubmit = () => setSubmitted(true);
  const handleReset = () => {
    setEntries([]);
    setSubmitted(false);
  };

  const validationResults = submitted
    ? validateObservationTable(table.rows, entries)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#9B8A6E",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Observation Table
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1C3A6E" }}>
            {table.title}
          </div>
        </div>
        {submitted && (
          <button
            onClick={handleReset}
            style={{
              background: "none",
              border: "1.5px solid #D4C4A0",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              color: "#6B5B3E",
            }}
          >
            ↺ Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 14, border: "1.5px solid #D4C4A0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {[
                "Observation",
                "Your Entry",
                ...(submitted ? ["Expected Answer"] : []),
              ].map((h, i) => (
                <th
                  key={h}
                  style={{
                    background: "#F5EED8",
                    color: "#6B5B3E",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "12px 16px",
                    textAlign: "left",
                    borderBottom: "1.5px solid #D4C4A0",
                    width: i === 0 ? "40%" : undefined,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => {
              const val = validationResults.find((v) => v.rowId === row.id);
              const isEven = idx % 2 === 0;
              return (
                <tr
                  key={row.id}
                  style={{ background: isEven ? "#FDFAF3" : "#F9F4E8" }}
                >
                  {/* Observation label */}
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#3A3020",
                      fontWeight: 600,
                      fontSize: 13,
                      borderBottom: "1px solid #EDE4D0",
                      verticalAlign: "top",
                      lineHeight: 1.5,
                    }}
                  >
                    {row.label}
                    {row.unit && (
                      <span style={{ color: "#9B8A6E", fontWeight: 500, marginLeft: 4 }}>
                        ({row.unit})
                      </span>
                    )}
                  </td>

                  {/* Student input */}
                  <td
                    style={{
                      padding: "10px 16px",
                      borderBottom: "1px solid #EDE4D0",
                      verticalAlign: "middle",
                    }}
                  >
                    <input
                      type="text"
                      value={getValue(row.id)}
                      onChange={(e) => handleChange(row.id, e.target.value)}
                      disabled={submitted}
                      placeholder="Write your observation…"
                      style={{
                        width: "100%",
                        fontSize: 13,
                        background: submitted ? "#F5EED8" : "#fff",
                        border: `1.5px solid ${submitted ? "#D4C4A0" : "#C4B89A"}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        outline: "none",
                        color: submitted ? "#6B5B3E" : "#1C1810",
                        cursor: submitted ? "not-allowed" : "text",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        if (!submitted) e.target.style.borderColor = "#1E4D91";
                      }}
                      onBlur={(e) => {
                        if (!submitted) e.target.style.borderColor = "#C4B89A";
                      }}
                    />
                  </td>

                  {/* Expected answer */}
                  {submitted && val && (
                    <td
                      style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid #EDE4D0",
                        verticalAlign: "middle",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 12,
                          fontWeight: 700,
                          background: "#EDFAF3",
                          color: "#1E6B3C",
                          border: "1.5px solid #8FD4A8",
                          borderRadius: 8,
                          padding: "5px 12px",
                        }}
                      >
                        {val.expectedValue}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      {!submitted ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={!allFilled}
            style={{
              padding: "13px",
              borderRadius: 12,
              background: allFilled ? "#1C3A6E" : "#E8DCC8",
              color: allFilled ? "#fff" : "#9B8A6E",
              border: "none",
              fontWeight: 800,
              fontSize: 14,
              cursor: allFilled ? "pointer" : "not-allowed",
              letterSpacing: "0.04em",
              transition: "all 0.2s",
            }}
          >
            Submit Observations
          </button>
          {!allFilled && (
            <p style={{ fontSize: 12, color: "#9B8A6E", textAlign: "center" }}>
              Fill all rows before submitting.
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            background: "#EDFAF3",
            border: "1.5px solid #8FD4A8",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            fontSize: 13,
            color: "#1E6B3C",
            lineHeight: 1.6,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
          <span>
            Compare your entries with the expected answers above. Use these for your practical record book.
          </span>
        </div>
      )}
    </div>
  );
}