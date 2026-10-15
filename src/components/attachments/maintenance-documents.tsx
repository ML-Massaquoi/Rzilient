"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PaperclipIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhotoGallery } from "@/components/attachments/photo-gallery";

export function MaintenanceDocuments({
  recordId,
  recordTitle,
  assetMeta,
  documents,
  canWrite,
  returnUrl,
  triggerOnly = false,
}: {
  recordId: string;
  recordTitle: string;
  assetMeta?: {
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
  } | null;
  documents: { id: string; filename: string; kind?: string | null }[];
  canWrite: boolean;
  returnUrl: string;
  /** Compact paperclip button for table rows / record cards. */
  triggerOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const identity = assetMeta
    ? [assetMeta.brand, assetMeta.model].filter(Boolean).join(" ")
    : "";
  const serial = assetMeta?.serialNumber;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            title={`Documents (${documents.length})`}
            className={
              triggerOnly
                ? "text-muted-foreground hover:text-foreground inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                : undefined
            }
          >
            <PaperclipIcon className="size-3.5" />
            <span className="tabular-nums">{documents.length}</span>
          </button>
        }
      />
      <DialogContent className="top-[8%] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogHeader className="border-border border-b px-5 py-4 text-left">
          <DialogTitle>{recordTitle}</DialogTitle>
          <DialogDescription>
            Scanned papers and photos for this maintenance record — keep the
            brand, model and serial number on file.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto p-5">
          {assetMeta ? (
            <div className="bg-primary/5 border-primary/10 mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs">
              <span className="text-muted-foreground">Asset</span>
              {identity ? (
                <span className="font-medium">{identity}</span>
              ) : null}
              {serial ? (
                <span className="border-border rounded border bg-background px-1.5 py-0.5 font-mono">
                  SN: {serial}
                </span>
              ) : null}
            </div>
          ) : null}
          <PhotoGallery
            entity="maintenance"
            entityId={recordId}
            photos={documents}
            canWrite={canWrite}
            returnUrl={returnUrl}
            subject="maintenance record"
            noRedirect
            onUploaded={refresh}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
