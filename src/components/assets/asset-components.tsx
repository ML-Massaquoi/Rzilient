"use client";

import { useEffect, useState, useActionState, useTransition } from "react";
import Link from "next/link";
import {
  BoxesIcon,
  Link2Icon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  UnlinkIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/assets/status-badge";
import {
  assignComponent,
  removeComponent,
  searchComponentAssetsAction,
  type ComponentFormState,
} from "@/server/actions/components";
import type { AssetDetail } from "@/server/queries/assets";

const emptyState: ComponentFormState = { ok: false, attempt: 0 };
const DEBOUNCE_MS = 250;

type ComponentHit = Awaited<
  ReturnType<typeof searchComponentAssetsAction>
>[number];

export function AssetComponents({
  asset,
  canWrite,
}: {
  asset: AssetDetail;
  canWrite: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Components</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Parts assigned to this device — batteries for a radio, an SSD in a
            laptop, toner in a printer. Each component keeps its own serial
            number and record.
          </p>
        </div>
        {canWrite ? (
          <AddComponentDialog parentAssetId={asset.id} parentTag={asset.assetTag} />
        ) : null}
      </div>

      {asset.children.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {asset.children.map((child) => {
            const photo = child.attachments[0];
            const brandModel = [child.brand, child.model]
              .filter(Boolean)
              .join(" · ");
            return (
              <div
                key={child.id}
                className="bg-card flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/${photo.id}`}
                      alt=""
                      className="border-border size-12 shrink-0 rounded-md border object-cover"
                    />
                  ) : (
                    <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-md">
                      <BoxesIcon className="size-5" />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/assets/${child.id}`}
                        className="rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {child.name}
                      </Link>
                      <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                        {child.assetTag}
                        {child.serialNumber ? ` · ${child.serialNumber}` : ""}
                      </p>
                      {brandModel ? (
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {brandModel}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={child.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-2">
                  <Badge variant="outline" className="text-xs">
                    {child.category.name}
                  </Badge>
                  {canWrite ? (
                    <ConfirmDialog
                      title="Detach component?"
                      description={`${child.assetTag} · ${child.name} will no longer be listed as a component of ${asset.assetTag}. The device itself is not changed.`}
                      confirmLabel="Detach"
                      destructive
                      onConfirm={() => {
                        const formData = new FormData();
                        formData.append("componentAssetId", child.id);
                        void removeComponent(formData);
                      }}
                    >
                      {({ onClick }) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onClick}
                          aria-label={`Detach ${child.assetTag}`}
                        >
                          <UnlinkIcon />
                          Detach
                        </Button>
                      )}
                    </ConfirmDialog>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BoxesIcon}
          title="No components assigned"
          description={
            canWrite
              ? "Attach parts and accessories (batteries, SSDs, toner…) so their serial numbers stay linked to this device."
              : "Components assigned by the IT team will appear here."
          }
        />
      )}
    </div>
  );
}

function AddComponentDialog({
  parentAssetId,
  parentTag,
}: {
  parentAssetId: string;
  parentTag: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ComponentHit[]>([]);
  const [searching, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<ComponentHit | null>(null);
  const [state, formAction, pending] = useActionState(
    assignComponent,
    emptyState
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchComponentAssetsAction(trimmed, parentAssetId);
        setResults(hits);
        setSearched(true);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, parentAssetId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setResults([]);
          setSearched(false);
          setSelected(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <PlusIcon />
            Add component
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a component</DialogTitle>
          <DialogDescription>
            Attach a device to {parentTag} — search by tag, name, brand, model
            or serial number to avoid picking the wrong unit.
          </DialogDescription>
        </DialogHeader>

        <form
          key={state.attempt ?? 0}
          action={formAction}
          className="flex flex-col gap-4"
        >
          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to attach</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <input
            type="hidden"
            name="parentAssetId"
            value={parentAssetId}
          />
          <input
            type="hidden"
            name="componentAssetId"
            value={selected?.id ?? ""}
          />

          {selected ? (
            <div className="border-border flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="font-mono text-sm text-muted-foreground">
                  {selected.assetTag}
                </p>
                <p className="truncate text-sm font-medium">
                  {selected.name}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {[selected.brand, selected.model]
                    .filter(Boolean)
                    .join(" · ") || selected.category.name}
                  {selected.serialNumber
                    ? ` · S/N ${selected.serialNumber}`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelected(null)}
              >
                <XIcon />
                Change
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => {
                    const value = e.target.value;
                    setQuery(value);
                    if (!value.trim()) {
                      setResults([]);
                      setSearched(false);
                    }
                  }}
                  placeholder="Search tag, name, serial, brand…"
                  className="pl-9"
                  aria-label="Search component assets"
                />
              </div>
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {searching ? (
                  <p className="text-muted-foreground flex items-center gap-2 px-1 py-1.5 text-sm">
                    <Loader2Icon className="size-3.5 animate-spin" />{" "}
                    Searching…
                  </p>
                ) : results.length > 0 ? (
                  results.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => setSelected(hit)}
                      className="hover:bg-muted/60 rounded-md px-3 py-2 text-left"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {hit.assetTag}
                      </span>
                      <span className="ml-2 text-sm font-medium">
                        {hit.name}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {[hit.brand, hit.model].filter(Boolean).join(" ")}
                        {hit.serialNumber ? ` · S/N ${hit.serialNumber}` : ""}{" "}
                        · {hit.category.name}
                      </span>
                    </button>
                  ))
                ) : searched ? (
                  <p className="text-muted-foreground px-1 text-sm">
                    No matching device found (already attached devices are
                    hidden).
                  </p>
                ) : (
                  <p className="text-muted-foreground px-1 text-sm">
                    Type at least 2 characters to search.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!selected || pending}>
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <Link2Icon />
              )}
              Attach component
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
