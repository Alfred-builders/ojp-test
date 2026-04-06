"use client";

import { useState } from "react";
import {
  Scales,
  CaretRight,
  FileText,
  CurrencyEur,
  Package,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Lot, LotReference } from "@/types/lot";
import type { VenteLigne } from "@/types/vente";
import type { Reglement } from "@/types/reglement";
import type { BonCommande } from "@/types/bon-commande";
import type { DocumentRecord } from "@/types/document";

// ── Types ────────────────────────────────────────────────

type EventKind = "document" | "reglement" | "commande" | "stock_value";

interface JournalEvent {
  id: string;
  date: string;
  kind: EventKind;
  label: string;
  sublabel?: string;
  entree: number;
  sortie: number;
}

interface LotJournal {
  lot: Lot;
  typeLabel: string;
  events: JournalEvent[];
  totalEntrees: number;
  totalSorties: number;
}

// ── Props ────────────────────────────────────────────────

interface DossierRecapFinancierProps {
  lots: Lot[];
  lotReferences: LotReference[];
  venteLignes: VenteLigne[];
  reglements: Reglement[];
  bonsCommande: BonCommande[];
  documents: DocumentRecord[];
  stockCostMap: Record<string, number>;
}

// ── Helpers ──────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  quittance_rachat: "Quittance de rachat",
  contrat_rachat: "Contrat de rachat",
  devis_rachat: "Devis de rachat",
  contrat_depot_vente: "Contrat depot-vente",
  confie_achat: "Confie",
  quittance_depot_vente: "Quittance depot-vente",
  facture_vente: "Facture de vente",
  facture_acompte: "Facture d'acompte (10%)",
  facture_solde: "Facture de solde (90%)",
  bon_commande: "Bon de commande",
};

const REGLEMENT_LABELS: Record<string, string> = {
  rachat: "Reglement rachat verse",
  vente: "Reglement vente recu",
  acompte: "Acompte recu",
  solde: "Solde recu",
  fonderie: "Paiement fonderie",
  depot_vente: "Net deposant verse",
};

const MODE_LABELS: Record<string, string> = {
  especes: "especes",
  carte: "carte",
  virement: "virement",
  cheque: "cheque",
};

const TYPE_BADGES: Record<string, string> = {
  rachat: "Rachat",
  vente: "Vente",
  depot_vente: "Depot-vente",
};

// ── Component ────────────────────────────────────────────

