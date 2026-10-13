"use client";

import { useEffect, useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  Loader2Icon,
  SaveIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaintenanceType } from "@/generated/prisma/enums";
import {
  MAINTENANCE_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import type { MaintenanceAssetHit } from "@/server/queries/maintenance";
import {
  createMaintenanceRecord,
  searchMaintenanceAssetsAction,
  type MaintenanceFormState,
} from "@/server/actions/maintenance";

const emptyState: MaintenanceFormState = { ok: false, attempt: 0 };

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string[];
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-sm">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {children}
      {error?.length ? (
        <p id={`${htmlFor}-error`} className="text-destructive mt-1.5 text-xs">
          {error[0]}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

const DEBOUNCE_MS = 250;

function MaintenanceAssetPicker({
  value,
  onChange,
}: {
  value: MaintenanceAssetHit | null;
  onChange: (asset: MaintenanceAssetHit | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MaintenanceAssetHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchMaintenanceAssetsAction(trimmed);
        setResults(hits);
        setSearched(true);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  if (value) {
    const openCount = value._count.maintenanceRecords;
    return (
      <div className="border-border flex items-start justify-between gap-3 rounded-md border p-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-muted-foreground">
            {value.assetTag}
          </p>
          <p className="truncate text-sm font-medium">{value.name}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {value.category.name}
            {value.serialNumber ? ` · S/N ${value.serialNumber}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{STATUS_LABELS[value.status]}</Badge>
            {openCount > 0 ? (
              <Badge variant="outline" className="text-status-maintenance">
                {openCount} open record{openCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
        >
          <XIcon />
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id="maintenance-asset-search"
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            if (!next.trim()) {
              setResults([]);
              setSearched(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              document.getElementById("maintenance-asset-hit-0")?.focus();
            }
          }}
          placeholder="Search by tag, name, serial or model…"
          className="pl-9"
          aria-label="Search assets for maintenance"
        />
      </div>
      <div className="flex min-h-8 flex-col gap-1">
        {pending ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-3.5 animate-spin" /> Searching…
          </p>
        ) : results.length > 0 ? (
          results.map((hit, index) => (
            <button
              key={hit.id}
              id={`maintenance-asset-hit-${index}`}
              type="button"
              onClick={() => onChange(hit)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  document
                    .getElementById(`maintenance-asset-hit-${index + 1}`)
                    ?.focus();
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  if (index === 0)
                    document.getElementById("maintenance-asset-search")?.focus();
                  else
                    document
                      .getElementById(`maintenance-asset-hit-${index - 1}`)
                      ?.focus();
                }
              }}
              className="hover:bg-muted/60 focus-visible:bg-muted/60 rounded-md px-3 py-2 text-left focus-visible:outline-none"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {hit.assetTag}
              </span>
              <span className="ml-2 text-sm font-medium">{hit.name}</span>
              <span className="text-muted-foreground block text-xs">
                {STATUS_LABELS[hit.status]}
                {hit._count.maintenanceRecords > 0
                  ? ` · ${hit._count.maintenanceRecords} open maintenance record${hit._count.maintenanceRecords === 1 ? "" : "s"}`
                  : ""}
              </span>
            </button>
          ))
        ) : searched ? (
          <p className="text-muted-foreground px-1 text-sm">
            No asset found. Retired, disposed and archived assets are excluded.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function MaintenanceForm({
  initialAsset,
  cancelHref,
}: {
  initialAsset: MaintenanceAssetHit | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    createMaintenanceRecord,
    emptyState
  );
  const [asset, setAsset] = useState<MaintenanceAssetHit | null>(initialAsset);

  const err = (key: string) => state.errors?.[key];
  const v = (key: string) => state.values?.[key] ?? "";

  return (
    <form
      key={state.attempt ?? 0}
      action={formAction}
      className="flex flex-col gap-6"
    >
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <input type="hidden" name="assetId" value={asset?.id ?? ""} />

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h3 className="text-sm font-semibold">Asset</h3>
            <p className="text-muted-foreground text-xs">
              The asset this maintenance record belongs to. The asset moves to
              “In maintenance” once the record is created.
            </p>
          </div>
          <div className="sm:col-span-2">
            <MaintenanceAssetPicker value={asset} onChange={setAsset} />
            {err("assetId")?.length ? (
              <p className="text-destructive mt-1.5 text-xs">
                {err("assetId")![0]}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h3 className="text-sm font-semibold">Work details</h3>
            <p className="text-muted-foreground text-xs">
              What is being serviced, by whom, and at what cost.
            </p>
          </div>

          <Field label="Title" htmlFor="title" required error={err("title")}>
            <Input
              id="title"
              name="title"
              defaultValue={v("title")}
              placeholder="e.g. Battery replacement"
              aria-invalid={Boolean(err("title"))}
              aria-describedby={err("title") ? "title-error" : undefined}
            />
          </Field>

          <Field label="Type" htmlFor="type" required error={err("type")}>
            <Select name="type" defaultValue={v("type") || "CORRECTIVE"}>
              <SelectTrigger id="type" aria-label="Maintenance type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MaintenanceType).map((value) => (
                  <SelectItem key={value} value={value}>
                    {MAINTENANCE_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Technician"
            htmlFor="technician"
            error={err("technician")}
            hint="Person or vendor performing the work"
          >
            <Input
              id="technician"
              name="technician"
              defaultValue={v("technician")}
              placeholder="e.g. Moses / FieldCom Ltd"
              aria-invalid={Boolean(err("technician"))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cost (SLE)" htmlFor="cost" error={err("cost")}>
              <Input
                id="cost"
                name="cost"
                inputMode="decimal"
                defaultValue={v("cost")}
                placeholder="85.00"
                aria-invalid={Boolean(err("cost"))}
              />
            </Field>
            <Field
              label="Downtime (hours)"
              htmlFor="downtimeHours"
              error={err("downtimeHours")}
            >
              <Input
                id="downtimeHours"
                name="downtimeHours"
                inputMode="numeric"
                defaultValue={v("downtimeHours")}
                placeholder="4"
                aria-invalid={Boolean(err("downtimeHours"))}
              />
            </Field>
          </div>

          <Field
            label="Issue"
            htmlFor="issue"
            error={err("issue")}
            className="sm:col-span-2"
          >
            <Textarea
              id="issue"
              name="issue"
              defaultValue={v("issue")}
              rows={2}
              placeholder="Reported symptom or reason for maintenance"
              aria-invalid={Boolean(err("issue"))}
            />
          </Field>

          <Field label="Diagnosis" htmlFor="diagnosis" error={err("diagnosis")}>
            <Textarea
              id="diagnosis"
              name="diagnosis"
              defaultValue={v("diagnosis")}
              rows={2}
              placeholder="Root cause identified"
              aria-invalid={Boolean(err("diagnosis"))}
            />
          </Field>

          <Field
            label="Action taken"
            htmlFor="actionTaken"
            error={err("actionTaken")}
          >
            <Textarea
              id="actionTaken"
              name="actionTaken"
              defaultValue={v("actionTaken")}
              rows={2}
              placeholder="Work performed"
              aria-invalid={Boolean(err("actionTaken"))}
            />
          </Field>

          <Field
            label="Parts replaced"
            htmlFor="partsReplaced"
            error={err("partsReplaced")}
          >
            <Input
              id="partsReplaced"
              name="partsReplaced"
              defaultValue={v("partsReplaced")}
              placeholder="e.g. Battery, fan"
              aria-invalid={Boolean(err("partsReplaced"))}
            />
          </Field>

          <Field label="Notes" htmlFor="notes" error={err("notes")}>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={v("notes")}
              rows={2}
              placeholder="Anything else worth recording"
              aria-invalid={Boolean(err("notes"))}
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !asset}>
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <SaveIcon />
          )}
          Create record
        </Button>
        <Button
          type="button"
          variant="ghost"
          render={<Link href={cancelHref} />}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
