"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Redirects unauthenticated users once auth has hydrated from localStorage.
 * Returns `{ user, ready }`; pages should render a skeleton while `!ready`.
 */
export function useProtectedRoute(redirectTo: string = "/") {
  const { user, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !user) router.replace(redirectTo);
  }, [hydrated, user, router, redirectTo]);

  return { user, hydrated, ready: hydrated && !!user };
}