export function DossierRecapFinancier({
  lots,
  lotReferences,
  venteLignes,
  reglements,
  bonsCommande,
  documents,
  stockCostMap,
}: DossierRecapFinancierProps) {
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set());

  const nonBrouillonLots = lots.filter((l) => l.status !== "brouillon");
  if (nonBrouillonLots.length === 0) return null;

  // ── Build journal per lot ──────────────────────────────
  const journals: LotJournal[] = [];

  for (const lot of nonBrouillonLots) {
    const events: JournalEvent[] = [];
    const lotDocs = documents.filter((d) => d.lot_id === lot.id);
    const lotRegs = reglements.filter((r) => r.lot_id === lot.id);

    // 1. Documents emis (informational — no financial flow)
    for (const doc of lotDocs) {
      // Determine the expected amount for this document
      let expectedAmount = 0;
      if (doc.type === "facture_vente") {
        const lignes = venteLignes.filter((l) => l.lot_id === lot.id && !l.or_investissement_id);
        expectedAmount = lignes.reduce((s, l) => s + l.prix_total + l.montant_taxe, 0);
        if (lignes.length === 0) {
          // Could be a full vente lot without or invest
          expectedAmount = lot.total_prix_revente + lot.montant_taxe;
        }
      } else if (doc.type === "facture_acompte") {
        expectedAmount = lot.acompte_montant ?? 0;
      } else if (doc.type === "facture_solde") {
        const orLignes = venteLignes.filter((l) => l.lot_id === lot.id && l.or_investissement_id);
        const orTTC = orLignes.reduce((s, l) => s + l.prix_total + l.montant_taxe, 0);
        expectedAmount = orTTC - (lot.acompte_montant ?? 0);
      } else if (doc.type === "quittance_rachat") {
        expectedAmount = lot.montant_net;
      }

      events.push({
        id: `doc-${doc.id}`,
        date: doc.created_at,
        kind: "document",
        label: `${DOC_LABELS[doc.type] ?? doc.type} ${doc.numero}`,
        sublabel: expectedAmount > 0 ? `Montant : ${formatCurrency(expectedAmount)}` : undefined,
        entree: 0,
        sortie: 0,
      });
    }

    // 2. Reglements (real cash flows)
    for (const reg of lotRegs) {
      const modeLabel = MODE_LABELS[reg.mode] ?? reg.mode;
      events.push({
        id: `reg-${reg.id}`,
        date: reg.date_reglement,
        kind: "reglement",
        label: REGLEMENT_LABELS[reg.type] ?? reg.type,
        sublabel: `${modeLabel}${reg.notes ? ` — ${reg.notes}` : ""}`,
        entree: reg.sens === "entrant" ? reg.montant : 0,
        sortie: reg.sens === "sortant" ? reg.montant : 0,
      });
    }

    // 3. Valeur marchandise acquise (rachat finalisé = actif entrant)
    if (lot.type === "rachat" && lot.status === "finalise" && lot.total_prix_achat > 0) {
      const lotRefs = lotReferences.filter((r) => r.lot_id === lot.id);
      const refCount = lotRefs.length;
      events.push({
        id: `asset-${lot.id}`,
        date: lot.date_finalisation ?? lot.updated_at ?? lot.created_at,
        kind: "stock_value",
        label: "Valeur marchandise acquise",
        sublabel: `${refCount} reference${refCount > 1 ? "s" : ""} — actif en stock`,
        entree: lot.total_prix_achat,
        sortie: 0,
      });
    }

    // 4. Bons de commande (engagements fonderie) for vente lots
    if (lot.type === "vente") {
      const lotLignes = venteLignes.filter((l) => l.lot_id === lot.id);
      const lotBdcIds = [...new Set(lotLignes.filter((l) => l.bon_commande_id).map((l) => l.bon_commande_id!))];
      for (const bdcId of lotBdcIds) {
        const bdc = bonsCommande.find((b) => b.id === bdcId);
        if (!bdc) continue;
        events.push({
          id: `bdc-${bdc.id}`,
          date: bdc.created_at,
          kind: "commande",
          label: `Commande fonderie ${bdc.numero}`,
          sublabel: bdc.fonderie?.nom ?? undefined,
          entree: 0,
          sortie: 0, // Not a real flow — fonderie payment is via reglement
        });
      }

      // 4. Stock value for bijoux lines (cost basis)
      const bijouxLignes = lotLignes.filter((l) => l.bijoux_stock_id);
      if (bijouxLignes.length > 0) {
        let totalStockValue = 0;
        for (const ligne of bijouxLignes) {
          if (ligne.bijoux_stock_id) {
            totalStockValue += (stockCostMap[ligne.bijoux_stock_id] ?? 0) * ligne.quantite;
          }
        }
        if (totalStockValue > 0) {
          events.push({
            id: `stock-${lot.id}`,
            date: lot.created_at,
            kind: "stock_value",
            label: "Valeur stock bijoux (cout d'acquisition)",
            sublabel: `${bijouxLignes.length} article${bijouxLignes.length > 1 ? "s" : ""}`,
            entree: 0,
            sortie: totalStockValue,
          });
        }
      }

      // 5. Repair costs included in sale lines
      const totalReparation = lotLignes.reduce((sum, l) => sum + (l.cout_reparation ?? 0), 0);
      if (totalReparation > 0) {
        events.push({
          id: `rep-${lot.id}`,
          date: lot.created_at,
          kind: "stock_value",
          label: "Frais de reparation (inclus dans prix de vente)",
          sublabel: `Cout repercute sur le prix de vente`,
          entree: 0,
          sortie: totalReparation,
        });
      }
    }

    // Sort events by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalEntrees = events.reduce((s, e) => s + e.entree, 0);
    const totalSorties = events.reduce((s, e) => s + e.sortie, 0);

    journals.push({
      lot,
      typeLabel: TYPE_BADGES[lot.type] ?? lot.type,
      events,
      totalEntrees,
      totalSorties,
    });
  }

  // ── Grand totals ───────────────────────────────────────
  const grandEntrees = journals.reduce((s, j) => s + j.totalEntrees, 0);
  const grandSorties = journals.reduce((s, j) => s + j.totalSorties, 0);
  const solde = grandEntrees - grandSorties;

  function toggleLot(id: string) {
    setExpandedLots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="md:col-span-2 space-y-3">
      <h3 className="flex items-center gap-2 font-semibold">
        <Scales size={20} weight="duotone" />
        Journal de tresorerie
      </h3>
      <div className="rounded-lg border overflow-hidden bg-white dark:bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs">
              <th className="text-left font-medium px-4 py-2.5">Libelle</th>
              <th className="text-right font-medium px-3 py-2.5 w-24">Date</th>
              <th className="text-right font-medium px-3 py-2.5 w-28">Entrees</th>
              <th className="text-right font-medium px-4 py-2.5 w-28">Sorties</th>
            </tr>
          </thead>
          <tbody>
            {journals.map((journal) => {
              const expanded = expandedLots.has(journal.lot.id);
              const hasEvents = journal.events.length > 0;
              const lotSolde = journal.totalEntrees - journal.totalSorties;

              return (
                <LotJournalRows
                  key={journal.lot.id}
                  journal={journal}
                  expanded={expanded}
                  hasEvents={hasEvents}
                  lotSolde={lotSolde}
                  onToggle={() => toggleLot(journal.lot.id)}
                />
              );
            })}

            {/* TOTAUX */}
            <tr className="border-t-2 border-border">
              <td className="px-4 py-2 text-sm font-medium text-muted-foreground" colSpan={2}>Total encaisse</td>
              <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(grandEntrees)}</td>
              <td className="px-4 py-2" />
            </tr>
            <tr>
              <td className="px-4 py-2 text-sm font-medium text-muted-foreground" colSpan={2}>Total decaisse</td>
              <td className="px-3 py-2" />
              <td className="px-4 py-2 text-right font-semibold text-red-600 dark:text-red-400">{formatCurrency(grandSorties)}</td>
            </tr>
            <tr className="bg-muted/50">
              <td className="px-4 py-3 text-sm font-bold" colSpan={2}>Solde net</td>
              <td colSpan={2} className={`px-4 py-3 text-right text-base font-bold ${solde >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {solde >= 0 ? "+" : ""}{formatCurrency(solde)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sub-component ────────────────────────────────────────

function LotJournalRows({
  journal,
  expanded,
  hasEvents,
  lotSolde,
  onToggle,
}: {
  journal: LotJournal;
  expanded: boolean;
  hasEvents: boolean;
  lotSolde: number;
  onToggle: () => void;
}) {
  const EVENT_ICONS: Record<EventKind, typeof FileText> = {
    document: FileText,
    reglement: CurrencyEur,
    commande: Package,
    stock_value: Package,
  };

  return (
    <>
      {/* Lot header row */}
      <tr
        className={`border-t border-border ${hasEvents ? "cursor-pointer hover:bg-muted/30" : ""}`}
        onClick={hasEvents ? onToggle : undefined}
      >
        <td className="px-4 py-2.5" colSpan={2}>
          <span className="flex items-center gap-2">
            {hasEvents && (
              <CaretRight
                size={12}
                weight="bold"
                className={`text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
              />
            )}
            <span className="font-semibold">{journal.lot.numero}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{journal.typeLabel}</Badge>
          </span>
        </td>
        <td className="px-3 py-2.5 text-right">
          {journal.totalEntrees > 0 ? (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(journal.totalEntrees)}</span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </td>
        <td className="px-4 py-2.5 text-right">
          {journal.totalSorties > 0 ? (
            <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(journal.totalSorties)}</span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </td>
      </tr>

      {/* Event rows */}
      {expanded && journal.events.map((event) => {
        const Icon = EVENT_ICONS[event.kind];
        const isDocument = event.kind === "document";
        const isCommande = event.kind === "commande";
        const isInfo = isDocument || isCommande;
        const isStockValue = event.kind === "stock_value";

        return (
          <tr key={event.id} className="border-t border-border/30 bg-muted/20">
            <td className="pl-10 pr-4 py-2">
              <div className="flex items-center gap-2">
                <Icon
                  size={12}
                  weight="duotone"
                  className={
                    isInfo
                      ? "text-muted-foreground shrink-0"
                      : event.entree > 0
                        ? "text-emerald-500 shrink-0"
                        : "text-red-500 shrink-0"
                  }
                />
                <div className="min-w-0">
                  <p className={`text-xs ${isInfo ? "text-muted-foreground" : "font-medium"}`}>{event.label}</p>
                  {event.sublabel && (
                    <p className="text-[10px] text-muted-foreground/70 truncate">{event.sublabel}</p>
                  )}
                </div>
              </div>
            </td>
            <td className="px-3 py-2 text-right text-xs text-muted-foreground">
              {formatDate(event.date)}
            </td>
            <td className="px-3 py-2 text-right text-xs">
              {event.entree > 0 ? (
                <span className={isInfo ? "text-muted-foreground" : "font-medium text-emerald-600 dark:text-emerald-400"}>
                  {isInfo ? "" : "+"}{formatCurrency(event.entree)}
                </span>
              ) : (
                <span className="text-muted-foreground/30">—</span>
              )}
            </td>
            <td className="px-4 py-2 text-right text-xs">
              {event.sortie > 0 ? (
                <span className={`${isStockValue ? "text-muted-foreground italic" : "font-medium text-red-600 dark:text-red-400"}`}>
                  -{formatCurrency(event.sortie)}
                </span>
              ) : (
                <span className="text-muted-foreground/30">—</span>
              )}
            </td>
          </tr>
        );
      })}

      {/* Lot subtotal when expanded */}
      {expanded && journal.events.length > 1 && (
        <tr className="border-t border-border/40 bg-muted/10">
          <td className="pl-10 pr-4 py-1.5 text-xs font-medium text-muted-foreground" colSpan={2}>
            Sous-total {journal.lot.numero}
          </td>
          <td colSpan={2} className={`px-4 py-1.5 text-right text-xs font-semibold ${lotSolde >= 0 ? "text-emerald-600/70 dark:text-emerald-400/70" : "text-red-600/70 dark:text-red-400/70"}`}>
            {lotSolde >= 0 ? "+" : ""}{formatCurrency(lotSolde)}
          </td>
        </tr>
      )}
    </>
  );
}
