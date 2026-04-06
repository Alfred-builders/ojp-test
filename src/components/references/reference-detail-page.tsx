"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowSquareOut,
  Diamond,
  Coins,
  Ruler,
  CurrencyEur,
  SignIn,
  Signpost,
  Storefront,
  Factory,
  Package,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/dashboard/header";
import { ReferenceLifecycleStepper } from "@/components/references/reference-lifecycle-stepper";
import { REF_STATUS_CONFIG } from "@/components/references/reference-status-config";
import { formatDate, formatCurrency } from "@/lib/format";
import type { LotReference } from "@/types/lot";

// ── Types ──────────────────────────────────────────────

interface ParentLot {
  id: string;
  numero: string;
  type: string;
  status: string;
  date_finalisation: string | null;
  created_at: string;
}

interface DossierInfo {
  id: string;
  numero: string;
}

interface ClientInfo {
  id: string;
  civility: string;
  first_name: string;
  last_name: string;
}

interface StockItemInfo {
  id: string;
  nom: string;
  statut: string;
}

interface SaleInfo {
  ligne: { id: string; prix_total: number | null; is_livre: boolean };
  lot: { id: string; numero: string; status: string; date_livraison: string | null; created_at: string };
  dossier: DossierInfo;
  client: ClientInfo;
}

interface OrInvestInfo {
  id: string;
  designation: string;
  poids: number | null;
  qualite: string | null;
}

interface ReferenceDetailPageProps {
  reference: LotReference;
  parentLot: ParentLot;
  dossier: DossierInfo;
  client: ClientInfo;
  stockItem?: StockItemInfo | null;
  sale?: SaleInfo | null;
  orInvestissement?: OrInvestInfo | null;
}

// ── Helpers ──────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function LinkedRow({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          {value}
          <ArrowSquareOut size={14} weight="regular" />
        </Link>
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </div>
  );
}

function formatClientName(c: ClientInfo) {
  return `${c.civility} ${c.first_name} ${c.last_name}`;
}

const LOT_TYPE_LABELS: Record<string, string> = {
  rachat: "Rachat",
  vente: "Vente",
  depot_vente: "Dépôt-vente",
};

const DESTINATION_CONFIG: Record<string, { label: string; icon: typeof Package }> = {
  stock_boutique: { label: "Stock boutique", icon: Package },
  fonderie: { label: "Fonderie", icon: Factory },
  depot_vente: { label: "Dépôt-vente", icon: Storefront },
};

// ── Component ──────────────────────────────────────────────

