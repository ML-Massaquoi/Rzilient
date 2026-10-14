import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const systemFormSchema = z.object({
  departmentId: z.string().min(1, "Department is required"),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Keep the name under 60 characters"),
});

export const accountFormSchema = z.object({
  departmentId: z.string().min(1, "Department is required"),
  systemId: z.string().min(1, "System is required"),
  employeeId: z.string().min(1, "Choose an employee"),
  username: optionalText(120),
  notes: optionalText(300),
});

export const deviceModelFormSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  brand: z
    .string()
    .trim()
    .min(1, "Brand is required")
    .max(80, "Keep the brand under 80 characters"),
  name: z
    .string()
    .trim()
    .min(1, "Model name is required")
    .max(80, "Keep the model name under 80 characters"),
  notes: optionalText(300),
});

export function slugifySystemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
