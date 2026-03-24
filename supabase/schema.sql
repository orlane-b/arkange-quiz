-- =============================================
-- Arkange Quiz - Schéma de base de données
-- =============================================
-- Exécuter ce fichier dans l'éditeur SQL de Supabase
-- (Dashboard > SQL Editor > New Query)

-- Active l'extension uuid
create extension if not exists "uuid-ossp";

-- =============================================
-- Table : quizzes
-- =============================================
create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  created_at timestamptz default now()
);

-- =============================================
-- Table : questions
-- =============================================
create table questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  text text not null,
  type text not null check (type in ('mcq', 'truefalse')),
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  "order" integer not null default 0
);

create index idx_questions_quiz_id on questions(quiz_id);

-- =============================================
-- Table : sessions
-- =============================================
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  code text not null unique,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'ended')),
  current_question_index integer not null default 0,
  created_at timestamptz default now()
);

create index idx_sessions_code on sessions(code);

-- =============================================
-- Table : participants
-- =============================================
create table participants (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  score integer not null default 0
);

create index idx_participants_session_id on participants(session_id);

-- =============================================
-- Table : answers
-- =============================================
create table answers (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid not null references participants(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer text not null,
  is_correct boolean not null default false,
  answered_at timestamptz default now()
);

create index idx_answers_participant_id on answers(participant_id);
create index idx_answers_question_id on answers(question_id);

-- =============================================
-- Row Level Security (désactivé pour l'instant)
-- =============================================
-- À activer plus tard avec l'authentification
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table sessions enable row level security;
alter table participants enable row level security;
alter table answers enable row level security;

-- Policies temporaires : accès public complet (pas d'auth)
create policy "Public access" on quizzes for all using (true) with check (true);
create policy "Public access" on questions for all using (true) with check (true);
create policy "Public access" on sessions for all using (true) with check (true);
create policy "Public access" on participants for all using (true) with check (true);
create policy "Public access" on answers for all using (true) with check (true);
