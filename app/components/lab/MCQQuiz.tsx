"use client";

// ============================================================
// /components/lab/MCQQuiz.tsx — SHAURI Premium Redesign
// All logic preserved exactly. UI elevated to SHAURI design.
// ============================================================

import React, { useState, useCallback } from "react";
import type { MCQQuestion, MCQAttempt, MCQResult } from "@/lib/lab/types";
import { gradeMCQ } from "@/lib/lab/reactionEngine";

interface MCQQuizProps {
  questions: MCQQuestion[];
  experimentTitle: string;
}

export default function MCQQuiz({ questions, experimentTitle }: MCQQuizProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MCQResult | null>(null);

  const handleSelect = useCallback(
    (questionId: string, optionId: string) => {
      if (result) return;
      setSelections((prev) => ({ ...prev, [questionId]: optionId }));
    },
    [result]
  );

  const handleSubmit = useCallback(() => {
    const attempts: MCQAttempt[] = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: selections[q.id] ?? "",
      correct: false,
    }));
    setResult(gradeMCQ(questions, attempts));
  }, [questions, selections]);

  const handleRetry = useCallback(() => {
    setSelections({});
    setResult(null);
  }, []);

  const allAnswered = questions.every((q) => Boolean(selections[q.id]));

  const scoreColor = (pct: number) =>
    pct >= 80 ? "#1E6B3C" : pct >= 50 ? "#C17B2F" : "#B5271A";

  const scoreBg = (pct: number) =>
    pct >= 80 ? "#EDFAF3" : pct >= 50 ? "#FDF6EC" : "#FDF0EE";

  const scoreBorder = (pct: number) =>
    pct >= 80 ? "#8FD4A8" : pct >= 50 ? "#E8C98A" : "#E8A8A0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
            Practice MCQ
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1C3A6E" }}>
            {experimentTitle}
          </div>
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#9B8A6E",
            background: "#F0E8D4",
            padding: "4px 12px",
            borderRadius: 99,
          }}
        >
          {questions.length} questions
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {questions.map((question, qIdx) => {
          const selected = selections[question.id];
          const attempt = result?.attempts.find((a) => a.questionId === question.id);
          const isCorrect = attempt?.correct;
          const showResult = Boolean(result);

          const cardBg = showResult
            ? isCorrect
              ? "#EDFAF3"
              : "#FDF0EE"
            : "#FDFAF3";
          const cardBorder = showResult
            ? isCorrect
              ? "#8FD4A8"
              : "#E8A8A0"
            : "#D4C4A0";

          return (
            <div
              key={question.id}
              style={{
                background: cardBg,
                border: `1.5px solid ${cardBorder}`,
                borderRadius: 16,
                padding: "18px 20px",
                transition: "all 0.25s",
              }}
            >
              {/* Question */}
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1C3A6E",
                  lineHeight: 1.5,
                  marginBottom: 14,
                }}
              >
                <span style={{ color: "#9B8A6E", fontWeight: 600, marginRight: 6 }}>
                  Q{qIdx + 1}.
                </span>
                {question.question}
              </p>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {question.options.map((option) => {
                  const isSelected = selected === option.id;
                  const isCorrectOption = option.id === question.correctOptionId;

                  let bg = "#FDFAF3";
                  let border = "#D4C4A0";
                  let color = "#3A3020";
                  let textDecoration = "none";

                  if (showResult) {
                    if (isCorrectOption) {
                      bg = "#EDFAF3";
                      border = "#1E6B3C";
                      color = "#1E6B3C";
                    } else if (isSelected && !isCorrectOption) {
                      bg = "#FDF0EE";
                      border = "#B5271A";
                      color = "#9B8A6E";
                      textDecoration = "line-through";
                    } else {
                      bg = "#F5EED8";
                      border = "#E8DCC8";
                      color = "#B8A88A";
                    }
                  } else if (isSelected) {
                    bg = "#EEF3FC";
                    border = "#1E4D91";
                    color = "#1E4D91";
                  }

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(question.id, option.id)}
                      disabled={showResult}
                      style={{
                        background: bg,
                        border: `1.5px solid ${border}`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        cursor: showResult ? "not-allowed" : "pointer",
                        textAlign: "left",
                        fontSize: 13,
                        color,
                        fontWeight: isSelected || isCorrectOption ? 700 : 500,
                        transition: "all 0.18s",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textDecoration,
                        width: "100%",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          opacity: 0.6,
                          textTransform: "uppercase",
                          flexShrink: 0,
                          textDecoration: "none",
                        }}
                      >
                        {option.id}.
                      </span>
                      <span style={{ flex: 1 }}>{option.text}</span>
                      {showResult && isCorrectOption && (
                        <span style={{ color: "#1E6B3C", fontSize: 16, textDecoration: "none" }}>✓</span>
                      )}
                      {showResult && isSelected && !isCorrectOption && (
                        <span style={{ color: "#B5271A", fontSize: 16, textDecoration: "none" }}>✗</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showResult && (
                <div
                  style={{
                    marginTop: 14,
                    background: "#F5EED8",
                    border: "1.5px solid #D4C4A0",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "#4A3C28",
                    lineHeight: 1.7,
                  }}
                >
                  <span style={{ fontWeight: 800, color: "#6B5B3E" }}>Explanation: </span>
                  {question.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit / Score */}
      {!result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: allAnswered ? "#1C3A6E" : "#E8DCC8",
              color: allAnswered ? "#fff" : "#9B8A6E",
              border: "none",
              fontWeight: 800,
              fontSize: 14,
              cursor: allAnswered ? "pointer" : "not-allowed",
              letterSpacing: "0.04em",
              transition: "all 0.2s",
            }}
          >
            Submit Quiz
          </button>
          {!allAnswered && (
            <p style={{ fontSize: 12, color: "#9B8A6E", textAlign: "center" }}>
              Answer all {questions.length} questions to submit.
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            background: scoreBg(result.percentage),
            border: `2px solid ${scoreBorder(result.percentage)}`,
            borderRadius: 16,
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
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
                Your Score
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: scoreColor(result.percentage),
                }}
              >
                {result.score} / {result.total}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginLeft: 8,
                    color: scoreColor(result.percentage) + "AA",
                  }}
                >
                  ({result.percentage}%)
                </span>
              </div>
            </div>
            <div style={{ fontSize: 40 }}>
              {result.percentage >= 80 ? "🏆" : result.percentage >= 50 ? "📖" : "💪"}
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#4A3C28", lineHeight: 1.6, margin: 0 }}>
            {result.percentage >= 80
              ? "Excellent! You're well prepared for this topic."
              : result.percentage >= 50
              ? "Good effort. Review the explanations above and try again."
              : "Keep practicing! Read the explanations carefully and retry."}
          </p>

          <button
            onClick={handleRetry}
            style={{
              alignSelf: "flex-start",
              background: "#FDFAF3",
              border: "1.5px solid #D4C4A0",
              borderRadius: 10,
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              color: "#4A3C28",
              transition: "all 0.18s",
            }}
          >
            ↺ Retry Quiz
          </button>
        </div>
      )}
    </div>
  );
}