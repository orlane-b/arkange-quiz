import { supabase } from "./supabase";
import type { Quiz, Question, Session, Participant, Answer, SessionStatus } from "./types";

// =============================================
// Quiz
// =============================================

export async function createQuiz(title: string): Promise<Quiz> {
  const { data, error } = await supabase
    .from("quizzes")
    .insert({ title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getQuizzes(): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getQuizWithQuestions(
  quizId: string
): Promise<Quiz & { questions: Question[] }> {
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();
  if (quizError) throw quizError;

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true });
  if (qError) throw qError;

  return { ...quiz, questions: questions ?? [] };
}

// =============================================
// Questions
// =============================================

export async function addQuestion(
  question: Omit<Question, "id">
): Promise<Question> {
  const { data, error } = await supabase
    .from("questions")
    .insert(question)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addQuestions(
  questions: Omit<Question, "id">[]
): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .insert(questions)
    .select();
  if (error) throw error;
  return data ?? [];
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

// =============================================
// Sessions
// =============================================

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createSession(quizId: string): Promise<Session> {
  let code = generateCode();
  let attempts = 0;

  while (attempts < 10) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({ quiz_id: quizId, code, status: "waiting" })
      .select()
      .single();

    if (!error) return data;
    if (error.code === "23505") {
      code = generateCode();
      attempts++;
    } else {
      throw error;
    }
  }
  throw new Error("Impossible de générer un code unique");
}

export async function getSessionByCode(
  code: string
): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();
  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
}

export async function getSession(id: string): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function advanceQuestion(
  sessionId: string,
  newIndex: number
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({ current_question_index: newIndex })
    .eq("id", sessionId);
  if (error) throw error;
}

// =============================================
// Participants
// =============================================

export async function joinSession(
  sessionId: string,
  name: string
): Promise<Participant> {
  const { data, error } = await supabase
    .from("participants")
    .insert({ session_id: sessionId, name, score: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getParticipants(
  sessionId: string
): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", sessionId)
    .order("score", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateScore(
  participantId: string,
  newScore: number
): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ score: newScore })
    .eq("id", participantId);
  if (error) throw error;
}

// =============================================
// Answers
// =============================================

export async function submitAnswer(
  participantId: string,
  questionId: string,
  answer: string,
  isCorrect: boolean
): Promise<Answer> {
  const { data, error } = await supabase
    .from("answers")
    .insert({
      participant_id: participantId,
      question_id: questionId,
      answer,
      is_correct: isCorrect,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function hasParticipantAnswered(
  participantId: string,
  questionId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("answers")
    .select("*", { count: "exact", head: true })
    .eq("participant_id", participantId)
    .eq("question_id", questionId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getAnswerCountForQuestion(
  questionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("answers")
    .select("*", { count: "exact", head: true })
    .eq("question_id", questionId);
  if (error) throw error;
  return count ?? 0;
}

// =============================================
// Parse import texte
// =============================================

export function parseQuizText(
  text: string,
  quizId: string
): Omit<Question, "id">[] {
  const questions: Omit<Question, "id">[] = [];
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());

  let order = 0;
  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim());
    if (lines.length === 0) continue;

    const questionLine = lines[0];
    const questionText = questionLine.replace(/^Q:\s*/i, "").trim();
    if (!questionText) continue;

    const answerLines = lines.slice(1);

    // Detect true/false
    const isTrueFalse =
      answerLines.length === 2 &&
      answerLines.some((l) => /^V\b/i.test(l.replace(/\*/, "").trim())) &&
      answerLines.some((l) => /^F\b/i.test(l.replace(/\*/, "").trim()));

    if (isTrueFalse) {
      const correctLine = answerLines.find((l) => l.includes("*"));
      const correctAnswer = correctLine && /^V/i.test(correctLine.replace(/\*/, "").trim())
        ? "Vrai"
        : "Faux";
      questions.push({
        quiz_id: quizId,
        text: questionText,
        type: "truefalse",
        options: ["Vrai", "Faux"],
        correct_answer: correctAnswer,
        order: order++,
      });
    } else {
      // MCQ
      const options: string[] = [];
      let correctAnswer = "";
      for (const line of answerLines) {
        const isCorrect = line.includes("*");
        const cleaned = line
          .replace(/\*/, "")
          .replace(/^[A-D]:\s*/i, "")
          .trim();
        if (cleaned) {
          options.push(cleaned);
          if (isCorrect) correctAnswer = cleaned;
        }
      }
      if (options.length >= 2 && correctAnswer) {
        questions.push({
          quiz_id: quizId,
          text: questionText,
          type: "mcq",
          options,
          correct_answer: correctAnswer,
          order: order++,
        });
      }
    }
  }

  return questions;
}
