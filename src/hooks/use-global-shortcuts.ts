"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useGlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Alt + key: Navigation shortcuts
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "d":
            e.preventDefault();
            router.push("/dashboard");
            return;
          case "l":
            e.preventDefault();
            router.push("/lots");
            return;
          case "s":
            e.preventDefault();
            router.push("/stock");
            return;
          case "v":
            e.preventDefault();
            router.push("/ventes");
            return;
          case "c":
            e.preventDefault();
            router.push("/clients");
            return;
        }
      }

      // Ctrl/Cmd + Shift + N: Nouveau dossier
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "n" && !e.altKey) {
        e.preventDefault();
        router.push("/dossiers/new");
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);
}
