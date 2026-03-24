"use client";

import type { Question } from "@/lib/types";

const COLORS = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-green-500 hover:bg-green-600",
  "bg-yellow-500 hover:bg-yellow-600",
];

const LABELS = ["A", "B", "C", "D"];

interface QuestionCardProps {
  question: Question;
  onAnswer?: (answer: string) => void;
  disabled?: boolean;
  showCorrect?: boolean;
  selectedAnswer?: string;
}

export default function QuestionCard({
  question,
  onAnswer,
  disabled,
  showCorrect,
  selectedAnswer,
}: QuestionCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-6">
        {question.text}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.options.map((option, i) => {
          const isCorrect = showCorrect && option === question.correct_answer;
          const isWrong =
            showCorrect &&
            selectedAnswer === option &&
            option !== question.correct_answer;
          const isSelected = selectedAnswer === option;

          let colorClass = COLORS[i % COLORS.length];
          if (showCorrect) {
            if (isCorrect) {
              colorClass = "bg-emerald-500 ring-4 ring-emerald-300";
            } else if (isWrong) {
              colorClass = "bg-red-700 opacity-60";
            } else {
              colorClass = "bg-gray-400 opacity-50";
            }
          } else if (isSelected) {
            colorClass = "bg-gray-600 ring-4 ring-gray-300";
          }

          return (
            <button
              key={i}
              onClick={() => onAnswer?.(option)}
              disabled={disabled || showCorrect}
              className={`${colorClass} rounded-xl px-4 py-5 md:py-6 text-white font-semibold text-lg transition-all flex items-center gap-3 disabled:cursor-not-allowed`}
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                {question.type === "truefalse"
                  ? option === "Vrai"
                    ? "V"
                    : "F"
                  : LABELS[i]}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
