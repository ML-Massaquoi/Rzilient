import { z } from "zod";
import { MaintenanceType } from "@/generated/prisma/enums";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalCount = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d+$/, "Enter a whole number")
      .refine((value) => Number(value) <= max, `Must be ${max} or less`)
      .optional()
  );

const optionalMoney = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount")
    .optional()
);

/** Creation form (§27). Status transitions happen through governed actions. */
export const maintenanceFormSchema = z.object({
  assetId: z.string().min(1, "Select an asset"),
  type: z.enum(MaintenanceType),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(160, "Keep the title under 160 characters"),
  issue: optionalText(2000),
  diagnosis: optionalText(2000),
  actionTaken: optionalText(2000),
  partsReplaced: optionalText(500),
  cost: optionalMoney,
  technician: optionalText(120),
  downtimeHours: optionalCount(10000),
  notes: optionalText(4000),
});

export type MaintenanceFormInput = z.input<typeof maintenanceFormSchema>;
