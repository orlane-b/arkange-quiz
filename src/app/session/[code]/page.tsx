"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getSessionByCode,
  getQuizWithQuestions,
  joinSession,
  submitAnswer,
  updateScore,
  hasParticipantAnswered,
  getParticipants,
} from "@/lib/queries";
import type { Session, Question, Participant } from "@/lib/types";
import QuestionCard from "@/components/QuestionCard";
import Timer, { calculatePoints } from "@/components/Timer";
import Podium from "@/components/Podium";

const TIMER_SECONDS = 20;

export default function ParticipantSessionPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"join" | "waiting" | "playing" | "ended">(
    "join"
  );

  const timerStartRef = useRef<number>(0);

  // Charger la session au montage
  useEffect(() => {
    async function load() {
      try {
        const sess = await getSessionByCode(code);
        if (!sess) {
          setError("Session introuvable. Vérifiez le code.");
          setLoading(false);
          return;
        }
        setSession(sess);

        const quiz = await getQuizWithQuestions(sess.quiz_id);
        setQuestions(quiz.questions);

        // Vérifier si on a déjà rejoint (localStorage)
        const savedId = localStorage.getItem(`participant_${sess.id}`);
        if (savedId) {
          const parts = await getParticipants(sess.id);
          const existing = parts.find((p) => p.id === savedId);
          if (existing) {
            setParticipant(existing);
            setScore(existing.score);
            if (sess.status === "waiting") setPhase("waiting");
            else if (sess.status === "active") {
              setPhase("playing");
              setTimerRunning(true);
              timerStartRef.current = Date.now();
            } else if (sess.status === "ended") {
              setPhase("ended");
              setParticipants(parts);
            }
          }
        }

        if (sess.status === "ended") {
          const parts = await getParticipants(sess.id);
          setParticipants(parts);
          setPhase("ended");
        }
      } catch (err: any) {
        setError(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  // Subscription temps réel : changements de session
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`participant-session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        async (payload) => {
          const updated = payload.new as Session;
          setSession(updated);

          if (updated.status === "active" && phase !== "ended") {
            setPhase("playing");
            setAnswered(false);
            setSelectedAnswer(null);
            setShowCorrect(false);
            setTimerRunning(true);
            timerStartRef.current = Date.now();

            // Vérifier si on a déjà répondu à cette question
            if (participant && questions[updated.current_question_index]) {
              const alreadyAnswered = await hasParticipantAnswered(
                participant.id,
                questions[updated.current_question_index].id
              );
              if (alreadyAnswered) {
                setAnswered(true);
                setTimerRunning(false);
              }
            }
          } else if (updated.status === "ended") {
            setPhase("ended");
            setTimerRunning(false);
            const parts = await getParticipants(session.id);
            setParticipants(parts);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, participant?.id, questions, phase]);

  const currentQuestion =
    session && questions.length > 0
      ? questions[session.current_question_index]
      : null;

  const handleJoin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !session) return;

      if (session.status !== "waiting") {
        setError("Ce quiz a déjà commencé.");
        return;
      }

      try {
        const p = await joinSession(session.id, name.trim());
        setParticipant(p);
        localStorage.setItem(`participant_${session.id}`, p.id);
        setPhase("waiting");
        setError("");
      } catch (err: any) {
        setError(err.message || "Impossible de rejoindre");
      }
    },
    [name, session]
  );

  const handleAnswer = useCallback(
    async (answer: string) => {
      if (!participant || !currentQuestion || answered) return;

      setSelectedAnswer(answer);
      setAnswered(true);
      setTimerRunning(false);

      const isCorrect = answer === currentQuestion.correct_answer;
      const elapsed = (Date.now() - timerStartRef.current) / 1000;
      const timeLeft = Math.max(0, TIMER_SECONDS - elapsed);
      const points = isCorrect ? calculatePoints(timeLeft, TIMER_SECONDS) : 0;

      const newScore = score + points;
      setScore(newScore);

      try {
        await submitAnswer(participant.id, currentQuestion.id, answer, isCorrect);
        await updateScore(participant.id, newScore);
      } catch (err) {
        console.error("Erreur soumission réponse:", err);
      }
    },
    [participant, currentQuestion, answered, score]
  );

  const handleTimeUp = useCallback(() => {
    if (!answered) {
      setAnswered(true);
      setTimerRunning(false);
      setShowCorrect(true);
    }
  }, [answered]);

  // Quand la question change, reset l'état
  useEffect(() => {
    if (session?.status === "active") {
      setAnswered(false);
      setSelectedAnswer(null);
      setShowCorrect(false);
      timerStartRef.current = Date.now();
    }
  }, [session?.current_question_index]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-gray-500 text-lg">Chargement...</p>
      </main>
    );
  }

  if (error && !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-600 text-center">{error}</p>
        <Link href="/join" className="text-blue-600 hover:underline">
          ← Retour
        </Link>
      </main>
    );
  }

  // Phase : Podium
  if (phase === "ended") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <Podium participants={participants} />
      </main>
    );
  }

  // Phase : Saisie du prénom
  if (phase === "join") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-bold">Rejoindre le quiz</h1>
        <p className="font-mono text-2xl tracking-widest text-gray-500">
          {code}
        </p>

        {error && (
          <p className="text-red-600 bg-red-50 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <form
          onSubmit={handleJoin}
          className="flex flex-col gap-4 w-full max-w-sm"
        >
          <input
            type="text"
            placeholder="Votre prénom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-3 text-center text-xl focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
            maxLength={20}
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-lg bg-green-600 px-6 py-4 text-white text-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            Rejoindre
          </button>
        </form>
      </main>
    );
  }

  // Phase : Salle d'attente
  if (phase === "waiting") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-xl font-semibold">
          Bienvenue, {participant?.name} !
        </h2>
        <p className="text-gray-500">En attente du lancement du quiz...</p>
      </main>
    );
  }

  // Phase : Quiz en cours
  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-4">
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Question {(session?.current_question_index ?? 0) + 1} /{" "}
          {questions.length}
        </span>
        <span className="font-bold text-blue-600">{score} pts</span>
      </div>

      {/* Timer */}
      <Timer
        seconds={TIMER_SECONDS}
        onTimeUp={handleTimeUp}
        running={timerRunning}
        key={session?.current_question_index}
      />

      {/* Question */}
      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          disabled={answered}
          showCorrect={showCorrect}
          selectedAnswer={selectedAnswer ?? undefined}
        />
      )}

      {/* Feedback après réponse */}
      {answered && !showCorrect && (
        <div className="mt-4 text-center">
          <p className="text-lg font-semibold text-green-600">
            Réponse enregistrée !
          </p>
          <p className="text-sm text-gray-400">
            En attente de la correction...
          </p>
        </div>
      )}
    </main>
  );
}
