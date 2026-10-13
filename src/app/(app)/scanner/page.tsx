import type { Metadata } from "next";
import { requireUser } from "@/server/auth";
import { ScannerView } from "@/components/scanner/scanner-view";

export const metadata: Metadata = {
  title: "QR Scanner",
};

export default async function ScannerPage() {
  const user = await requireUser();
  const canWrite = user.role !== "VIEWER";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          QR Scanner
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          One scan box for barcodes and QR labels — scan or type an asset tag
          or serial number and it searches automatically. Unknown codes can be
          registered right away.
        </p>
      </div>
      <ScannerView canWrite={canWrite} />
    </div>
  );
}
