"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/session/${code.trim().toUpperCase()}`);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Rejoindre un quiz</h1>

      <form onSubmit={handleJoin} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="Code de la session"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono uppercase tracking-widest focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
          maxLength={6}
        />
        <button
          type="submit"
          className="rounded-lg bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
          disabled={!code.trim()}
        >
          Rejoindre
        </button>
      </form>
    </main>
  );
}
