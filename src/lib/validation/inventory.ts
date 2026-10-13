import { z } from "zod";
import { StockTransactionType } from "@/generated/prisma/enums";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

/** Select sentinel for "no location" (Base UI Select needs non-empty values). */
export const NO_LOCATION = "__none__";

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalCount = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number")
    .optional()
);

export const itemFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Item name is required")
    .max(160, "Keep the name under 160 characters"),
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required")
    .max(80, "Keep the SKU under 80 characters")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9._/-]*$/,
      "Use letters, numbers, dots, dashes or slashes"
    ),
  category: optionalText(80),
  unit: z
    .string()
    .trim()
    .min(1, "Unit is required")
    .max(20, "Keep the unit under 20 characters"),
  minimumStock: optionalCount,
  reorderLevel: optionalCount,
  locationId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  notes: optionalText(2000),
});

/** Quantity is the number of units affected; the type decides the direction.
 *  ADJUSTED takes a signed delta (+5 / -3). */
export const stockTxFormSchema = z.object({
  itemId: z.string().min(1, "Select an item"),
  type: z.enum(StockTransactionType),
  quantity: z
    .string()
    .trim()
    .regex(/^-?\d+$/, "Enter a whole number")
    .refine((value) => Number(value) !== 0, "Quantity cannot be zero"),
  reference: optionalText(120),
  notes: optionalText(2000),
});

export type ItemFormInput = z.input<typeof itemFormSchema>;
export type StockTxFormInput = z.input<typeof stockTxFormSchema>;
