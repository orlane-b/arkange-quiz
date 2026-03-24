"use client";

import { useEffect, useState, useRef } from "react";

interface TimerProps {
  seconds: number;
  onTimeUp: () => void;
  running: boolean;
}

export default function Timer({ seconds, onTimeUp, running }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, seconds]);

  const progress = seconds > 0 ? timeLeft / seconds : 0;
  const isLow = timeLeft <= 5;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-3xl font-bold font-mono ${isLow ? "text-red-500 animate-pulse" : "text-gray-700"}`}>
          {timeLeft}s
        </span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isLow ? "bg-red-500" : progress > 0.5 ? "bg-green-500" : "bg-yellow-500"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Calcule les points en fonction du temps restant.
 * Plus on répond vite, plus on gagne de points (100 max, 50 min).
 */
export function calculatePoints(timeLeft: number, totalTime: number): number {
  if (totalTime <= 0) return 100;
  const ratio = timeLeft / totalTime;
  return Math.round(50 + 50 * ratio);
}
