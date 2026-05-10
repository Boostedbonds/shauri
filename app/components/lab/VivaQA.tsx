"use client";

// ============================================================
// /components/lab/VivaQA.tsx — SHAURI Premium Redesign
// All logic preserved exactly. UI elevated to SHAURI design.
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
      next.has(id) ? next.delete(id) : next.add(id);
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
  const pct = questions.length > 0 ? Math.round((revealedCount / questions.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
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
            Viva Voce Preparation
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1C3A6E" }}>
            {experimentTitle}
          </div>
          <div style={{ fontSize: 12, color: "#9B8A6E", marginTop: 3 }}>
            {revealedCount} of {questions.length} revealed
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {revealedCount < questions.length && (
            <button
              onClick={revealAll}
              style={{
                background: "none",
                border: "1.5px solid #D4C4A0",
                borderRadius: 8,
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: "#1E4D91",
              }}
            >
              Reveal All
            </button>
          )}
          {revealedCount > 0 && (
            <button
              onClick={resetAll}
              style={{
                background: "none",
                border: "1.5px solid #D4C4A0",
                borderRadius: 8,
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: "#9B8A6E",
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 99,
          background: "#E8DCC8",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: pct === 100 ? "#1E6B3C" : "#1E4D91",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {questions.map((q, idx) => {
          const isRevealed = revealed.has(q.id);
          return (
            <div
              key={q.id}
              style={{
                borderRadius: 14,
                border: `1.5px solid ${isRevealed ? "#B5CCE8" : "#D4C4A0"}`,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {/* Question row */}
              <button
                onClick={() => toggle(q.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  background: isRevealed ? "#EEF3FC" : "#FDFAF3",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                {/* Number badge */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: isRevealed ? "#1E4D91" : "#F0E8D4",
                    color: isRevealed ? "#fff" : "#6B5B3E",
                    fontSize: 12,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                    transition: "all 0.2s",
                  }}
                >
                  {idx + 1}
                </div>

                {/* Question text */}
                <p
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 700,
                    color: isRevealed ? "#1C3A6E" : "#3A3020",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {q.question}
                </p>

                {/* Toggle indicator */}
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 18,
                    color: isRevealed ? "#1E4D91" : "#C4B89A",
                    marginTop: 2,
                    transition: "color 0.2s",
                  }}
                >
                  {isRevealed ? "▲" : "▼"}
                </span>
              </button>

              {/* Answer */}
              {isRevealed && (
                <div
                  style={{
                    padding: "14px 16px",
                    background: "#F5EED8",
                    borderTop: "1.5px solid #D4C4A0",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 16,
                      marginTop: 1,
                    }}
                  >
                    💡
                  </span>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#3A3020",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {q.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion banner */}
      {revealedCount === questions.length && (
        <div
          style={{
            background: "#EDFAF3",
            border: "1.5px solid #8FD4A8",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 700,
            color: "#1E6B3C",
          }}
        >
          <span style={{ fontSize: 18 }}>✅</span>
          All viva answers reviewed. You're ready for the practical exam!
        </div>
      )}

      {/* Study tip */}
      <div
        style={{
          background: "#FDF6EC",
          border: "1.5px solid #E8C98A",
          borderRadius: 12,
          padding: "12px 16px",
          fontSize: 12,
          color: "#5A4020",
          lineHeight: 1.7,
        }}
      >
        <span style={{ fontWeight: 800, color: "#C17B2F" }}>💡 Board Tip: </span>
        Read each question, think of your answer first, then reveal. This active recall method is proven to improve viva performance significantly.
      </div>
    </div>
  );
}