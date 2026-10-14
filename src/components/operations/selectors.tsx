"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CONDITION_LABELS } from "@/lib/labels";
import {
  searchAssignableEmployeesAction,
  searchCheckoutAssetsAction,
} from "@/server/actions/custody";
import type { searchAvailableAssets } from "@/server/queries/custody";
import type { searchEmployees } from "@/server/queries/employees";

export type AssetHit = Awaited<ReturnType<typeof searchAvailableAssets>>[number];
export type EmployeeHit = Awaited<
  ReturnType<typeof searchEmployees>
>[number];

const DEBOUNCE_MS = 250;

export function AssetPicker({
  value,
  onChange,
}: {
  value: AssetHit | null;
  onChange: (asset: AssetHit | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchCheckoutAssetsAction(trimmed);
        setResults(hits);
        setSearched(true);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  if (value) {
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
          <Badge variant="outline" className="mt-1.5">
            {CONDITION_LABELS[value.condition]}
          </Badge>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
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
          id="asset-search"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (!next.trim()) {
              setResults([]);
              setSearched(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              document.getElementById("asset-hit-0")?.focus();
            }
          }}
          placeholder="Search by tag, name, serial or model…"
          className="pl-9"
          aria-label="Search assets"
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
              id={`asset-hit-${index}`}
              type="button"
              onClick={() => onChange(hit)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  document.getElementById(`asset-hit-${index + 1}`)?.focus();
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (index === 0) document.getElementById("asset-search")?.focus();
                  else document.getElementById(`asset-hit-${index - 1}`)?.focus();
                }
              }}
              className="hover:bg-muted/60 focus-visible:bg-muted/60 rounded-md px-3 py-2 text-left focus-visible:outline-none"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {hit.assetTag}
              </span>
              <span className="ml-2 text-sm font-medium">{hit.name}</span>
              <span className="text-muted-foreground block text-xs">
                {hit.brand ?? ""} {hit.model ?? ""}
                {hit.serialNumber ? ` · S/N ${hit.serialNumber}` : ""}
              </span>
            </button>
          ))
        ) : searched ? (
          <p className="text-muted-foreground px-1 text-sm">
            No available asset found. Try another tag, serial or model.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Multi-select variant of AssetPicker — pick several available assets. */
export function AssetMultiPicker({
  value,
  onChange,
}: {
  value: AssetHit[];
  onChange: (assets: AssetHit[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);

  const selected = value;
  const selectedIds = new Set(selected.map((hit) => hit.id));

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchCheckoutAssetsAction(trimmed);
        setResults(hits);
        setSearched(true);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function toggle(hit: AssetHit) {
    if (selectedIds.has(hit.id)) {
      onChange(selected.filter((row) => row.id !== hit.id));
    } else {
      onChange([...selected, hit]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id="asset-search"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (!next.trim()) {
              setResults([]);
              setSearched(false);
            }
          }}
          placeholder="Search by tag, name, serial or model…"
          className="pl-9"
          aria-label="Search available assets"
        />
      </div>

      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        {pending ? (
          <p className="text-muted-foreground flex items-center gap-2 px-1 py-1.5 text-sm">
            <Loader2Icon className="size-3.5 animate-spin" /> Searching…
          </p>
        ) : results.length > 0 ? (
          results.map((hit) => {
            const checked = selectedIds.has(hit.id);
            return (
              <div
                key={hit.id}
                className={`hover:bg-muted/60 flex items-start gap-2.5 rounded-md px-3 py-2 ${
                  checked ? "bg-muted/60" : ""
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(hit)}
                  aria-label={`Select ${hit.assetTag}`}
                  className="mt-0.5"
                />
                <span
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => toggle(hit)}
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {hit.assetTag}
                  </span>
                  <span className="ml-2 text-sm font-medium">{hit.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    {[hit.brand, hit.model].filter(Boolean).join(" ")}
                    {hit.serialNumber ? ` · S/N ${hit.serialNumber}` : ""} ·{" "}
                    {hit.category.name}
                  </span>
                </span>
              </div>
            );
          })
        ) : searched ? (
          <p className="text-muted-foreground px-1 text-sm">
            No available asset found. Try another tag, serial or model.
          </p>
        ) : (
          <p className="text-muted-foreground px-1 text-sm">
            Search above to add devices — PC, laptop, printer, phone…
          </p>
        )}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium">
            {selected.length} device{selected.length === 1 ? "" : "s"} selected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((hit) => (
              <span
                key={hit.id}
                className="border-border bg-muted/50 inline-flex items-center gap-1.5 rounded-md border py-1 pr-1 pl-2.5 text-xs"
              >
                <span className="font-mono text-muted-foreground">
                  {hit.assetTag}
                </span>
                <span className="max-w-40 truncate">{hit.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange(selected.filter((row) => row.id !== hit.id))
                  }
                  className="hover:bg-muted rounded p-0.5"
                  aria-label={`Remove ${hit.assetTag}`}
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EmployeePicker({
  value,
  onChange,
  excludeId,
  inputId = "employee-search",
}: {
  value: EmployeeHit | null;
  onChange: (employee: EmployeeHit | null) => void;
  excludeId?: string;
  inputId?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeeHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchAssignableEmployeesAction(trimmed);
        setResults(
          excludeId ? hits.filter((hit) => hit.id !== excludeId) : hits
        );
        setSearched(true);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, excludeId]);

  if (value) {
    return (
      <div className="border-border flex items-start justify-between gap-3 rounded-md border p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{value.fullName}</p>
          <p className="text-muted-foreground text-xs">
            {value.fiaNumber ? `${value.fiaNumber} · ` : ""}
            {value.department.name}
            {value.position ? ` · ${value.position}` : ""}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
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
          id={inputId}
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (!next.trim()) {
              setResults([]);
              setSearched(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              document.getElementById(`${inputId}-hit-0`)?.focus();
            }
          }}
          placeholder="Search by name, FIA number or department…"
          className="pl-9"
          aria-label="Search employees"
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
              id={`${inputId}-hit-${index}`}
              type="button"
              onClick={() => onChange(hit)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  document
                    .getElementById(`${inputId}-hit-${index + 1}`)
                    ?.focus();
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (index === 0) document.getElementById(inputId)?.focus();
                  else
                    document
                      .getElementById(`${inputId}-hit-${index - 1}`)
                      ?.focus();
                }
              }}
              className="hover:bg-muted/60 focus-visible:bg-muted/60 rounded-md px-3 py-2 text-left focus-visible:outline-none"
            >
              <span className="text-sm font-medium">{hit.fullName}</span>
              <span className="text-muted-foreground block text-xs">
                {[hit.fiaNumber, hit.department.name, hit.position]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </button>
          ))
        ) : searched ? (
          <p className="text-muted-foreground px-1 text-sm">
            No employee found.
            <br />
            Try searching by name or FIA number.
          </p>
        ) : null}
      </div>
    </div>
  );
}
