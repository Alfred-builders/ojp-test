"use client";

import { useState, useEffect } from "react";
import { Timer } from "@phosphor-icons/react";
import { formatDateTime } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RetractationTimerProps {
  startDate: string | null;
  endDate: string | null;
  /** Compact inline display (no card wrapper) */
  compact?: boolean;
}

export function RetractationTimer({ startDate, endDate, compact }: RetractationTimerProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!endDate) return null;

  const now = new Date();
  const end = new Date(endDate);
  const start = startDate ? new Date(startDate) : null;
  const canFinalize = now >= end;

  // Progress calculation
  const totalDuration = start ? end.getTime() - start.getTime() : 48 * 3600_000;
  const elapsed = start ? now.getTime() - start.getTime() : 0;
  const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);

  // Remaining time
  const diff = end.getTime() - now.getTime();
  const hoursLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Timer size={14} weight="duotone" className={canFinalize ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
        {canFinalize ? (
          <span className="text-emerald-600 dark:text-emerald-400">Delai expire</span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400">{hoursLeft}h {minutesLeft}m</span>
        )}
      </div>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Timer size={20} weight="duotone" />
          Delai de retractation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-amber-200 dark:bg-amber-900/40">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500 dark:bg-amber-400"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {start && <span>Debut : {formatDateTime(start.toISOString())}</span>}
            <span>Fin : {formatDateTime(end.toISOString())}</span>
          </div>
        </div>

        {/* Countdown or expired */}
        <div className="text-sm font-medium">
          {canFinalize ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              Delai expire — le lot peut etre finalise
            </span>
          ) : (
            <span className="text-amber-700 dark:text-amber-400">
              {hoursLeft}h {minutesLeft}m restantes
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
