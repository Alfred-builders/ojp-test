"use client";

import Link from "next/link";
import {
  Timer,
  FileText,
  IdentificationCard,
  WarningCircle,
  Diamond,
  CurrencyEur,
  ArrowRight,
} from "@phosphor-icons/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, formatDateShort } from "@/lib/format";

export interface RetractationAlert {
  id: string;
  numero: string;
  dateFin: string;
  clientName: string;
  dossierId: string;
}

export interface DevisAlert {
  id: string;
  numero: string;
  createdAt: string;
  clientName: string;
  dossierId: string;
}

export interface ReferenceAlert {
  id: string;
  designation: string;
  status: string;
  dateFin: string;
  lotId: string;
  lotNumero: string;
  clientName: string;
}

export interface DocumentAlert {
  clientId: string;
  clientName: string;
  documentType: string;
  expiryDate: string;
}

export interface PaiementAlert {
  lotId: string;
  lotNumero: string;
  clientName: string;
  type: "acompte" | "solde" | "rachat" | "vente";
  lotType?: "rachat" | "vente";
  montant: number;
  dateLimite: string | null;
  createdAt?: string;
}

interface DashboardAlertsProps {
  retractations: RetractationAlert[];
  devisEnAttente: DevisAlert[];
  referenceAlerts: ReferenceAlert[];
  expiringDocuments: DocumentAlert[];
  paiements?: PaiementAlert[];
}

function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `${days} jours`;
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Expire";
  if (days === 1) return "Demain";
  return `${days} jours`;
}

const PAIEMENT_LABELS: Record<string, string> = {
  acompte: "Acompte client à encaisser (10%)",
  solde: "Solde client à encaisser (90%)",
  rachat: "Règlement rachat à verser au client",
  vente: "Paiement vente à encaisser",
};

type AlertItem = {
  key: string;
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: React.ReactNode;
};

function buildAlertItems(
  retractations: RetractationAlert[],
  sortedPaiements: PaiementAlert[],
  devisEnAttente: DevisAlert[],
  referenceAlerts: ReferenceAlert[],
  expiringDocuments: DocumentAlert[],
): AlertItem[] {
  const items: AlertItem[] = [];

  for (const r of retractations) {
    items.push({
      key: r.id,
      href: `/lots/${r.id}`,
      icon: <Timer size={16} weight="duotone" className="shrink-0 text-amber-500" />,
      title: "Délai de rétractation en cours",
      subtitle: `${r.numero} · ${r.clientName}`,
      badge: <Badge variant="secondary" className="bg-muted text-muted-foreground">{formatDateShort(r.dateFin)}</Badge>,
    });
  }

  for (const [i, p] of sortedPaiements.entries()) {
    items.push({
      key: `paiement-${i}`,
      href: p.lotType === "rachat" ? `/lots/${p.lotId}` : `/ventes/${p.lotId}`,
      icon: <CurrencyEur size={16} weight="duotone" className={`shrink-0 ${p.type === "rachat" ? "text-blue-500" : "text-emerald-500"}`} />,
      title: PAIEMENT_LABELS[p.type] ?? p.type,
      subtitle: `${formatCurrency(p.montant)} · ${p.lotNumero} · ${p.clientName}`,
      badge: <Badge variant="secondary" className="bg-muted text-muted-foreground">{p.dateLimite ? formatDateShort(p.dateLimite) : p.createdAt ? formatDateShort(p.createdAt) : "À régler"}</Badge>,
    });
  }

  for (const d of devisEnAttente) {
    items.push({
      key: d.id,
      href: `/lots/${d.id}`,
      icon: <FileText size={16} weight="duotone" className="shrink-0 text-blue-500" />,
      title: "Devis en attente de réponse client",
      subtitle: `${d.numero} · ${d.clientName}`,
      badge: <Badge variant="secondary" className="bg-muted text-muted-foreground">{daysAgo(d.createdAt)}</Badge>,
    });
  }

  for (const ref of referenceAlerts) {
    items.push({
      key: ref.id,
      href: `/lots/${ref.lotId}`,
      icon: <Diamond size={16} weight="duotone" className={`shrink-0 ${ref.status === "en_retractation" ? "text-amber-500" : "text-blue-500"}`} />,
      title: ref.status === "en_retractation" ? "Rétractation en cours" : "Devis en attente de réponse",
      subtitle: `${ref.designation} · ${ref.lotNumero} · ${ref.clientName}`,
      badge: ref.status === "en_retractation"
        ? <Badge variant="secondary" className="bg-muted text-muted-foreground">{formatDateShort(ref.dateFin)}</Badge>
        : <Badge variant="secondary" className="bg-muted text-muted-foreground">Devis · {daysUntil(ref.dateFin)}</Badge>,
    });
  }

  for (const [i, doc] of expiringDocuments.entries()) {
    const docLabel = doc.documentType === "cni" ? "CNI"
      : doc.documentType === "passeport" ? "Passeport"
      : doc.documentType === "titre_sejour" ? "Titre de séjour"
      : "Permis";
    items.push({
      key: `doc-${i}`,
      href: `/clients/${doc.clientId}`,
      icon: <IdentificationCard size={16} weight="duotone" className="shrink-0 text-red-500" />,
      title: `${docLabel} bientôt expiré${doc.documentType === "cni" ? "e" : ""}`,
      subtitle: doc.clientName,
      badge: <Badge variant="secondary" className="bg-muted text-muted-foreground">{formatDateShort(doc.expiryDate)}</Badge>,
    });
  }

  return items;
}

function AlertRow({ item }: { item: AlertItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
    >
      {item.icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
      </div>
      {item.badge}
    </Link>
  );
}

const MAX_VISIBLE = 3;

export function DashboardAlerts({
  retractations,
  devisEnAttente,
  referenceAlerts,
  expiringDocuments,
  paiements = [],
}: DashboardAlertsProps) {
  const sortedPaiements = [...paiements].sort((a, b) => {
    const aTime = a.dateLimite ? new Date(a.dateLimite).getTime() : Infinity;
    const bTime = b.dateLimite ? new Date(b.dateLimite).getTime() : Infinity;
    return aTime - bTime;
  });

  const allItems = buildAlertItems(retractations, sortedPaiements, devisEnAttente, referenceAlerts, expiringDocuments);
  const isEmpty = allItems.length === 0;
  const hasMore = allItems.length > MAX_VISIBLE;

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WarningCircle size={18} weight="duotone" />
          Alertes &amp; Délais
        </CardTitle>
        {hasMore && (
          <CardAction>
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" />
                }
              >
                Voir tout ({allItems.length})
                <ArrowRight size={14} weight="bold" />
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>Alertes &amp; Délais</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <div className="space-y-1">
                    {allItems.map((item) => (
                      <AlertRow key={item.key} item={item} />
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        {isEmpty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune alerte.
          </p>
        ) : (
          <div className="space-y-1">
            {allItems.slice(0, MAX_VISIBLE).map((item) => (
              <AlertRow key={item.key} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
