import Link from "next/link";
import { FolderOpen } from "@phosphor-icons/react/dist/ssr";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { formatDate } from "@/lib/format";

export interface DossierRow {
  id: string;
  numero: string;
  clientName: string;
  createdAt: string;
  lotStatuses: string[];
}

export function DashboardDossiers({ dossiers }: { dossiers: DossierRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen size={18} weight="duotone" />
          Dossiers a traiter
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dossiers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun dossier en cours.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Lots</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossiers.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer">
                    <TableCell colSpan={4} className="p-0">
                      <Link
                        href={`/dossiers/${d.id}`}
                        className="flex items-center px-2 py-2"
                      >
                        <span className="flex-1 font-medium">{d.numero}</span>
                        <span className="flex-1">{d.clientName}</span>
                        <span className="flex-1 text-muted-foreground">
                          {formatDate(d.createdAt)}
                        </span>
                        <span className="flex flex-1 flex-wrap gap-1">
                          {d.lotStatuses.map((s, i) => (
                            <LotStatusBadge key={i} status={s} />
                          ))}
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
