import { z } from "zod";
import { ASSET_CONDITIONS } from "./asset";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const isoDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .optional()
);

export const checkoutSchema = z.object({
  assetId: z.string().min(1, "Select an asset to check out"),
  employeeId: z.string().min(1, "Select an employee"),
  condition: z.enum(ASSET_CONDITIONS),
  expectedReturnAt: isoDate,
  notes: optionalText(2000),
});

export const returnSchema = z.object({
  assignmentId: z.string().min(1, "Select an assignment"),
  condition: z.enum(ASSET_CONDITIONS),
  damageNotes: optionalText(1000),
  notes: optionalText(2000),
});

export const transferSchema = z.object({
  assignmentId: z.string().min(1, "Select an assignment"),
  toEmployeeId: z.string().min(1, "Select the employee receiving the asset"),
  reason: optionalText(200),
  notes: optionalText(2000),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type ReturnInput = z.input<typeof returnSchema>;
export type TransferInput = z.input<typeof transferSchema>;

/** Status transitions implied by the return condition (§21). */
export function statusAfterReturn(
  condition: (typeof ASSET_CONDITIONS)[number]
): "MAINTENANCE" | "AVAILABLE" {
  return condition === "DAMAGED" || condition === "MALFUNCTIONING"
    ? "MAINTENANCE"
    : "AVAILABLE";
}
