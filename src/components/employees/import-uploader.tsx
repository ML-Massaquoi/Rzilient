"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";
import {
  confirmEmployeeImport,
  prepareEmployeeImport,
} from "@/server/actions/employees";
import type { ImportRowKind } from "@/lib/import/employees";

const KIND_LABELS: Record<ImportRowKind, string> = {
  new: "Will be added",
  update: "Will be updated",
  duplicate: "Duplicate in file",
  invalid: "Invalid",
  skipped: "Skipped",
};

const KIND_STYLES: Record<ImportRowKind, string> = {
  new: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  update: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  duplicate: "border-border text-muted-foreground",
  invalid: "border-destructive/40 text-destructive",
  skipped: "border-border text-muted-foreground",
};

function SummaryStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="border-border flex flex-col gap-0.5 rounded-md border px-3 py-2">
      <span className={cn("text-lg font-semibold tabular-nums", className)}>
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

export function EmployeeImport() {
  const [prepareState, prepareAction, preparePending] = useActionState(
    prepareEmployeeImport,
    { ok: false, attempt: 0 }
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmEmployeeImport,
    { ok: false, attempt: 0 }
  );

  const result =
    confirmState.result &&
    (confirmState.attempt ?? 0) >= (prepareState.attempt ?? 0)
      ? confirmState.result
      : undefined;
  const preview = result ? undefined : prepareState.preview;

  return (
    <div className="flex flex-col gap-6">
      <form
        action={prepareAction}
        className="bg-card flex flex-col gap-4 rounded-lg border p-5"
      >
        <div>
          <h2 className="text-sm font-semibold">1. Upload the directory file</h2>
          <p className="text-muted-foreground text-xs">
            Excel (.xlsx, .xls) or CSV up to 5 MB. Recognized columns: End-User /
            Full Name and Department (optionally FIA number, employee number,
            position, unit, email, phone/dial number).
          </p>
        </div>

        {prepareState.error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not read the file</AlertTitle>
            <AlertDescription>{prepareState.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <Label htmlFor="file" className="mb-1.5 block text-sm">
              Directory file
            </Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="h-9"
              required
            />
          </div>
          <Button type="submit" disabled={preparePending}>
            {preparePending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Reading file…
              </>
            ) : (
              <>
                <UploadIcon />
                Upload &amp; preview
              </>
            )}
          </Button>
        </div>
      </form>

      {preview ? (
        <section className="bg-card flex flex-col gap-4 rounded-lg border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                2. Review the changes before importing
              </h2>
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                <FileSpreadsheetIcon className="size-3.5" />
                {preview.fileName} · {preview.summary.total} rows scanned
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <SummaryStat
              label="New employees"
              value={preview.summary.new}
              className="text-emerald-600 dark:text-emerald-400"
            />
            <SummaryStat
              label="Updates"
              value={preview.summary.update}
              className="text-amber-600 dark:text-amber-400"
            />
            <SummaryStat label="Duplicates" value={preview.summary.duplicate} />
            <SummaryStat
              label="Invalid"
              value={preview.summary.invalid}
              className="text-destructive"
            />
            <SummaryStat label="Skipped" value={preview.summary.skipped} />
          </div>

          {preview.departmentsToCreate.length > 0 ? (
            <Alert>
              <AlertTitle>
                {preview.departmentsToCreate.length} new department
                {preview.departmentsToCreate.length === 1 ? "" : "s"} will be
                created
              </AlertTitle>
              <AlertDescription>
                {preview.departmentsToCreate.join(" · ")}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="border-border max-h-[420px] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowIndex} className="border-border border-t">
                    <td className="text-muted-foreground px-3 py-1.5 text-xs tabular-nums">
                      {row.rowIndex}
                    </td>
                    <td className="px-3 py-1.5">
                      {row.employee.fullName || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-muted-foreground px-3 py-1.5 text-xs">
                      {row.employee.department ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge variant="outline" className={KIND_STYLES[row.kind]}>
                        {KIND_LABELS[row.kind]}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-3 py-1.5 text-xs">
                      {row.changes?.length
                        ? row.changes.join("; ")
                        : row.reason ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.totalRows > preview.rows.length ? (
            <p className="text-muted-foreground text-xs">
              Showing the first {preview.rows.length} of {preview.totalRows}{" "}
              classified rows. All {preview.totalRows} rows will be processed.
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground max-w-lg text-xs">
              Matching is by name (case-insensitive). Existing employees are
              updated only where the file has values — nothing already in the
              directory is overwritten with blanks.
            </p>
            <form action={confirmAction}>
              <input type="hidden" name="payload" value={preview.payload} />
              <Button type="submit" disabled={confirmPending}>
                {confirmPending ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    Import {preview.summary.new + preview.summary.update} employee
                    {preview.summary.new + preview.summary.update === 1 ? "" : "s"}
                    <ArrowRightIcon />
                  </>
                )}
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      {confirmState.error ? (
        <Alert variant="destructive">
          <AlertTitle>Import failed</AlertTitle>
          <AlertDescription>{confirmState.error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <section className="border-emerald-500/40 bg-emerald-500/5 flex flex-col gap-3 rounded-lg border p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="text-emerald-600 size-5 dark:text-emerald-400" />
            <h2 className="text-sm font-semibold">Import complete</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            >
              {result.created} added
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-600 dark:text-amber-400"
            >
              {result.updated} updated
            </Badge>
            {result.departmentsCreated > 0 ? (
              <Badge variant="outline">
                {result.departmentsCreated} departments created
              </Badge>
            ) : null}
            <Badge variant="outline">{result.ignored} ignored</Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            {result.fileName} · recorded in the audit log as one import event.
          </p>
          <div className="flex gap-2">
            <Button render={<Link href="/employees" />}>
              View directory
              <ArrowRightIcon />
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
