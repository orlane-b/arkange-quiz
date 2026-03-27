"use client";

import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();

  // Ne pas protéger la page de login
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    // Redirection côté client vers login
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Redirection vers la connexion...</p>
      </div>
    );
  }

  return (
    <>
      {/* Barre admin */}
      <div className="bg-blue-600 text-white px-4 py-2 text-sm flex items-center justify-between">
        <span>
          Connecté en tant que <strong>{user.email}</strong>
        </span>
        <button
          onClick={signOut}
          className="rounded bg-blue-700 px-3 py-1 text-sm hover:bg-blue-800 transition"
        >
          Déconnexion
        </button>
      </div>
      {children}
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}
