import { ReportCharts } from "@/components/reports/charts";
import type { ChartBlock, KpiCard } from "@/server/queries/report-charts";
import { cn } from "cn";

const TONE_CLASS: Record<NonNullable<KpiCard["tone"]>, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-sky-600 dark:text-sky-400",
};

export function ReportSummary({
  kpis,
  charts,
}: {
  kpis: KpiCard[];
  charts: ChartBlock[];
}) {
  return (
    <section className="flex flex-col gap-4 print:gap-3">
      {kpis.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-card rounded-lg border p-4 print:break-inside-avoid"
            >
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                {kpi.label}
              </p>
              <p
                className={cn(
                  "mt-1.5 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl",
                  kpi.tone && TONE_CLASS[kpi.tone]
                )}
              >
                {kpi.value}
              </p>
              {kpi.hint ? (
                <p className="text-muted-foreground mt-1 text-xs">{kpi.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <ReportCharts blocks={charts} />
    </section>
  );
}
