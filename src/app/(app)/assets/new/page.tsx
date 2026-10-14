import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import { getFormOptions, getNextAssetTag } from "@/server/queries/assets";
import { AssetWizard } from "@/components/assets/asset-wizard";

export const metadata: Metadata = {
  title: "Register Asset",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireRole("ADMIN", "IT_STAFF");
  const sp = await searchParams;
  const initialSerial = first(sp.serialNumber)?.trim();
  const initialTag = first(sp.assetTag)?.trim();

  const [options, nextTag] = await Promise.all([
    getFormOptions(),
    getNextAssetTag(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/assets"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-3.5" />
          All assets
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Register asset
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Guided setup — a QR label and initial history entry are generated
            automatically.
          </p>
        </div>
      </div>

      <AssetWizard
        categories={options.categories.map((category) => ({
          id: category.id,
          name: category.name,
          requiresSerial: category.requiresSerial,
        }))}
        locations={options.locations}
        departments={options.departments}
        brands={options.brands}
        modelNames={options.modelNames}
        nextTag={nextTag}
        initialSerial={initialSerial}
        initialTag={initialTag}
      />
    </div>
  );
}
