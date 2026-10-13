"use client";

import { useSyncExternalStore, useMemo, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LayoutGridIcon,
  ListIcon,
} from "lucide-react";
import { AssetList } from "@/components/assets/asset-list";
import { AssetCardGrid } from "@/components/assets/asset-card-grid";
import { cn } from "cn";
import type { AssetListItem } from "@/server/queries/assets";

const STORAGE_KEY = "rzilient:asset-view";

type ViewMode = "list" | "grid";
type SortKey =
  | "name"
  | "assetTag"
  | "status"
  | "category"
  | "custodian"
  | "registered";

const SORT_CHIPS: { key: SortKey; label: string }[] = [
  { key: "registered", label: "Registered" },
  { key: "name", label: "Name" },
  { key: "status", label: "Status" },
  { key: "category", label: "Category" },
  { key: "custodian", label: "Custodian" },
];

const NO_VALUE = "zzzzzz";

function sortValue(asset: AssetListItem, key: SortKey): string {
  switch (key) {
    case "name":
      return asset.name.toLowerCase();
    case "assetTag":
      return asset.assetTag.toLowerCase();
    case "status":
      return asset.status;
    case "category":
      return asset.category.name.toLowerCase();
    case "custodian":
      return (
        asset.activeAssignment?.employee.fullName.toLowerCase() ?? NO_VALUE
      );
    case "registered":
      return String(asset.createdAt.getTime());
  }
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ViewMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

function getServerSnapshot(): ViewMode {
  return "list";
}

function persistView(next: ViewMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // private mode — view preference just won't persist
  }
  for (const listener of listeners) listener();
}

export function AssetListShell({
  items,
  canWrite,
}: {
  items: AssetListItem[];
  canWrite: boolean;
}) {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "registered",
    dir: "desc",
  });

  const sorted = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...items].sort(
      (a, b) =>
        sortValue(a, sort.key).localeCompare(sortValue(b, sort.key)) * factor
    );
  }, [items, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "registered" ? "desc" : "asc" }
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-muted-foreground text-xs font-medium">
          {items.length} {items.length === 1 ? "asset" : "assets"}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Sort assets"
            className="bg-muted/60 inline-flex flex-wrap items-center gap-0.5 rounded-lg border p-0.5"
          >
            {SORT_CHIPS.map((chip) => {
              const active = sort.key === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSort(chip.key)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {chip.label}
                  {active ? (
                    sort.dir === "asc" ? (
                      <ArrowUpIcon className="size-3 text-primary" />
                    ) : (
                      <ArrowDownIcon className="size-3 text-primary" />
                    )
                  ) : null}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Change layout"
            className="bg-muted/60 inline-flex items-center gap-0.5 rounded-lg border p-0.5"
          >
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => persistView("list")}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListIcon className="size-3.5" />
              List
            </button>
            <button
              type="button"
              aria-label="Card grid view"
              aria-pressed={view === "grid"}
              onClick={() => persistView("grid")}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                view === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGridIcon className="size-3.5" />
              Cards
            </button>
          </div>
        </div>
      </div>

      {view === "grid" ? (
        <AssetCardGrid items={sorted} />
      ) : (
        <AssetList items={sorted} canWrite={canWrite} />
      )}
    </div>
  );
}
