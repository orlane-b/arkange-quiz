import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-bold tracking-tight">Arkange Quiz</h1>
      <p className="text-lg text-gray-600">
        Quiz interactif en temps réel
      </p>

      <div className="flex gap-4">
        <Link
          href="/admin"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition"
        >
          Administration
        </Link>
        <Link
          href="/join"
          className="rounded-lg bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 transition"
        >
          Rejoindre un quiz
        </Link>
      </div>
    </main>
  );
}
