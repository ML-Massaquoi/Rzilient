"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { StatusBadge } from "@/components/assets/status-badge";
import type { AssetFormState } from "@/server/actions/assets";
import {
  SUBMITTABLE_ASSET_STATUSES,
} from "@/lib/validation/asset";
import {
  CONDITION_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import {
  AssetCondition,
  type AssetStatus,
} from "@/generated/prisma/enums";

export const emptyAssetFormState: AssetFormState = {
  ok: false,
  attempt: 0,
};

type Option = { id: string; name: string };

export type AssetDefaults = Partial<
  Record<
    | "name"
    | "assetTag"
    | "categoryId"
    | "serialNumber"
    | "brand"
    | "model"
    | "description"
    | "notes"
    | "status"
    | "condition"
    | "locationId"
    | "departmentId"
    | "os"
    | "fqdn"
    | "ethernetMac"
    | "wifiMac"
    | "purchaseDate"
    | "purchaseCost"
    | "supplier"
    | "warrantyEndsAt",
    string
  >
>;

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

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="sm:col-span-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  );
}

export function AssetForm({
  action,
  mode,
  assetId,
  categories,
  locations,
  departments,
  brands,
  modelNames,
  defaults,
  lockedStatus,
  cancelHref,
}: {
  action: (prev: AssetFormState, formData: FormData) => Promise<AssetFormState>;
  mode: "create" | "edit";
  assetId?: string;
  categories: Option[];
  locations: Option[];
  departments: Option[];
  brands: string[];
  modelNames: string[];
  defaults: AssetDefaults;
  /** When the asset status is managed by workflows (checked out/retired/disposed). */
  lockedStatus?: AssetStatus;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    emptyAssetFormState
  );

  const v = (key: keyof AssetDefaults): string =>
    state.values?.[key] ?? defaults[key] ?? "";
  const err = (key: string) => state.errors?.[key];
  const statusLocked = Boolean(lockedStatus);
  const currentStatus = (v("status") || lockedStatus || "AVAILABLE") as AssetStatus;

  return (
    <form
      key={state.attempt ?? 0}
      action={formAction}
      className="flex flex-col gap-6"
    >
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {mode === "edit" && assetId ? (
        <input type="hidden" name="id" value={assetId} />
      ) : null}

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionTitle
            title="Identification"
            description="How this asset is recognized in the register and on its label."
          />

          <Field label="Asset name" htmlFor="name" required error={err("name")}>
            <Input
              id="name"
              name="name"
              defaultValue={v("name")}
              placeholder="e.g. Dell Latitude 5420"
              aria-invalid={Boolean(err("name"))}
              aria-describedby={err("name") ? "name-error" : undefined}
            />
          </Field>

          <Field
            label="Asset tag"
            htmlFor="assetTag"
            required
            error={err("assetTag")}
            hint={
              mode === "create"
                ? "Pre-filled with the next tag in the FIA-IT-##### sequence."
                : undefined
            }
          >
            <Input
              id="assetTag"
              name="assetTag"
              defaultValue={v("assetTag")}
              placeholder="FIA-IT-00001"
              className="font-mono"
              aria-invalid={Boolean(err("assetTag"))}
              aria-describedby={err("assetTag") ? "assetTag-error" : undefined}
            />
          </Field>

          <Field label="Category" htmlFor="categoryId" required error={err("categoryId")}>
            <Select name="categoryId" defaultValue={v("categoryId")}>
              <SelectTrigger
                id="categoryId"
                className="w-full"
                aria-invalid={Boolean(err("categoryId"))}
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Serial number"
            htmlFor="serialNumber"
            error={err("serialNumber")}
            hint="Leave empty when the device has none."
          >
            <Input
              id="serialNumber"
              name="serialNumber"
              defaultValue={v("serialNumber")}
              placeholder="Manufacturer serial"
              className="font-mono"
              aria-invalid={Boolean(err("serialNumber"))}
              aria-describedby={
                err("serialNumber") ? "serialNumber-error" : undefined
              }
            />
          </Field>
        </div>
      </section>

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionTitle
            title="Classification"
            description="Status drives workflows; condition records physical state."
          />

          <Field
            label="Status"
            htmlFor="status"
            required
            error={err("status")}
            hint={
              statusLocked
                ? "Managed by check-out, maintenance and retirement workflows."
                : undefined
            }
          >
            {lockedStatus ? (
              <>
                <input type="hidden" name="status" value={lockedStatus} />
                <div className="border-border flex h-9 items-center rounded-md border px-3">
                  <StatusBadge status={lockedStatus} />
                </div>
              </>
            ) : (
              <Select name="status" defaultValue={currentStatus}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBMITTABLE_ASSET_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label="Condition" htmlFor="condition" required error={err("condition")}>
            <Select name="condition" defaultValue={v("condition") || "GOOD"}>
              <SelectTrigger id="condition" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AssetCondition).map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {CONDITION_LABELS[condition]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Location" htmlFor="locationId" error={err("locationId")}>
            <Select name="locationId" defaultValue={v("locationId")}>
              <SelectTrigger id="locationId" className="w-full">
                <SelectValue placeholder="No location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Department"
            htmlFor="departmentId"
            error={err("departmentId")}
            hint="Shared devices belong to a department even when unassigned"
          >
            <Select name="departmentId" defaultValue={v("departmentId")}>
              <SelectTrigger id="departmentId" className="w-full">
                <SelectValue placeholder="No department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionTitle
            title="Technical details"
            description="Hardware and network identifiers for support work."
          />

          <Field label="Brand" htmlFor="brand" error={err("brand")}>
            <Input id="brand" name="brand" list="asset-brand-options" defaultValue={v("brand")} placeholder="Dell" />
          </Field>

          <Field label="Model" htmlFor="model" error={err("model")}>
            <Input id="model" name="model" list="asset-model-options" defaultValue={v("model")} placeholder="Latitude 5420" />
          </Field>

          <datalist id="asset-brand-options">
            {brands.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
          <datalist id="asset-model-options">
            {modelNames.map((modelName) => (
              <option key={modelName} value={modelName} />
            ))}
          </datalist>

          <Field label="Operating system" htmlFor="os" error={err("os")}>
            <Input id="os" name="os" defaultValue={v("os")} placeholder="Windows 11 Pro" />
          </Field>

          <Field label="Hostname (FQDN)" htmlFor="fqdn" error={err("fqdn")}>
            <Input
              id="fqdn"
              name="fqdn"
              defaultValue={v("fqdn")}
              placeholder="FQDN or computer name"
              className="font-mono"
            />
          </Field>

          <Field label="Ethernet MAC" htmlFor="ethernetMac" error={err("ethernetMac")}>
            <Input
              id="ethernetMac"
              name="ethernetMac"
              defaultValue={v("ethernetMac")}
              placeholder="00:1A:2B:3C:4D:5E"
              className="font-mono"
              aria-invalid={Boolean(err("ethernetMac"))}
            />
          </Field>

          <Field label="Wi-Fi MAC" htmlFor="wifiMac" error={err("wifiMac")}>
            <Input
              id="wifiMac"
              name="wifiMac"
              defaultValue={v("wifiMac")}
              placeholder="00:1A:2B:3C:4D:5F"
              className="font-mono"
              aria-invalid={Boolean(err("wifiMac"))}
            />
          </Field>
        </div>
      </section>

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionTitle
            title="Purchase & warranty"
            description="Commercial details where available."
          />

          <Field label="Purchase date" htmlFor="purchaseDate" error={err("purchaseDate")}>
            <Input
              id="purchaseDate"
              name="purchaseDate"
              type="date"
              defaultValue={v("purchaseDate")}
            />
          </Field>

          <Field label="Purchase cost" htmlFor="purchaseCost" error={err("purchaseCost")}>
            <Input
              id="purchaseCost"
              name="purchaseCost"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={v("purchaseCost")}
              placeholder="0.00"
              aria-invalid={Boolean(err("purchaseCost"))}
            />
          </Field>

          <Field label="Supplier" htmlFor="supplier" error={err("supplier")}>
            <Input id="supplier" name="supplier" defaultValue={v("supplier")} />
          </Field>

          <Field
            label="Warranty ends"
            htmlFor="warrantyEndsAt"
            error={err("warrantyEndsAt")}
          >
            <Input
              id="warrantyEndsAt"
              name="warrantyEndsAt"
              type="date"
              defaultValue={v("warrantyEndsAt")}
            />
          </Field>
        </div>
      </section>

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4">
          <SectionTitle
            title="Description & notes"
            description="Free text for anything operators should know."
          />

          <Field label="Description" htmlFor="description" error={err("description")}>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={v("description")}
            />
          </Field>

          <Field label="Notes" htmlFor="notes" error={err("notes")}>
            <Textarea id="notes" name="notes" rows={3} defaultValue={v("notes")} />
          </Field>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          render={<Link href={cancelHref} />}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2Icon className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <SaveIcon />
              {mode === "create" ? "Register asset" : "Save changes"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
