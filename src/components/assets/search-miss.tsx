import Link from "next/link";
import { PlusIcon, ScanLineIcon } from "lucide-react";
import { registerHrefForCode } from "@/lib/asset-codes";
import { Button } from "@/components/ui/button";

/** Shown when a search (often a barcode scan) matches no assets — offers to
 *  register the device on the spot instead of a dead-end empty state. */
export function SearchMiss({
  code,
  canWrite,
}: {
  code: string;
  canWrite: boolean;
}) {
  return (
    <div className="border-amber-400/50 bg-card rounded-lg border p-6 sm:p-8">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <div className="bg-amber-400/15 text-amber-600 grid size-11 place-items-center rounded-full dark:text-amber-400">
          <ScanLineIcon className="size-5" />
        </div>
        <div>
          <p className="text-base font-semibold">Not in the register</p>
          <p className="text-muted-foreground mt-1 text-sm">
            No asset matches{" "}
            <span className="text-foreground font-mono font-medium">{code}</span>
            . If you just scanned this device, log it now.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {canWrite ? (
            <Button render={<Link href={registerHrefForCode(code)} />}>
              <PlusIcon />
              Register this device
            </Button>
          ) : null}
          <Button variant="outline" render={<Link href="/scanner" />}>
            <ScanLineIcon />
            Open scan box
          </Button>
          <Button variant="ghost" render={<Link href="/assets" />}>
            Clear search
          </Button>
        </div>
      </div>
    </div>
  );
}
