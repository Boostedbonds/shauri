"use client";

// ============================================================
// /components/lab/ObservationTable.tsx
// Fill-in observation table. Student fills values,
// submits, then sees expected answers side-by-side.
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

  const handleChange = useCallback((rowId: string, value: string) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.rowId === rowId);
      if (existing) return prev.map((e) => e.rowId === rowId ? { ...e, value } : e);
      return [...prev, { rowId, value }];
    });
    if (submitted) setSubmitted(false);
  }, [submitted]);

  const getValue = (rowId: string) =>
    entries.find((e) => e.rowId === rowId)?.value ?? "";

  const allFilled = table.rows.every((row) => getValue(row.id).trim() !== "");

  const handleSubmit = () => setSubmitted(true);
  const handleReset = () => { setEntries([]); setSubmitted(false); };

  const validationResults = submitted
    ? validateObservationTable(table.rows, entries)
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{table.title}</h4>
        {submitted && (
          <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Reset
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 w-2/5">
                Observation
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                Your Entry
              </th>
              {submitted && (
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  Expected Answer
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => {
              const val = validationResults.find((v) => v.rowId === row.id);
              const isEven = idx % 2 === 0;
              return (
                <tr key={row.id} className={isEven ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-2.5 text-gray-700 border-b border-gray-100 align-top">
                    {row.label}
                    {row.unit && <span className="text-gray-400 ml-1">({row.unit})</span>}
                  </td>
                  <td className="px-4 py-2.5 border-b border-gray-100">
                    <input
                      type="text"
                      value={getValue(row.id)}
                      onChange={(e) => handleChange(row.id, e.target.value)}
                      disabled={submitted}
                      placeholder="Write your observation…"
                      className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5
                        focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
                        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                        placeholder:text-gray-300"
                    />
                  </td>
                  {submitted && val && (
                    <td className="px-4 py-2.5 border-b border-gray-100">
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1 inline-block">
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

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!allFilled}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium
            hover:bg-indigo-700 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Observations
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span>✅</span>
          <span>Compare your entries with the expected answers above. Use these for your practical record.</span>
        </div>
      )}

      {!allFilled && !submitted && (
        <p className="text-xs text-gray-400">Fill all rows before submitting.</p>
      )}
    </div>
  );
}