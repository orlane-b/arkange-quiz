"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getSession,
  getQuizWithQuestions,
  getParticipants,
  updateSessionStatus,
  advanceQuestion,
  getAnswerCountForQuestion,
} from "@/lib/queries";
import type { Session, Question, Participant } from "@/lib/types";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import QuestionCard from "@/components/QuestionCard";
import Timer from "@/components/Timer";
import Podium from "@/components/Podium";

const TIMER_SECONDS = 20;

export default function HostSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answerCount, setAnswerCount] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Charger la session et les questions
  useEffect(() => {
    async function load() {
      try {
        const sess = await getSession(sessionId);
        setSession(sess);

        const quiz = await getQuizWithQuestions(sess.quiz_id);
        setQuestions(quiz.questions);

        const parts = await getParticipants(sess.id);
        setParticipants(parts);
      } catch (err: any) {
        setError(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Subscription temps réel : nouveaux participants
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`host-participants-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participants",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setParticipants((prev) => [...prev, payload.new as Participant]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Subscription temps réel : réponses (compteur)
  useEffect(() => {
    if (!session || session.status !== "active" || questions.length === 0)
      return;

    const currentQ = questions[session.current_question_index];
    if (!currentQ) return;

    // Charger le compte initial
    getAnswerCountForQuestion(currentQ.id).then(setAnswerCount);

    const channel = supabase
      .channel(`host-answers-${currentQ.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "answers",
          filter: `question_id=eq.${currentQ.id}`,
        },
        () => {
          setAnswerCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, session?.status, session?.current_question_index, questions]);

  const currentQuestion =
    session && questions.length > 0
      ? questions[session.current_question_index]
      : null;

  const handleStart = useCallback(async () => {
    if (!session) return;
    await updateSessionStatus(session.id, "active");
    setSession((s) => (s ? { ...s, status: "active" } : s));
    setTimerRunning(true);
    setShowCorrect(false);
    setAnswerCount(0);
  }, [session]);

  const handleShowAnswer = useCallback(() => {
    setShowCorrect(true);
    setTimerRunning(false);
  }, []);

  const handleTimeUp = useCallback(() => {
    setShowCorrect(true);
    setTimerRunning(false);
  }, []);

  const handleNextQuestion = useCallback(async () => {
    if (!session) return;
    const nextIndex = session.current_question_index + 1;

    if (nextIndex >= questions.length) {
      // Quiz terminé
      await updateSessionStatus(session.id, "ended");
      // Recharger les scores
      const updatedParticipants = await getParticipants(session.id);
      setParticipants(updatedParticipants);
      setSession((s) => (s ? { ...s, status: "ended" } : s));
    } else {
      await advanceQuestion(session.id, nextIndex);
      setSession((s) =>
        s ? { ...s, current_question_index: nextIndex } : s
      );
      setShowCorrect(false);
      setAnswerCount(0);
      setTimerRunning(true);
    }
  }, [session, questions.length]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500 text-lg">Chargement de la session...</p>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || "Session introuvable"}</p>
        <Link href="/admin" className="text-blue-600 hover:underline">
          ← Retour à l&apos;administration
        </Link>
      </main>
    );
  }

  // Phase 3 : Podium
  if (session.status === "ended") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <Podium participants={participants} />
        <Link
          href="/admin"
          className="mt-8 text-blue-600 hover:underline"
        >
          ← Retour à l&apos;administration
        </Link>
      </main>
    );
  }

  // Phase 1 : Salle d'attente
  if (session.status === "waiting") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <h1 className="text-2xl font-bold text-gray-700">Salle d&apos;attente</h1>

        <QRCodeDisplay code={session.code} />

        <div className="w-full max-w-md">
          <h2 className="text-lg font-semibold mb-3 text-center">
            Participants ({participants.length})
          </h2>
          {participants.length === 0 ? (
            <p className="text-center text-gray-400">
              En attente de participants...
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={participants.length === 0}
          className="rounded-xl bg-green-600 px-8 py-4 text-xl text-white font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Commencer le quiz ({questions.length} questions)
        </button>

        <Link href="/admin" className="text-sm text-gray-400 hover:underline">
          ← Annuler
        </Link>
      </main>
    );
  }

  // Phase 2 : Quiz en direct
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-4 md:p-8">
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          Question {session.current_question_index + 1} / {questions.length}
        </span>
        <span className="text-sm text-gray-400">
          {answerCount} / {participants.length} réponses
        </span>
      </div>

      {/* Timer */}
      <Timer
        seconds={TIMER_SECONDS}
        onTimeUp={handleTimeUp}
        running={timerRunning}
        key={session.current_question_index}
      />

      {/* Question */}
      {currentQuestion && (
        <QuestionCard question={currentQuestion} showCorrect={showCorrect} />
      )}

      {/* Contrôles */}
      <div className="flex gap-4 mt-4">
        {!showCorrect ? (
          <button
            onClick={handleShowAnswer}
            className="rounded-lg bg-orange-500 px-6 py-3 text-white font-semibold hover:bg-orange-600 transition"
          >
            Afficher la réponse
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition"
          >
            {session.current_question_index + 1 >= questions.length
              ? "Voir le podium"
              : "Question suivante"}
          </button>
        )}
      </div>
    </main>
  );
}
