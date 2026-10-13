import { z } from "zod";
import { AssetCondition } from "@/generated/prisma/enums";

/** Statuses that may be set through registration/edit forms.
 *  CHECKED_OUT is managed by workflows; RETIRED/DISPOSED only via governed actions. */
export const SUBMITTABLE_ASSET_STATUSES = [
  "AVAILABLE",
  "MAINTENANCE",
  "DAMAGED",
  "MISSING",
] as const;

export const ASSET_CONDITIONS = [
  "NEW",
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "DAMAGED",
  "MALFUNCTIONING",
] as const;

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const macAddress = (label: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/, `${label} must be a valid MAC address`)
      .optional()
  );

const isoDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .optional()
);

export const assetFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Asset name is required")
    .max(160, "Keep the name under 160 characters"),
  assetTag: z
    .string()
    .trim()
    .min(1, "Asset tag is required")
    .max(40, "Keep the tag under 40 characters")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9._/-]*$/,
      "Use letters, numbers, dots, dashes or slashes"
    ),
  categoryId: z.string().min(1, "Category is required"),
  serialNumber: optionalText(80),
  brand: optionalText(80),
  model: optionalText(80),
  description: optionalText(500),
  notes: optionalText(4000),
  status: z.string().min(1, "Status is required"),
  condition: z.enum(AssetCondition),
  locationId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  os: optionalText(80),
  fqdn: optionalText(120),
  ethernetMac: macAddress("Ethernet MAC"),
  wifiMac: macAddress("Wi-Fi MAC"),
  purchaseDate: isoDate,
  purchaseCost: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount")
      .optional()
  ),
  supplier: optionalText(120),
  warrantyEndsAt: isoDate,
});

export type AssetFormInput = z.input<typeof assetFormSchema>;

export function isSubmittableStatus(status: string): status is (typeof SUBMITTABLE_ASSET_STATUSES)[number] {
  return (SUBMITTABLE_ASSET_STATUSES as readonly string[]).includes(status);
}
