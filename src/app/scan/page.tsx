import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { StatusBadge } from "@/components/assets/status-badge";
import { extractAssetTagFromScan } from "@/lib/asset-codes";
import { CONDITION_LABELS } from "@/lib/labels";
import { db } from "@/lib/db";
import type { AssetCondition } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Asset scan",
  robots: { index: false },
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const tag = extractAssetTagFromScan(first(sp.tag) ?? "");

  const asset = tag
    ? await db.asset.findUnique({
        where: { assetTag: tag },
        select: {
          assetTag: true,
          name: true,
          status: true,
          condition: true,
          archivedAt: true,
          createdAt: true,
          category: { select: { name: true } },
          location: { select: { name: true } },
          activeAssignment: {
            select: {
              employee: {
                select: {
                  fullName: true,
                  department: { select: { name: true } },
                },
              },
            },
          },
        },
      })
    : null;

  const conditionLabel =
    asset && asset.condition in CONDITION_LABELS
      ? CONDITION_LABELS[asset.condition as AssetCondition]
      : asset?.condition;

  return (
    <main className="bg-background flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Logo />
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
            Asset scan
          </p>
        </div>

        {asset ? (
          <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm">
            <div>
              <p className="text-muted-foreground font-mono text-sm">
                {asset.assetTag}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                {asset.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <StatusBadge status={asset.status} />
                {conditionLabel ? (
                  <span className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    Condition: {conditionLabel}
                  </span>
                ) : null}
                <span className="text-muted-foreground text-xs">
                  {asset.category.name}
                </span>
              </div>
            </div>

            {asset.activeAssignment ? (
              <div className="bg-muted/60 rounded-lg px-4 py-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Currently held by
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {asset.activeAssignment.employee.fullName}
                </p>
                <p className="text-muted-foreground text-sm">
                  {asset.activeAssignment.employee.department.name}
                </p>
              </div>
            ) : (
              <div className="bg-muted/60 text-muted-foreground rounded-lg px-4 py-3 text-sm">
                Not assigned — held in IT store
                {asset.location ? ` · ${asset.location.name}` : ""}
              </div>
            )}

            {asset.archivedAt ? (
              <p className="border-amber-400/50 bg-amber-400/10 text-amber-700 dark:text-amber-400 rounded-lg border px-4 py-2.5 text-sm">
                This asset has been archived and is no longer in active service.
              </p>
            ) : null}

            <dl className="divide-border border-border grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-0.5 font-medium">{asset.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="mt-0.5 font-medium">
                  {asset.location?.name ?? "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Registered</dt>
                <dd className="mt-0.5 font-medium">
                  {asset.createdAt.toISOString().slice(0, 10)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="border-border bg-card rounded-2xl border p-6 text-center shadow-sm">
            <p className="text-base font-semibold">Unknown code</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {tag
                ? `No registered asset matches “${tag}”.`
                : "Open this page by scanning an Avci asset QR label."}
            </p>
            <p className="text-muted-foreground mt-3 text-xs">
              If this device belongs to the airport, ask the IT Department to
              register it.
            </p>
          </div>
        )}

        <p className="text-muted-foreground text-center text-xs">
          Freetown International Airport · IT Department — internal asset
          register
        </p>
      </div>
    </main>
  );
}
