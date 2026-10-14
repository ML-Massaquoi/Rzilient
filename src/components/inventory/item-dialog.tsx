"use client";

import { useActionState, useState } from "react";
import { Loader2Icon, PencilIcon, PlusIcon, SaveIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createInventoryItem,
  updateInventoryItem,
  type InventoryFormState,
} from "@/server/actions/inventory";
import type { InventoryListItem } from "@/server/queries/inventory";
import { NO_LOCATION } from "@/lib/validation/inventory";

const emptyState: InventoryFormState = { ok: false, attempt: 0 };

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string[];
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-sm">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {children}
      {error?.length ? (
        <p id={`${htmlFor}-error`} className="text-destructive mt-1.5 text-xs">
          {error[0]}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function ItemDialog({
  mode,
  item,
  categories,
  locations,
  defaultLocationId,
}: {
  mode: "create" | "edit";
  item?: InventoryListItem;
  categories: string[];
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
}) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createInventoryItem : updateInventoryItem;
  const [state, formAction, pending] = useActionState(action, emptyState);

  const err = (key: string) => state.errors?.[key];
  const v = (key: string) =>
    state.values?.[key] ?? String(item?.[key as keyof InventoryListItem] ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={mode === "create" ? "default" : "ghost"} size="sm">
            {mode === "create" ? <PlusIcon /> : <PencilIcon />}
            {mode === "create" ? "New item" : "Edit"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New stock item" : "Edit stock item"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Quantity-based items (cables, connectors, peripherals) live here — never as individual assets."
              : "Update the item details. Quantity changes must be recorded as stock movements."}
          </DialogDescription>
        </DialogHeader>

        <form
          key={state.attempt ?? 0}
          action={formAction}
          className="flex flex-col gap-4"
        >
          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {mode === "edit" && item ? (
            <input type="hidden" name="id" value={item.id} />
          ) : null}

          <Field label="Item name" htmlFor="name" required error={err("name")}>
            <Input
              id="name"
              name="name"
              defaultValue={v("name")}
              placeholder="e.g. Cat6 Ethernet Cable"
              aria-invalid={Boolean(err("name"))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" htmlFor="sku" required error={err("sku")}>
              <Input
                id="sku"
                name="sku"
                defaultValue={v("sku")}
                placeholder="CAB-CAT6"
                className="font-mono"
                aria-invalid={Boolean(err("sku"))}
              />
            </Field>

            <Field label="Unit" htmlFor="unit" required error={err("unit")}>
              <Input
                id="unit"
                name="unit"
                defaultValue={v("unit") || "pcs"}
                placeholder="pcs / m / roll"
                aria-invalid={Boolean(err("unit"))}
              />
            </Field>

            <Field label="Category" htmlFor="category" error={err("category")}>
              <Input
                id="category"
                name="category"
                list="stock-category-options"
                defaultValue={v("category")}
                placeholder="e.g. Cable"
                aria-invalid={Boolean(err("category"))}
              />
              <datalist id="stock-category-options">
                {categories.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </Field>

            <Field
              label="Location"
              htmlFor="locationId"
              error={err("locationId")}
            >
              <Select
                name="locationId"
                defaultValue={
                  state.values?.locationId ??
                  item?.locationId ??
                  defaultLocationId ??
                  NO_LOCATION
                }
              >
                <SelectTrigger id="locationId" aria-label="Location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LOCATION}>No location</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Minimum stock"
              htmlFor="minimumStock"
              error={err("minimumStock")}
              hint="Low-stock alerts trigger below this"
            >
              <Input
                id="minimumStock"
                name="minimumStock"
                inputMode="numeric"
                defaultValue={v("minimumStock")}
                placeholder="20"
                aria-invalid={Boolean(err("minimumStock"))}
              />
            </Field>

            <Field
              label="Reorder level"
              htmlFor="reorderLevel"
              error={err("reorderLevel")}
              hint="Optional"
            >
              <Input
                id="reorderLevel"
                name="reorderLevel"
                inputMode="numeric"
                defaultValue={v("reorderLevel")}
                placeholder="10"
                aria-invalid={Boolean(err("reorderLevel"))}
              />
            </Field>
          </div>

          <Field label="Notes" htmlFor="notes" error={err("notes")}>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={v("notes")}
              placeholder="Supplier, storage shelf, anything useful"
              aria-invalid={Boolean(err("notes"))}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {mode === "create" ? "Create item" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
