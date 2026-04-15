"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { FileText, DownloadSimple, X, Eye, DotsThree, SpinnerGap, ArrowUp, ArrowDown, ArrowsDownUp } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { DocumentRecord, DocumentType, DocumentStatus } from "@/types/document";

const TYPE_CONFIG: Record<DocumentType, { label: string; className: string }> = {
  quittance_rachat: {
    label: "Quittance",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  contrat_rachat: {
    label: "Contrat",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  devis_rachat: {
    label: "Devis",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
  contrat_depot_vente: {
    label: "Contrat DV",
    className: "bg-cyan-100 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  confie_achat: {
    label: "Confié",
    className: "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
  },
  quittance_depot_vente: {
    label: "Quittance DV",
    className: "bg-teal-100 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400",
  },
  facture_vente: {
    label: "Facture",
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
  },
  facture_acompte: {
    label: "Acompte",
    className: "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400",
  },
  facture_solde: {
    label: "Solde",
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
  },
  bon_commande: {
    label: "Bon de commande",
    className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  bon_livraison: {
    label: "Bon de livraison",
    className: "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
  },
};

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  en_attente: {
    label: "En attente",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
  accepte: {
    label: "Accepté",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  refuse: {
    label: "Refusé",
    className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  signe: {
    label: "Signé",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  regle: {
    label: "Réglé",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  emis: {
    label: "Émis",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800",
  },
  annule: {
    label: "Annulé",
    className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
};

function getStorageUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/documents/${path}`;
}

interface DocumentsTableProps {
  documents: DocumentRecord[];
  title?: string;
  rowActions?: (doc: DocumentRecord) => React.ReactNode;
}

type SortKey = "numero" | "type" | "status" | "created_at";
type SortDir = "asc" | "desc";

function SortableDocHead({ children, sortKey, currentSort, currentDir, onSort }: {
  children: React.ReactNode; sortKey: SortKey; currentSort: SortKey | null; currentDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead>
      <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => onSort(sortKey)}>
        {children}
        {isActive ? (currentDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowsDownUp size={12} className="opacity-40" />}
      </button>
    </TableHead>
  );
}

export function DocumentsTable({ documents, title = "Documents", rowActions }: DocumentsTableProps) {
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return documents;
    return [...documents].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "numero") cmp = a.numero.localeCompare(b.numero);
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [documents, sortKey, sortDir]);

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 font-semibold border-b pb-3">
        <FileText size={20} weight="duotone" />
        {title} ({documents.length})
      </h3>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun document généré.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden bg-white dark:bg-card">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow className="bg-transparent hover:bg-transparent">
                <SortableDocHead sortKey="numero" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}><span className="pl-4">Numéro</span></SortableDocHead>
                <SortableDocHead sortKey="type" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>Type</SortableDocHead>
                <SortableDocHead sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>Statut</SortableDocHead>
                <SortableDocHead sortKey="created_at" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>Date</SortableDocHead>
                <TableHead className="w-10 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((doc) => {
                const config = TYPE_CONFIG[doc.type];
                return (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer bg-white dark:bg-card"
                    onClick={() => setViewingDoc(doc)}
                  >
                    <TableCell className="pl-4 font-medium">{doc.numero}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={config.className}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_CONFIG[doc.status].className}>
                        {STATUS_CONFIG[doc.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(doc.created_at)}</TableCell>
                    <TableCell className="pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              aria-label="Actions"
                            />
                          }
                        >
                          <DotsThree size={16} weight="regular" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setViewingDoc(doc);
                            }}
                          >
                            <Eye size={16} weight="duotone" />
                            Voir le document
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              window.open(getStorageUrl(doc.storage_path), "_blank");
                            }}
                          >
                            <DownloadSimple size={16} weight="duotone" />
                            Télécharger
                          </DropdownMenuItem>
                          {rowActions?.(doc)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewingDoc && (
        <PdfViewerModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}

function PdfViewerModal({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    const supabase = createClient();

    supabase.storage
      .from("documents")
      .download(doc.storage_path)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          console.error("PDF download error:", err, "path:", doc.storage_path);
          setError(true);
          setLoading(false);
          return;
        }
        // Force correct MIME type
        const pdfBlob = new Blob([data], { type: "application/pdf" });
        const url = URL.createObjectURL(pdfBlob);
        revoke = url;
        setBlobUrl(url);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [doc.storage_path]);

  const handleDownload = useCallback(() => {
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${doc.numero}.pdf`;
      a.click();
    } else {
      window.open(getStorageUrl(doc.storage_path), "_blank");
    }
  }, [blobUrl, doc.numero, doc.storage_path]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        className="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-medium">{doc.numero}</span>
            <Badge
              variant="secondary"
              className={TYPE_CONFIG[doc.type].className}
            >
              {TYPE_CONFIG[doc.type].label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <DownloadSimple size={14} weight="regular" />
              Télécharger
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              aria-label="Fermer"
            >
              <X size={16} weight="regular" />
            </Button>
          </div>
        </div>
        {/* PDF content */}
        <div className="flex-1">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <SpinnerGap size={32} weight="regular" className="animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">Impossible de charger le document.</p>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <DownloadSimple size={14} weight="regular" />
                Télécharger directement
              </Button>
            </div>
          )}
          {blobUrl && (
            <iframe
              src={blobUrl}
              className="h-full w-full"
              title={doc.numero}
            />
          )}
        </div>
      </div>
    </div>
  );
}
