"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 text-center max-w-md p-8">
          <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
          <p className="text-sm text-muted-foreground">
            Une erreur inattendue s&apos;est produite.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-md border text-sm hover:bg-muted transition-colors"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
