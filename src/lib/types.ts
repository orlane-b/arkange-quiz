export type QuestionType = "mcq" | "truefalse";

export type SessionStatus = "waiting" | "active" | "ended";

export interface Quiz {
  id: string;
  title: string;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correct_answer: string;
  order: number;
}

export interface Session {
  id: string;
  quiz_id: string;
  code: string;
  status: SessionStatus;
  current_question_index: number;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  score: number;
}

export interface Answer {
  id: string;
  participant_id: string;
  question_id: string;
  answer: string;
  is_correct: boolean;
  answered_at: string;
}
