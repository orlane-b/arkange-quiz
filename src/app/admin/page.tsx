"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getQuizzes,
  createQuiz,
  addQuestions,
  getQuizWithQuestions,
  createSession,
  parseQuizText,
} from "@/lib/queries";
import type { Quiz, Question } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<(Quiz & { questionCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "create">("list");

  // Formulaire de création
  const [title, setTitle] = useState("");
  const [importText, setImportText] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Omit<Question, "id">[]>([]);

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    try {
      const data = await getQuizzes();
      // Charger le nombre de questions pour chaque quiz
      const withCounts = await Promise.all(
        data.map(async (q) => {
          try {
            const full = await getQuizWithQuestions(q.id);
            return { ...q, questionCount: full.questions.length };
          } catch {
            return { ...q, questionCount: 0 };
          }
        })
      );
      setQuizzes(withCounts);
    } catch (err) {
      console.error("Erreur chargement quiz:", err);
    } finally {
      setLoading(false);
    }
  }

  function handlePreview() {
    setError("");
    if (!importText.trim()) {
      setPreview([]);
      return;
    }
    const parsed = parseQuizText(importText, "preview");
    if (parsed.length === 0) {
      setError(
        "Aucune question détectée. Vérifiez le format (voir l'exemple ci-dessous)."
      );
    }
    setPreview(parsed);
  }

  async function handleCreate() {
    setError("");
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    if (preview.length === 0) {
      setError("Ajoutez au moins une question.");
      return;
    }

    setCreating(true);
    try {
      const quiz = await createQuiz(title.trim());
      const questionsToInsert = preview.map((q, i) => ({
        ...q,
        quiz_id: quiz.id,
        order: i,
      }));
      await addQuestions(questionsToInsert);
      setTitle("");
      setImportText("");
      setPreview([]);
      setTab("list");
      await loadQuizzes();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création.");
    } finally {
      setCreating(false);
    }
  }

  async function handleLaunch(quizId: string) {
    try {
      const session = await createSession(quizId);
      router.push(`/admin/session/${session.id}`);
    } catch (err: any) {
      alert("Erreur: " + (err.message || "Impossible de créer la session"));
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Administration</h1>
        <Link href="/" className="text-blue-600 hover:underline">
          ← Accueil
        </Link>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("list")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            tab === "list"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Mes quiz
        </button>
        <button
          onClick={() => setTab("create")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            tab === "create"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          + Créer un quiz
        </button>
      </div>

      {/* Liste des quiz */}
      {tab === "list" && (
        <div>
          {loading ? (
            <p className="text-gray-500">Chargement...</p>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">Aucun quiz pour le moment</p>
              <button
                onClick={() => setTab("create")}
                className="text-blue-600 hover:underline"
              >
                Créer votre premier quiz
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div>
                    <h3 className="font-semibold text-lg">{quiz.title}</h3>
                    <p className="text-sm text-gray-500">
                      {quiz.questionCount ?? 0} question
                      {(quiz.questionCount ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleLaunch(quiz.id)}
                    className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 transition"
                  >
                    Lancer une session
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Création de quiz */}
      {tab === "create" && (
        <div className="space-y-6">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre du quiz
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Culture générale - Mars 2026"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Import texte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Importer les questions (format texte)
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`Q: Quelle est la capitale de la France ?\nA: Londres\nB: Paris *\nC: Berlin\nD: Madrid\n\nQ: Le soleil est une étoile.\nV *\nF`}
              rows={12}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <p className="text-xs text-gray-400 mt-1">
              Mettez <strong>*</strong> après la bonne réponse. Séparez les
              questions par une ligne vide. Pour Vrai/Faux : utilisez V et F.
            </p>
          </div>

          <button
            onClick={handlePreview}
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 font-medium hover:bg-gray-300 transition"
          >
            Prévisualiser les questions
          </button>

          {error && (
            <p className="text-red-600 bg-red-50 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {/* Prévisualisation */}
          {preview.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">
                {preview.length} question{preview.length > 1 ? "s" : ""}{" "}
                détectée{preview.length > 1 ? "s" : ""}
              </h3>
              {preview.map((q, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {q.type === "mcq" ? "QCM" : "V/F"}
                    </span>
                    <div>
                      <p className="font-medium">{q.text}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {q.options.map((opt, j) => (
                          <span
                            key={j}
                            className={`rounded px-2 py-1 text-sm ${
                              opt === q.correct_answer
                                ? "bg-green-100 text-green-800 font-medium"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {opt}
                            {opt === q.correct_answer && " ✓"}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {creating ? "Création en cours..." : "Créer le quiz"}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
