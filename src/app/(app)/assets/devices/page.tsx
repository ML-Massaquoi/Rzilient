import type { Metadata } from "next";
import Link from "next/link";
import { LaptopIcon, PlusIcon, SmartphoneIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import {
  getAssetFilterOptions,
  getBrandModelOptions,
  listAssets,
} from "@/server/queries/assets";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetListShell } from "@/components/assets/asset-list-shell";
import { ListPagination } from "@/components/assets/list-pagination";
import { SearchMiss } from "@/components/assets/search-miss";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Devices",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DevicesPage({
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
  const brand = first(sp.brand);
  const model = first(sp.model);
  const pageParam = Number(first(sp.page) ?? "1");

  const [result, categories, facets] = await Promise.all([
    listAssets({
      q,
      status,
      category,
      condition,
      brand,
      model,
      kind: "device",
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
    getAssetFilterOptions("device"),
    getBrandModelOptions({ kind: "device", category, brand }),
  ]);

  const canWrite = user.role !== "VIEWER";
  const hasFilters = Boolean(
    q || status || category || condition || brand || model
  );

  const activeParams = new URLSearchParams();
  if (q) activeParams.set("q", q);
  if (status) activeParams.set("status", status);
  if (category) activeParams.set("category", category);
  if (condition) activeParams.set("condition", condition);
  if (brand) activeParams.set("brand", brand);
  if (model) activeParams.set("model", model);
  const search = activeParams.toString();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        icon={LaptopIcon}
        iconClassName="bg-sky-500/15 text-sky-600 dark:text-sky-400"
        title="Devices"
        subtitle={
          result.total === 0
            ? "No devices registered yet"
            : `${result.total} device${result.total === 1 ? "" : "s"} registered${
                hasFilters ? " matching the current filters" : ""
              }`
        }
        chips={[
          { label: "Devices", value: result.total, icon: LaptopIcon },
          {
            label: "Categories",
            value: categories.length,
            icon: SmartphoneIcon,
          },
        ]}
        actions={
          canWrite ? (
            <Button render={<Link href="/assets/new" />}>
              <PlusIcon />
              New asset
            </Button>
          ) : null
        }
      />

      <AssetFilters
        categories={categories}
        brands={facets.brands.map((b) => b.value)}
        models={facets.models.map((m) => m.value)}
      />

      {result.items.length > 0 ? (
        <div className="flex flex-col gap-4">
          <AssetListShell items={result.items} canWrite={canWrite} />
          <ListPagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            search={search}
            basePath="/assets/devices"
            noun="devices"
          />
        </div>
      ) : q ? (
        <SearchMiss code={q} canWrite={canWrite} />
      ) : hasFilters ? (
        <EmptyState
          icon={LaptopIcon}
          title="No devices match these filters"
          description="Adjust the search or filters to widen the results."
        />
      ) : (
        <EmptyState
          icon={LaptopIcon}
          title="No devices registered yet"
          description={
            canWrite
              ? "Register the first device manually, or run an inventory import to load existing records."
              : "Devices will appear here once they are registered by the IT team."
          }
        />
      )}
    </div>
  );
}
