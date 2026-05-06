"use client";

// ============================================================
// /components/lab/VivaQA.tsx
// Reveal-style viva question & answer component.
// Student reads question, thinks, then reveals answer.
// Tracks how many they've revealed.
// ============================================================

import React, { useState, useCallback } from "react";
import type { VivaQuestion } from "@/lib/lab/types";

interface VivaQAProps {
  questions: VivaQuestion[];
  experimentTitle: string;
}

export default function VivaQA({ questions, experimentTitle }: VivaQAProps) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const revealAll = useCallback(() => {
    setRevealed(new Set(questions.map((q) => q.id)));
  }, [questions]);

  const resetAll = useCallback(() => {
    setRevealed(new Set());
  }, []);

  const revealedCount = revealed.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">
            Viva Q&A — {experimentTitle}
          </h4>
          <p className="text-xs text-gray-400 mt-0.5">
            {revealedCount} of {questions.length} revealed
          </p>
        </div>
        <div className="flex gap-2">
          {revealedCount < questions.length && (
            <button
              onClick={revealAll}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
            >
              Reveal All
            </button>
          )}
          {revealedCount > 0 && (
            <button
              onClick={resetAll}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 bg-indigo-400 rounded-full transition-all duration-300"
          style={{ width: `${questions.length > 0 ? (revealedCount / questions.length) * 100 : 0}%` }}
        />
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const isRevealed = revealed.has(q.id);
          return (
            <div
              key={q.id}
              className="rounded-lg border border-gray-200 overflow-hidden"
            >
              {/* Question row */}
              <button
                onClick={() => toggle(q.id)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700
                  text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{q.question}</p>
                </div>
                <span className="flex-shrink-0 text-gray-300 text-lg mt-0.5">
                  {isRevealed ? "▲" : "▼"}
                </span>
              </button>

              {/* Answer */}
              {isRevealed && (
                <div className="px-4 py-3 bg-indigo-50 border-t border-indigo-100">
                  <div className="flex gap-2">
                    <span className="text-indigo-400 text-sm mt-0.5 flex-shrink-0">💡</span>
                    <p className="text-sm text-indigo-900 leading-relaxed">{q.answer}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {revealedCount === questions.length && (
        <div className="text-center py-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg">
          ✅ All viva answers reviewed. You're ready for the practical exam!
        </div>
      )}
    </div>
  );
}