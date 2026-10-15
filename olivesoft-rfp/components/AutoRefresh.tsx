"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Recherche et rédaction tournent en tâche de fond (webhooks du backend) : on relit la page jusqu'à la fin.
export function AutoRefresh({ every = 4000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), every);
    return () => clearInterval(timer);
  }, [router, every]);
  return null;
}