export function ReferenceDetailPage({
  reference,
  parentLot,
  dossier,
  client,
  stockItem,
  sale,
  orInvestissement,
}: ReferenceDetailPageProps) {
  const statusConfig = REF_STATUS_CONFIG[reference.status];
  const isBijoux = reference.categorie === "bijoux";
  const totalPrice = reference.prix_achat * reference.quantite;
  const hasCaracteristiques = reference.metal || reference.qualite || reference.poids;
  const hasFiscalite = reference.regime_fiscal || reference.montant_taxe > 0;

  return (
    <>
      <Header
        title={reference.designation}
        backAction={
          <Link href={`/lots/${parentLot.id}`}>
            <Button variant="ghost" size="icon-sm" aria-label="Retour">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <Badge variant="secondary" className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </Header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Lifecycle stepper */}
          <ReferenceLifecycleStepper status={reference.status} />

          {/* 2-column grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Photo (if available) */}
            {reference.photo_url && (
              <Card>
                <CardContent className="flex items-center justify-center min-h-[250px]">
                  <Image
                    src={reference.photo_url}
                    alt={reference.designation}
                    width={350}
                    height={350}
                    className="max-h-[350px] rounded-lg object-contain"
                    unoptimized
                  />
                </CardContent>
              </Card>
            )}

            {/* Identification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isBijoux ? (
                    <Diamond size={20} weight="duotone" />
                  ) : (
                    <Coins size={20} weight="duotone" />
                  )}
                  Identification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DetailRow label="Désignation" value={reference.designation} />
                <DetailRow
                  label="Catégorie"
                  value={isBijoux ? "Bijoux" : "Or investissement"}
                />
                <DetailRow
                  label="Type"
                  value={
                    <Badge variant="outline">
                      {reference.type_rachat === "devis" ? "Devis" : "Direct"}
                    </Badge>
                  }
                />
                <DetailRow label="Quantité" value={reference.quantite} />
                {orInvestissement && (
                  <DetailRow label="Produit catalogue" value={orInvestissement.designation} />
                )}
              </CardContent>
            </Card>

            {/* Caractéristiques (only if data exists) */}
            {hasCaracteristiques && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ruler size={20} weight="duotone" />
                    Caractéristiques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reference.metal && <DetailRow label="Métal" value={reference.metal} />}
                  {reference.qualite && <DetailRow label="Qualité" value={reference.qualite} />}
                  {reference.poids != null && <DetailRow label="Poids" value={`${reference.poids} g`} />}
                  {reference.is_scelle && <DetailRow label="Scellé" value="Oui" />}
                  {reference.has_facture && <DetailRow label="Facture" value="Oui" />}
                </CardContent>
              </Card>
            )}

            {/* Prix & Fiscalité */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CurrencyEur size={20} weight="duotone" />
                  Prix{hasFiscalite ? " & Fiscalité" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DetailRow label="Prix unitaire" value={formatCurrency(reference.prix_achat)} />
                {reference.quantite > 1 && (
                  <DetailRow label="Prix total" value={formatCurrency(totalPrice)} />
                )}
                {reference.prix_revente_estime != null && (
                  <DetailRow label="Prix revente estimé" value={formatCurrency(reference.prix_revente_estime)} />
                )}
                {reference.cours_metal_utilise != null && (
                  <DetailRow label="Cours métal utilisé" value={`${reference.cours_metal_utilise} €/g`} />
                )}
                {reference.coefficient_utilise != null && (
                  <DetailRow label="Coefficient utilisé" value={`${(reference.coefficient_utilise * 100).toFixed(0)}%`} />
                )}
                {reference.prix_acquisition != null && (
                  <DetailRow label="Prix d'acquisition" value={formatCurrency(reference.prix_acquisition)} />
                )}
                {reference.date_acquisition && (
                  <DetailRow label="Date d'acquisition" value={formatDate(reference.date_acquisition)} />
                )}
                {reference.regime_fiscal && (
                  <DetailRow
                    label="Régime fiscal"
                    value={
                      <Badge variant="outline">
                        {reference.regime_fiscal === "TPV" ? "Taxe sur plus-value" : "Taxe sur métaux précieux"}
                      </Badge>
                    }
                  />
                )}
                {reference.montant_taxe > 0 && (
                  <DetailRow label="Montant taxe" value={formatCurrency(reference.montant_taxe)} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Provenance (always shown) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SignIn size={20} weight="duotone" />
                Provenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LinkedRow
                label="Client"
                value={formatClientName(client)}
                href={`/clients/${client.id}`}
              />
              <LinkedRow
                label="Dossier"
                value={dossier.numero}
                href={`/dossiers/${dossier.id}`}
              />
              <LinkedRow
                label={`Lot de ${LOT_TYPE_LABELS[parentLot.type]?.toLowerCase() ?? parentLot.type}`}
                value={parentLot.numero}
                href={`/lots/${parentLot.id}`}
              />
              {parentLot.date_finalisation && (
                <DetailRow label="Date de finalisation" value={formatDate(parentLot.date_finalisation)} />
              )}
            </CardContent>
          </Card>

          {/* Destination (only if set) */}
          {reference.destination && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Signpost size={20} weight="duotone" />
                  Destination
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const destConfig = DESTINATION_CONFIG[reference.destination!];
                  return (
                    <>
                      <DetailRow
                        label="Type"
                        value={
                          <Badge variant="outline">
                            {destConfig?.label ?? reference.destination}
                          </Badge>
                        }
                      />
                      {stockItem && (
                        <LinkedRow
                          label="Article en stock"
                          value={stockItem.nom}
                          href={`/stock/${stockItem.id}`}
                        />
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Vente (only if stock item was sold) */}
          {sale && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Storefront size={20} weight="duotone" />
                  Vente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LinkedRow
                  label="Client acheteur"
                  value={formatClientName(sale.client)}
                  href={`/clients/${sale.client.id}`}
                />
                <LinkedRow
                  label="Dossier"
                  value={sale.dossier.numero}
                  href={`/dossiers/${sale.dossier.id}`}
                />
                <LinkedRow
                  label="Lot de vente"
                  value={sale.lot.numero}
                  href={`/lots/${sale.lot.id}`}
                />
                {sale.ligne.prix_total != null && (
                  <DetailRow label="Prix de vente" value={formatCurrency(sale.ligne.prix_total)} />
                )}
                <DetailRow
                  label="Livraison"
                  value={
                    <Badge
                      variant="outline"
                      className={
                        sale.ligne.is_livre
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-600/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-600/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30"
                      }
                    >
                      {sale.ligne.is_livre ? "Livré" : "En attente"}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Date de vente"
                  value={formatDate(sale.lot.date_livraison ?? sale.lot.created_at)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
