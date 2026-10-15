import type { Metadata } from "next";
import { ClipboardCheckIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import { getCheckoutAsset } from "@/server/queries/custody";
import { CheckoutWizard } from "@/components/operations/checkout-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Check Out",
};

export default async function CheckOutPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>;
}) {
  await requireRole("ADMIN", "IT_STAFF");
  const { asset: assetId } = await searchParams;
  const asset = assetId ? await getCheckoutAsset(assetId) : null;
  const assetError =
    assetId && !asset
      ? "That asset is not available for check-out. It may already be assigned or no longer exist."
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        icon={ClipboardCheckIcon}
        iconClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        title="Check Out"
        subtitle="Assign an asset to an employee — condition, accessories and expected return are captured in one focused flow."
      />

      <div className="text-primary flex items-center gap-2 text-sm font-medium">
        <ClipboardCheckIcon className="size-4" />
        One active assignment per asset is enforced by the database.
      </div>

      {assetError ? (
        <Alert variant="destructive">
          <AlertTitle>Asset unavailable</AlertTitle>
          <AlertDescription>{assetError}</AlertDescription>
        </Alert>
      ) : null}

      <CheckoutWizard initialAsset={asset} />
    </div>
  );
}
