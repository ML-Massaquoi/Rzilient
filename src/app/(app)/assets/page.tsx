import type { Metadata } from "next";
import Link from "next/link";
import { BoxesIcon, PlusIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getAssetFilterOptions, listAssets } from "@/server/queries/assets";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetListShell } from "@/components/assets/asset-list-shell";
import { ListPagination } from "@/components/assets/list-pagination";
import { SearchMiss } from "@/components/assets/search-miss";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "All Assets",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssetsPage({
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
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
    getAssetFilterOptions(),
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
            All Assets
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {result.total === 0
              ? "No assets registered yet"
              : `${result.total} registered asset${result.total === 1 ? "" : "s"}`}
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
            basePath="/assets"
            noun="assets"
          />
        </div>
      ) : q ? (
        <SearchMiss code={q} canWrite={canWrite} />
      ) : hasFilters ? (
        <EmptyState
          icon={BoxesIcon}
          title="No assets match these filters"
          description="Adjust the search or filters to widen the results."
        />
      ) : (
        <EmptyState
          icon={BoxesIcon}
          title="No assets registered yet"
          description={
            canWrite
              ? "Register the first asset manually, or run an inventory import to load existing records."
              : "Assets will appear here once they are registered by the IT team."
          }
        />
      )}
    </div>
  );
}
