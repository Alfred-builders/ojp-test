import { Card, CardContent } from "@/components/ui/card";
import {
  CurrencyEur,
  TrendUp,
  Warehouse,
  HourglassHigh,
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react/dist/ssr";
import { formatCurrency } from "@/lib/format";
import type { UserRole } from "@/types/auth";

export interface KpiData {
  caMonth: number;
  caLastMonth: number | null;
  margeBrute: number;
  margeBruteLastMonth: number | null;
  valeurStock: number;
  montantAttente: number;
}

function computeChange(current: number, previous: number | null) {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const KPIS = [
  {
    key: "ca",
    label: "CA du mois",
    icon: CurrencyEur,
    getValue: (d: KpiData) => d.caMonth,
    getChange: (d: KpiData) => computeChange(d.caMonth, d.caLastMonth),
  },
  {
    key: "marge",
    label: "Marge brute",
    icon: TrendUp,
    getValue: (d: KpiData) => d.margeBrute,
    getChange: (d: KpiData) => computeChange(d.margeBrute, d.margeBruteLastMonth),
  },
  {
    key: "stock",
    label: "Valeur stock",
    icon: Warehouse,
    getValue: (d: KpiData) => d.valeurStock,
    getChange: () => null,
  },
  {
    key: "attente",
    label: "En attente",
    icon: HourglassHigh,
    getValue: (d: KpiData) => d.montantAttente,
    getChange: () => null,
  },
] as const;

const OWNER_ONLY_KPIS = new Set(["ca", "marge"]);

export function DashboardKpis({ data, role = "proprietaire" }: { data: KpiData; role?: UserRole }) {
  const visibleKpis = role === "proprietaire" ? KPIS : KPIS.filter((k) => !OWNER_ONLY_KPIS.has(k.key));

  return (
    <div className={`grid grid-cols-2 ${visibleKpis.length <= 2 ? "xl:grid-cols-2" : "xl:grid-cols-4"} gap-4`}>
      {visibleKpis.map((kpi) => {
        const value = kpi.getValue(data);
        const change = kpi.getChange(data);
        const Icon = kpi.icon;

        return (
          <Card key={kpi.key} size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <Icon size={20} weight="duotone" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold tracking-tight">
                    {formatCurrency(value)}
                  </p>
                  {change !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                        change >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {change >= 0 ? (
                        <ArrowUp size={12} weight="bold" />
                      ) : (
                        <ArrowDown size={12} weight="bold" />
                      )}
                      {Math.abs(change)}%
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
