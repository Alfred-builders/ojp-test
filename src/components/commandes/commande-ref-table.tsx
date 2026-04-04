"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Package,
  WarningCircle,
  CheckCircle,
  Coins,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { CommandeLigneFlat } from "@/app/(dashboard)/commandes/page";
import type { FulfillmentStatus } from "@/types/vente";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

const FULFILLMENT_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  servi_stock: { label: "Servi stock", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  a_commander: { label: "À commander", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  commande: { label: "Commandé", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recu: { label: "Reçu", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

export function CommandeRefTable({ data }: { data: CommandeLigneFlat[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (item) =>
        item.designation.toLowerCase().includes(q) ||
        item.client_name.toLowerCase().includes(q) ||
        item.lot_numero.toLowerCase().includes(q) ||
        (item.metal ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalItems = filtered.length;
  const paginatedData = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  async function handleFulfillment(ligne: CommandeLigneFlat, status: FulfillmentStatus) {
    setLoading(ligne.id);
    const supabase = createClient();

    await supabase
      .from("vente_lignes")
      .update({ fulfillment: status })
      .eq("id", ligne.id);

    // If serving from stock, decrement quantity
    if (status === "servi_stock" && ligne.or_investissement_id) {
      await supabase.rpc("increment_or_invest_quantite", {
        p_id: ligne.or_investissement_id,
        p_qty: -ligne.quantite,
      });
    }

    // If reverting from servi_stock, re-increment
    if (ligne.fulfillment === "servi_stock" && status !== "servi_stock" && ligne.or_investissement_id) {
      await supabase.rpc("increment_or_invest_quantite", {
        p_id: ligne.or_investissement_id,
        p_qty: ligne.quantite,
      });
    }

    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
            className="pl-9 w-[200px]"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border bg-white dark:bg-card">
        <Table className={paginatedData.length === 0 ? "h-full" : ""}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="bg-transparent hover:bg-transparent">
              <TableHead className="pl-4">Désignation</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Qté</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-24 px-4 text-center text-muted-foreground">
                  Aucune référence en attente.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((ligne) => {
                const fulfillment = FULFILLMENT_CONFIG[ligne.fulfillment];
                const isFulfilled = ligne.fulfillment === "servi_stock" || ligne.fulfillment === "recu";
                const canServe = ligne.stock_disponible >= ligne.quantite;
                const isLoading = loading === ligne.id;

                return (
                  <TableRow key={ligne.id} className={`bg-white dark:bg-card ${isFulfilled ? "opacity-60" : ""}`}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                          <Coins size={16} weight="duotone" className="text-muted-foreground" />
                        </div>
                        <div>
                          <span className="font-medium text-sm">{ligne.designation}</span>
                          <p className="text-xs text-muted-foreground">
                            {ligne.metal ?? ""} {ligne.poids ? `· ${ligne.poids}g` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{ligne.client_name}</TableCell>
                    <TableCell className="font-medium">×{ligne.quantite}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${ligne.stock_disponible >= ligne.quantite ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {ligne.stock_disponible}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{formatCurrency(ligne.prix_total)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={fulfillment?.className}>
                        {fulfillment?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4">
                      {!isFulfilled && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-xs"
                            variant="outline"
                            disabled={isLoading || !canServe}
                            onClick={() => handleFulfillment(ligne, "servi_stock")}
                            title={canServe ? "Servir depuis stock" : `Stock insuffisant (${ligne.stock_disponible})`}
                          >
                            <Package size={14} weight="duotone" />
                          </Button>
                          {ligne.fulfillment !== "a_commander" ? (
                            <Button
                              size="icon-xs"
                              variant="outline"
                              disabled={isLoading}
                              onClick={() => handleFulfillment(ligne, "a_commander")}
                              title="Marquer à commander"
                            >
                              <WarningCircle size={14} weight="duotone" />
                            </Button>
                          ) : (
                            <Button
                              size="icon-xs"
                              variant="outline"
                              disabled={isLoading}
                              onClick={() => handleFulfillment(ligne, "recu")}
                              title="Marquer reçu"
                            >
                              <CheckCircle size={14} weight="duotone" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        totalItems={totalItems}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
