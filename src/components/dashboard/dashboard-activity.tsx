"use client";

import Link from "next/link";
import {
  CheckCircle,
  FolderOpen,
  FileText,
  Clock,
  ArrowRight,
} from "@phosphor-icons/react";
import { formatDate } from "@/lib/format";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type ActivityEvent = {
  id: string;
  type: "lot_finalise" | "nouveau_dossier" | "document_genere";
  description: string;
  date: string;
  link: string;
};

const ICONS = {
  lot_finalise: CheckCircle,
  nouveau_dossier: FolderOpen,
  document_genere: FileText,
} as const;

const COLORS = {
  lot_finalise: "text-emerald-500",
  nouveau_dossier: "text-blue-500",
  document_genere: "text-muted-foreground",
} as const;

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days}j`;
  return formatDate(iso);
}

function ActivityRow({ event, isLast }: { event: ActivityEvent; isLast: boolean }) {
  const Icon = ICONS[event.type];
  const color = COLORS[event.type];

  return (
    <div className="relative flex gap-3 pb-4">
      {!isLast && (
        <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
      )}
      <div
        className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card ${color}`}
      >
        <Icon size={14} weight="duotone" />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={event.link}
          className="text-sm font-medium hover:underline"
        >
          {event.description}
        </Link>
        <p className="text-xs text-muted-foreground">
          {relativeTime(event.date)}
        </p>
      </div>
    </div>
  );
}

const MAX_VISIBLE = 3;

export function DashboardActivity({ events }: { events: ActivityEvent[] }) {
  const hasMore = events.length > MAX_VISIBLE;

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock size={18} weight="duotone" />
          Activité récente
        </CardTitle>
        {hasMore && (
          <CardAction>
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" />
                }
              >
                Voir tout ({events.length})
                <ArrowRight size={14} weight="bold" />
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>Activité récente</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <div className="relative space-y-0">
                    {events.map((event, index) => (
                      <ActivityRow
                        key={event.id}
                        event={event}
                        isLast={index === events.length - 1}
                      />
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune activité récente.
          </p>
        ) : (
          <div className="relative space-y-0">
            {events.slice(0, MAX_VISIBLE).map((event, index) => (
              <ActivityRow
                key={event.id}
                event={event}
                isLast={index === Math.min(MAX_VISIBLE, events.length) - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
