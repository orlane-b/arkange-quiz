"use client";

import { useEffect } from "react";
import type { Participant } from "@/lib/types";

interface PodiumProps {
  participants: Participant[];
}

export default function Podium({ participants }: PodiumProps) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let confetti: any;
    import("canvas-confetti").then((mod) => {
      confetti = mod.default;
      // Lancer les confettis
      const duration = 3000;
      const end = Date.now() + duration;

      function frame() {
        if (!confetti) return;
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }
      frame();
    });
  }, []);

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = ["h-28", "h-40", "h-20"];
  const places = ["2e", "1er", "3e"];
  const bgColors = ["bg-gray-300", "bg-yellow-400", "bg-amber-600"];
  const textColors = ["text-gray-700", "text-yellow-900", "text-amber-100"];

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-8">Podium</h2>

      {/* Podium visuel */}
      <div className="flex items-end justify-center gap-2 mb-8">
        {podiumOrder.map((p, i) => {
          if (!p) return null;
          const actualIndex = top3[1] === p ? 0 : top3[0] === p ? 1 : 2;
          return (
            <div key={p.id} className="flex flex-col items-center">
              <p className="font-bold text-lg mb-1 truncate max-w-[120px]">
                {p.name}
              </p>
              <p className="text-sm text-gray-500 mb-2">{p.score} pts</p>
              <div
                className={`${heights[i]} w-24 md:w-32 ${bgColors[i]} rounded-t-lg flex items-center justify-center`}
              >
                <span className={`text-2xl font-bold ${textColors[i]}`}>
                  {places[i]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Classement complet */}
      {rest.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {rest.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3 border-b last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-mono w-8">
                  {i + 4}.
                </span>
                <span className="font-medium">{p.name}</span>
              </div>
              <span className="font-bold text-gray-600">{p.score} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
