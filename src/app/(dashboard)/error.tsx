"use client";

import { useEffect } from "react";
import { WarningCircle, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <WarningCircle size={48} weight="duotone" className="text-destructive" />
        <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
        <p className="text-sm text-muted-foreground">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer.
        </p>
        <Button onClick={reset} variant="outline">
          <ArrowCounterClockwise size={16} weight="duotone" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
