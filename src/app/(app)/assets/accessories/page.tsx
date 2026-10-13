import type { Metadata } from "next";
import Link from "next/link";
import { CableIcon, PackageIcon, PlusIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getAssetFilterOptions, listAssets } from "@/server/queries/assets";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetListShell } from "@/components/assets/asset-list-shell";
import { ListPagination } from "@/components/assets/list-pagination";
import { SearchMiss } from "@/components/assets/search-miss";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Accessories",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccessoriesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const q = first(sp.q);
  const status = first(sp.status);
  const category = first(sp.category);
  const condition = first(sp.condition);
  const pageParam = Number(first(sp.page) ?? "1");

  const [result, categories] = await Promise.all([
    listAssets({
      q,
      status,
      category,
      condition,
      kind: "accessory",
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
    getAssetFilterOptions("accessory"),
  ]);

  const canWrite = user.role !== "VIEWER";
  const hasFilters = Boolean(q || status || category || condition);

  const activeParams = new URLSearchParams();
  if (q) activeParams.set("q", q);
  if (status) activeParams.set("status", status);
  if (category) activeParams.set("category", category);
  if (condition) activeParams.set("condition", condition);
  const search = activeParams.toString();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Accessories
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {result.total === 0
              ? "No accessory assets registered"
              : `${result.total} accessor${result.total === 1 ? "y" : "ies"} registered`}
            {hasFilters ? " matching the current filters" : ""}
          </p>
        </div>
        {canWrite ? (
          <Button render={<Link href="/assets/new" />}>
            <PlusIcon />
            New asset
          </Button>
        ) : null}
      </div>

      <AssetFilters categories={categories} />

      {result.items.length > 0 ? (
        <div className="flex flex-col gap-4">
          <AssetListShell items={result.items} canWrite={canWrite} />
          <ListPagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            search={search}
            basePath="/assets/accessories"
            noun="accessories"
          />
        </div>
      ) : q ? (
        <SearchMiss code={q} canWrite={canWrite} />
      ) : hasFilters ? (
        <EmptyState
          icon={CableIcon}
          title="No accessories match these filters"
          description="Adjust the search or filters to widen the results."
        />
      ) : (
        <EmptyState
          icon={PackageIcon}
          title="No accessory assets registered"
          description="Serialized accessories (storage devices, IT tools) appear here. Bulk consumables like cables and mice are tracked by quantity under Inventory → Stock."
        />
      )}
    </div>
  );
}
