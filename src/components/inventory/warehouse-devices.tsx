"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRightIcon,
  Loader2Icon,
  SearchIcon,
  SendIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/assets/status-badge";
import { AssetStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/labels";
import {
  moveAssetsToWarehouse,
  type MoveFormState,
} from "@/server/actions/warehouses";
import type { WarehouseAssetListItem } from "@/server/queries/warehouses";

const emptyState: MoveFormState = { ok: false, attempt: 0 };

export function WarehouseDevices({
  warehouseId,
  warehouses,
  items,
  canWrite,
  dq = "",
  status = "",
}: {
  warehouseId: string;
  warehouses: { id: string; name: string }[];
  items: WarehouseAssetListItem[];
  canWrite: boolean;
  dq?: string;
  status?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const destinations = warehouses.filter((row) => row.id !== warehouseId);

  const allIds = useMemo(() => items.map((item) => item.id), [items]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.includes(id));

  function toggle(id: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((row) => row !== id)
    );
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? allIds : []);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          method="get"
          action={`/inventory/warehouses/${warehouseId}`}
          className="flex flex-wrap items-center gap-2"
        >
          <Input
            name="dq"
            defaultValue={dq}
            placeholder="Search tag, name, serial, brand…"
            className="h-9 w-64"
            aria-label="Search devices in this warehouse"
          />
          <Select name="status" defaultValue={status || "__all__"}>
            <SelectTrigger className="h-9 w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {Object.values(AssetStatus).map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="sm" className="h-9">
            <SearchIcon />
            Search
          </Button>
        </form>

        {canWrite ? (
          <div className="flex items-center gap-3">
            {selected.length > 0 ? (
              <span className="text-muted-foreground text-sm tabular-nums">
                {selected.length} selected
              </span>
            ) : null}
            <MoveDialog
              warehouseId={warehouseId}
              destinations={destinations}
              assetIds={selected}
              disabled={selected.length === 0}
            />
          </div>
        ) : null}
      </div>

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              {canWrite ? (
                <th className="w-10 px-3 py-2.5 text-left">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      toggleAll(checked === true)
                    }
                    aria-label="Select all devices on this page"
                    disabled={items.length === 0}
                  />
                </th>
              ) : null}
              <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                Device
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                Brand / model
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                Serial number
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                Status
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                Custodian
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                Category
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const photo = item.attachments[0];
              return (
                <tr
                  key={item.id}
                  className="border-border/70 border-b last:border-b-0"
                >
                  {canWrite ? (
                    <td className="px-3 py-2.5 align-top">
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onCheckedChange={(checked) =>
                          toggle(item.id, checked === true)
                        }
                        aria-label={`Select ${item.assetTag}`}
                      />
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-center gap-2.5">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/${photo.id}`}
                          alt=""
                          className="border-border size-8 shrink-0 rounded-md border object-cover"
                        />
                      ) : (
                        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-medium">
                          {item.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>
                        <Link
                          href={`/assets/${item.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.name}
                        </Link>
                        <span className="text-muted-foreground block text-xs font-mono">
                          {item.assetTag}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 align-top whitespace-nowrap">
                    {[item.brand, item.model].filter(Boolean).join(" · ") ||
                      "—"}
                  </td>
                  <td className="px-3 py-2.5 align-top font-mono text-xs whitespace-nowrap">
                    {item.serialNumber || "—"}
                  </td>
                  <td className="px-3 py-2.5 align-top whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 align-top whitespace-nowrap">
                    {item.activeAssignment?.employee.fullName ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 align-top whitespace-nowrap">
                    {item.category.name}
                    {item.parentId ? (
                      <span className="text-muted-foreground block text-xs">
                        Component
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={canWrite ? 7 : 6}
                  className="text-muted-foreground px-3 py-8 text-center"
                >
                  No devices match this warehouse and filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MoveDialog({
  warehouseId,
  destinations,
  assetIds,
  disabled,
}: {
  warehouseId: string;
  destinations: { id: string; name: string }[];
  assetIds: string[];
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    moveAssetsToWarehouse,
    emptyState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-9" disabled={disabled}>
            <ArrowLeftRightIcon />
            Transfer to warehouse
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer between warehouses</DialogTitle>
          <DialogDescription>
            Move {assetIds.length} device{assetIds.length === 1 ? "" : "s"}{" "}
            from this warehouse to another one. The move is recorded in each
            device&apos;s history.
          </DialogDescription>
        </DialogHeader>

        <form
          key={state.attempt ?? 0}
          action={formAction}
          className="flex flex-col gap-4"
        >
          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to transfer</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <input type="hidden" name="fromWarehouseId" value={warehouseId} />
          {assetIds.map((id) => (
            <input key={id} type="hidden" name="assetIds" value={id} />
          ))}

          <div>
            <Label htmlFor="toLocationId" className="mb-1.5 block text-sm">
              Destination warehouse
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select name="toLocationId">
              <SelectTrigger id="toLocationId" aria-label="Destination warehouse">
                <SelectValue placeholder="Choose a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="move-notes" className="mb-1.5 block text-sm">
              Notes
            </Label>
            <Textarea
              id="move-notes"
              name="notes"
              rows={2}
              placeholder="Optional reason for the move"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              Transfer {assetIds.length} device
              {assetIds.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
