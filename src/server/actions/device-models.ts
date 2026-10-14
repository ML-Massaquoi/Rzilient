"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";
import { deviceModelFormSchema } from "@/lib/validation/departments";

export type DeviceModelFormState = {
  ok: boolean;
  attempt?: number;
  error?: string;
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
};

async function clientIp(): Promise<string | null> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

function formDataToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") record[key] = value;
  }
  return record;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

async function findDuplicate(
  categoryId: string,
  brand: string,
  name: string,
  excludeId?: string
) {
  const candidates = await db.deviceModel.findMany({
    where: { categoryId, brand: { equals: brand, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  return candidates.find(
    (model) =>
      model.id !== excludeId &&
      model.name.toLowerCase() === name.toLowerCase()
  );
}

export async function createDeviceModel(
  _prevState: DeviceModelFormState,
  formData: FormData
): Promise<DeviceModelFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to add device models.");
  }

  const values = formDataToRecord(formData);
  const base: DeviceModelFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = deviceModelFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ...base,
      errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const duplicate = await findDuplicate(
      parsed.data.categoryId,
      parsed.data.brand,
      parsed.data.name
    );
    if (duplicate) {
      return {
        ...base,
        errors: {
          name: ["This model already exists for the selected category."],
        },
      };
    }

    await db.$transaction(async (tx) => {
      const model = await tx.deviceModel.create({
        data: {
          categoryId: parsed.data.categoryId,
          brand: parsed.data.brand,
          name: parsed.data.name,
          notes: parsed.data.notes ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DEVICE_MODEL_CREATED",
          entityType: "DeviceModel",
          entityId: model.id,
          summary: `Model added: ${model.brand} ${model.name}`,
          after: { brand: model.brand, name: model.name },
          ip: await clientIp(),
        },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ...base,
        errors: {
          name: ["This model already exists for the selected category."],
        },
      };
    }
    logActionError("createDeviceModel", error);
    return failure("Unable to save the model right now. Please try again.");
  }

  redirect("/assets/models?just=created");
}

export async function updateDeviceModel(
  _prevState: DeviceModelFormState,
  formData: FormData
): Promise<DeviceModelFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to edit device models.");
  }

  const values = formDataToRecord(formData);
  const base: DeviceModelFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = deviceModelFormSchema.safeParse(values);
  const id = values.id;
  if (!parsed.success || !id) {
    const fieldErrors: Record<string, string[]> = parsed.success
      ? {}
      : (z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    if (!id) fieldErrors.name = ["Missing model id."];
    return { ...base, errors: fieldErrors };
  }

  try {
    const existing = await db.deviceModel.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return failure("This model no longer exists.");
    }

    const duplicate = await findDuplicate(
      parsed.data.categoryId,
      parsed.data.brand,
      parsed.data.name,
      id
    );
    if (duplicate) {
      return {
        ...base,
        errors: {
          name: ["This model already exists for the selected category."],
        },
      };
    }

    await db.$transaction(async (tx) => {
      await tx.deviceModel.update({
        where: { id },
        data: {
          categoryId: parsed.data.categoryId,
          brand: parsed.data.brand,
          name: parsed.data.name,
          notes: parsed.data.notes ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DEVICE_MODEL_UPDATED",
          entityType: "DeviceModel",
          entityId: id,
          summary: `Model updated: ${parsed.data.brand} ${parsed.data.name}`,
          ip: await clientIp(),
        },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ...base,
        errors: {
          name: ["This model already exists for the selected category."],
        },
      };
    }
    logActionError("updateDeviceModel", error);
    return failure("Unable to save the model right now. Please try again.");
  }

  redirect("/assets/models?just=saved");
}

export async function deleteDeviceModel(formData: FormData): Promise<void> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const model = await db.deviceModel.findUnique({
    where: { id },
    select: {
      id: true,
      brand: true,
      name: true,
      _count: { select: { assets: true } },
    },
  });
  if (!model) return;

  if (model._count.assets > 0) {
    redirect("/assets/models?just=inuse");
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.deviceModel.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DEVICE_MODEL_DELETED",
          entityType: "DeviceModel",
          entityId: id,
          summary: `Model removed: ${model.brand} ${model.name}`,
          before: { brand: model.brand, name: model.name },
          ip: await clientIp(),
        },
      });
    });
  } catch (error) {
    logActionError("deleteDeviceModel", error);
    return;
  }

  revalidatePath("/assets/models", "page");
}
