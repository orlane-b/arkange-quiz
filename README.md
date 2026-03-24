# Arkange Quiz

Quiz interactif en temps réel (type Kahoot).

## Stack technique

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (base de données + temps réel)

## Lancer le projet

### 1. Installer les dépendances

```bash
cd arkange-quiz
npm install
```

### 2. Configurer Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Va dans **Settings > API** et copie l'URL et la clé `anon`
3. Remplis le fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### 3. Créer les tables

Va dans **SQL Editor** sur le dashboard Supabase et exécute le contenu du fichier `supabase/schema.sql`.

### 4. Lancer le serveur de développement

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
src/
├── app/
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx            # Page d'accueil
│   ├── admin/
│   │   └── page.tsx        # Interface d'administration
│   ├── join/
│   │   └── page.tsx        # Rejoindre une session
│   └── session/
│       └── [code]/
│           └── page.tsx    # Session de quiz en cours
├── lib/
│   ├── supabase.ts         # Client Supabase
│   └── types.ts            # Types TypeScript
supabase/
└── schema.sql              # Schéma de la base de données
```

## Format pour créer des questions

### QCM (choix multiples)

```json
{
  "text": "Quelle est la capitale de la France ?",
  "type": "mcq",
  "options": ["Londres", "Paris", "Berlin", "Madrid"],
  "correct_answer": "Paris",
  "order": 1
}
```

### Vrai / Faux

```json
{
  "text": "La Terre est plate.",
  "type": "truefalse",
  "options": ["Vrai", "Faux"],
  "correct_answer": "Faux",
  "order": 2
}
```

### Insérer via SQL

```sql
-- Créer un quiz
insert into quizzes (title) values ('Mon premier quiz');

-- Ajouter des questions (remplacer QUIZ_ID par l'id du quiz)
insert into questions (quiz_id, text, type, options, correct_answer, "order")
values
  ('QUIZ_ID', 'Quelle est la capitale de la France ?', 'mcq',
   '["Londres", "Paris", "Berlin", "Madrid"]', 'Paris', 1),
  ('QUIZ_ID', 'La Terre est plate.', 'truefalse',
   '["Vrai", "Faux"]', 'Faux', 2);
```

## Schéma de la base de données

| Table          | Description                        |
| -------------- | ---------------------------------- |
| `quizzes`      | Les quiz créés                     |
| `questions`    | Questions liées à un quiz          |
| `sessions`     | Sessions de jeu (code + statut)    |
| `participants` | Joueurs dans une session           |
| `answers`      | Réponses des participants          |
