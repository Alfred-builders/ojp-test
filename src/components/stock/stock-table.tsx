"use client";

import { useRouter } from "next/navigation";
import type { BijouxStock } from "@/types/bijoux";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const statutConfig: Record<
  BijouxStock["statut"],
  { label: string; className: string }
> = {
  en_stock: { label: "En stock", className: "bg-blue-500/10 text-blue-600 border-blue-600/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-400/30" },
  vendu: { label: "Vendu", className: "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20" },
  reserve: { label: "Réservé", className: "bg-amber-500/10 text-amber-600 border-amber-600/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30" },
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function StockTable({ data }: { data: BijouxStock[] }) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="pl-4">Nom</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Métal</TableHead>
          <TableHead>Qualité</TableHead>
          <TableHead className="text-right">Poids</TableHead>
          <TableHead className="text-right">Prix d&apos;achat</TableHead>
          <TableHead className="text-right pr-4">Prix de revente</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-24 px-4 text-center text-muted-foreground">
              Aucun bijou en stock.
            </TableCell>
          </TableRow>
        ) : (
          data.map((item) => {
            const statut = statutConfig[item.statut];
            return (
              <TableRow
                key={item.id}
                className="cursor-pointer bg-white dark:bg-card"
                onClick={() => router.push(`/stock/${item.id}`)}
              >
                <TableCell className="pl-4 font-medium">{item.nom}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statut.className}>{statut.label}</Badge>
                </TableCell>
                <TableCell>{item.metaux ?? "—"}</TableCell>
                <TableCell>{item.qualite ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {item.poids !== null ? `${item.poids} g` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.prix_achat)}
                </TableCell>
                <TableCell className="text-right pr-4">
                  {formatCurrency(item.prix_revente)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
