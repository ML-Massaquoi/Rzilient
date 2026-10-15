import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
} from "lucide-react";
import { requireUser } from "@/server/auth";
import { getAssetFilterOptions } from "@/server/queries/assets";
import { listDepartmentsWithCounts } from "@/server/queries/employees";
import { getReportSummary } from "@/server/queries/report-charts";
import {
  describeReportFilters,
  isReportType,
  parseReportFilters,
  REPORT_META,
  REPORT_TYPES,
  reportHref,
  runReport,
  type ReportType,
} from "@/server/queries/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { PrintButton } from "@/components/reports/print-button";
import { ReportSummary } from "@/components/reports/report-summary";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export const metadata: Metadata = {
  title: "Reports",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const PREVIEW_ROWS = 25;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireUser();
  const sp = await searchParams;

  const rawType = first(sp.type);
  const type: ReportType = isReportType(rawType) ? rawType : "overview";

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    const single = first(value);
    if (single) params.set(key, single);
  }
  const filters = parseReportFilters(params);

  const [report, summary, categories, departments] = await Promise.all([
    runReport(type, filters, PREVIEW_ROWS),
    getReportSummary(type, filters),
    getAssetFilterOptions(),
    listDepartmentsWithCounts(),
  ]);
  const departmentNames = departments.departments.map(
    (department) => department.name
  );

  const preview = report.rows.slice(0, PREVIEW_ROWS);
  const exportQs = reportHref(type, filters);
  const isOverview = type === "overview";
  const filterText = describeReportFilters(filters);
  const generatedAt = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Freetown",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="hidden print:block">
        <p className="text-muted-foreground text-[10px] font-medium tracking-[0.2em] uppercase">
          Freetown International Airport · IT Department
        </p>
        <h2 className="mt-1 text-lg font-semibold">
          {REPORT_META[type].title}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Generated {generatedAt} (Africa/Freetown) · {filterText}
        </p>
      </div>

      <div className="print:hidden">
        <PageHeader
          icon={BarChart3Icon}
          iconClassName="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
          title="Reports"
          subtitle="Executive KPIs, live charts and exportable detail tables."
          chips={[
            {
              label: "Report Types",
              value: REPORT_TYPES.length,
              icon: FileTextIcon,
            },
            {
              label: "Departments",
              value: departments.departments.length,
              icon: BarChart3Icon,
            },
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
        {REPORT_TYPES.map((reportType) => (
          <Link
            key={reportType}
            href={`/reports?${reportHref(reportType, filters)}`}
            className={cn(
              "bg-card rounded-lg border p-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              reportType === type
                ? "border-primary ring-1 ring-primary"
                : "hover:border-foreground/25"
            )}
          >
            <div className="flex items-center gap-2">
              <FileTextIcon
                className={cn(
                  "size-4",
                  reportType === type ? "text-primary" : "text-muted-foreground"
                )}
              />
              <p className="text-sm font-semibold">
                {REPORT_META[reportType].title}
              </p>
            </div>
            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
              {REPORT_META[reportType].description}
            </p>
          </Link>
        ))}
      </div>

      {!isOverview ? (
        <div className="print:hidden">
          <ReportFilters
            type={type}
            categories={categories}
            departments={departmentNames}
          />
        </div>
      ) : null}

      <ReportSummary kpis={summary.kpis} charts={summary.charts} />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-muted-foreground text-sm">
          {report.total === 0
            ? "No rows match the current filters."
            : `Showing ${preview.length} of ${report.total.toLocaleString()} row${report.total === 1 ? "" : "s"}.`}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            {isOverview ? "Metric summary" : "Detail rows"}
          </Badge>
          <PrintButton />
          <Button
            render={
              <Link href={`/api/reports/export?${exportQs}`} download="" />
            }
            disabled={report.total === 0}
          >
            <DownloadIcon />
            Export CSV
          </Button>
          <Button
            render={
              <Link
                href={`/api/reports/export?${exportQs}&format=xlsx`}
                download=""
              />
            }
            disabled={report.total === 0}
          >
            <FileSpreadsheetIcon />
            Export Excel
          </Button>
        </div>
      </div>

      {preview.length > 0 ? (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                {report.columns.map((column) => (
                  <th
                    key={column}
                    className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide whitespace-nowrap uppercase"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-border/70 border-b last:border-b-0"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="max-w-[320px] truncate px-3 py-2 align-top"
                    >
                      {cell || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          No rows to display for this report with the current filters.
        </div>
      )}
    </div>
  );
}
