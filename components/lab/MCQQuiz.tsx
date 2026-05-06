"use client";

// ============================================================
// /components/lab/MCQQuiz.tsx
// MCQ quiz engine with per-question feedback, scoring,
// explanations, and retry support.
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

  const handleSelect = useCallback((questionId: string, optionId: string) => {
    if (result) return; // lock after submission
    setSelections((prev) => ({ ...prev, [questionId]: optionId }));
  }, [result]);

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
    pct >= 80 ? "text-green-700" : pct >= 50 ? "text-yellow-700" : "text-red-600";

  const scoreBg = (pct: number) =>
    pct >= 80 ? "bg-green-50 border-green-300" : pct >= 50 ? "bg-yellow-50 border-yellow-300" : "bg-red-50 border-red-300";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          Practice MCQ — {experimentTitle}
        </h4>
        <span className="text-xs text-gray-400">{questions.length} questions</span>
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((question, qIdx) => {
          const selected = selections[question.id];
          const attempt = result?.attempts.find((a) => a.questionId === question.id);
          const isCorrect = attempt?.correct;
          const showResult = Boolean(result);

          return (
            <div
              key={question.id}
              className={`rounded-lg border p-4 space-y-3 transition-colors
                ${showResult
                  ? isCorrect
                    ? "border-green-300 bg-green-50"
                    : "border-red-300 bg-red-50"
                  : "border-gray-200 bg-white"
                }`}
            >
              {/* Question text */}
              <p className="text-sm font-medium text-gray-800">
                <span className="text-gray-400 mr-2">Q{qIdx + 1}.</span>
                {question.question}
              </p>

              {/* Options */}
              <div className="space-y-2">
                {question.options.map((option) => {
                  const isSelected = selected === option.id;
                  const isCorrectOption = option.id === question.correctOptionId;

                  let optionStyle = "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50";

                  if (showResult) {
                    if (isCorrectOption) {
                      optionStyle = "border-green-400 bg-green-100 text-green-800";
                    } else if (isSelected && !isCorrectOption) {
                      optionStyle = "border-red-400 bg-red-100 text-red-700 line-through";
                    } else {
                      optionStyle = "border-gray-100 bg-gray-50 text-gray-400";
                    }
                  } else if (isSelected) {
                    optionStyle = "border-indigo-500 bg-indigo-50 text-indigo-800";
                  }

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(question.id, option.id)}
                      disabled={showResult}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg border-2 transition-all duration-100
                        ${optionStyle}
                        disabled:cursor-not-allowed`}
                    >
                      <span className="font-semibold mr-2 uppercase text-xs opacity-60">
                        {option.id}.
                      </span>
                      {option.text}
                      {showResult && isCorrectOption && (
                        <span className="ml-2 text-green-600">✓</span>
                      )}
                      {showResult && isSelected && !isCorrectOption && (
                        <span className="ml-2 text-red-500">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (after submission) */}
              {showResult && (
                <div className="text-xs bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-600 leading-relaxed">
                  <span className="font-semibold text-gray-700">Explanation: </span>
                  {question.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit / Retry */}
      {!result ? (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold
            hover:bg-indigo-700 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Quiz
        </button>
      ) : (
        <div className={`rounded-lg border-2 p-4 space-y-3 ${scoreBg(result.percentage)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Your Score</p>
              <p className={`text-2xl font-bold ${scoreColor(result.percentage)}`}>
                {result.score} / {result.total}
                <span className="text-base ml-2 font-normal">({result.percentage}%)</span>
              </p>
            </div>
            <div className="text-4xl">
              {result.percentage >= 80 ? "🏆" : result.percentage >= 50 ? "📚" : "💪"}
            </div>
          </div>
          <p className="text-xs text-gray-600">
            {result.percentage >= 80
              ? "Excellent! You're well prepared for this topic."
              : result.percentage >= 50
              ? "Good effort. Review the explanations above and try again."
              : "Keep practicing! Read the explanations carefully and retry."}
          </p>
          <button
            onClick={handleRetry}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700
              hover:bg-gray-50 transition-colors"
          >
            Retry Quiz
          </button>
        </div>
      )}

      {!allAnswered && !result && (
        <p className="text-xs text-gray-400 text-center">
          Answer all {questions.length} questions to submit.
        </p>
      )}
    </div>
  );
}