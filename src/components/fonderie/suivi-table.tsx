"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  Factory,
  ClipboardText,
  Fire,
  ArrowRight,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { BDC_STATUS_CONFIG, BDL_STATUS_CONFIG } from "@/lib/fonderie/status-config";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FonderieLotRow, FonderieLotType } from "@/types/fonderie-lot";

interface SuiviTableProps {
  data: FonderieLotRow[];
  fonderies: string[];
}

const TYPE_LABELS: Record<FonderieLotType, { label: string; className: string }> = {
  commande: {
    label: "Commande",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  fonte: {
    label: "Fonte",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

export function SuiviTable({ data, fonderies }: SuiviTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("tous");
  const [fonderieFilter, setFonderieFilter] = useState<string>("toutes");
  const [statutFilter, setStatutFilter] = useState<string>("tous");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const allStatuts = useMemo(() => {
    const set = new Set(data.map((d) => d.statut));
    return [...set].sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.numero.toLowerCase().includes(q) ||
          r.fonderie_nom.toLowerCase().includes(q),
      );
    }

    if (typeFilter !== "tous") {
      result = result.filter((r) => r.type === typeFilter);
    }

    if (fonderieFilter !== "toutes") {
      result = result.filter((r) => r.fonderie_nom === fonderieFilter);
    }

    if (statutFilter !== "tous") {
      result = result.filter((r) => r.statut === statutFilter);
    }

    return result;
  }, [data, search, typeFilter, fonderieFilter, statutFilter]);

  const totalItems = filtered.length;
  const paginatedData = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  function getStatusBadge(row: FonderieLotRow) {
    const config =
      row.type === "commande"
        ? BDC_STATUS_CONFIG[row.statut]
        : BDL_STATUS_CONFIG[row.statut];
    if (!config) return null;
    return config;
  }

  function getHref(row: FonderieLotRow) {
    return row.type === "commande"
      ? `/fonderie/suivi/bdc/${row.id}`
      : `/fonderie/suivi/bdl/${row.id}`;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass
            size={16}
            weight="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Rechercher par numéro, fonderie..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(0);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            if (v) setTypeFilter(v);
            setCurrentPage(0);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les types</SelectItem>
            <SelectItem value="commande">Commandes</SelectItem>
            <SelectItem value="fonte">Fonte</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={fonderieFilter}
          onValueChange={(v) => {
            if (v) setFonderieFilter(v);
            setCurrentPage(0);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fonderie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les fonderies</SelectItem>
            {fonderies.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statutFilter}
          onValueChange={(v) => {
            if (v) setStatutFilter(v);
            setCurrentPage(0);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {allStatuts.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white dark:bg-card">
        <Table className={paginatedData.length === 0 ? "h-full" : ""}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="bg-transparent hover:bg-transparent">
              <TableHead className="pl-4">Numéro</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Fonderie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-center">Lignes</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent h-full">
                <TableCell
                  colSpan={8}
                  className="text-center align-middle text-muted-foreground"
                >
                  <Factory
                    size={32}
                    weight="duotone"
                    className="mx-auto mb-2 opacity-40"
                  />
                  Aucun lot fonderie.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const typeBadge = TYPE_LABELS[row.type];
                const statusBadge = getStatusBadge(row);
                const TypeIcon =
                  row.type === "commande" ? ClipboardText : Fire;

                return (
                  <TableRow
                    key={`${row.type}-${row.id}`}
                    className="bg-white dark:bg-card"
                  >
                    <TableCell className="pl-4">
                      <Link
                        href={getHref(row)}
                        className="flex items-center gap-2.5 hover:underline"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <TypeIcon
                            size={16}
                            weight="duotone"
                            className="text-muted-foreground"
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {row.numero}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${typeBadge.className}`}
                      >
                        {typeBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.fonderie_nom}</TableCell>
                    <TableCell>
                      {statusBadge && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(row.montant)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {row.nb_lignes}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(row.date_creation)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <Link href={getHref(row)}>
                        <ArrowRight
                          size={14}
                          weight="regular"
                          className="text-muted-foreground"
                        />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="shrink-0">
        <DataTablePagination
          totalItems={totalItems}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
