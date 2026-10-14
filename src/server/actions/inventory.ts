"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";
import { itemFormSchema, stockTxFormSchema, NO_LOCATION } from "@/lib/validation/inventory";

export type InventoryFormState = {
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

export async function createInventoryItem(
  _prevState: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to create stock items.");
  }

  const values = formDataToRecord(formData);
  const base: InventoryFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = itemFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ...base,
      errors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  let target: string | null = null;
  try {
    const data = parsed.data;
    const skuExists = await db.inventoryItem.findFirst({
      where: { sku: { equals: data.sku, mode: "insensitive" } },
      select: { id: true },
    });
    if (skuExists) {
      return {
        ...base,
        errors: { sku: ["An item with this SKU already exists."] },
      };
    }

    const item = await db.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({
        data: {
          name: data.name,
          sku: data.sku,
          category: data.category ?? null,
          unit: data.unit,
          minimumStock: data.minimumStock ? Number(data.minimumStock) : 0,
          reorderLevel: data.reorderLevel ? Number(data.reorderLevel) : null,
          locationId: data.locationId && data.locationId !== NO_LOCATION ? data.locationId : null,
          notes: data.notes ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "STOCK_ITEM_CREATED",
          entityType: "InventoryItem",
          entityId: created.id,
          summary: `${created.name} (${created.sku}) added to stock`,
          after: {
            name: created.name,
            sku: created.sku,
            unit: created.unit,
            minimumStock: created.minimumStock,
          },
          ip: await clientIp(),
        },
      });
      return created;
    });

    target = `/inventory/stock?just=created#${item.id}`;
  } catch (error) {
    logActionError("createInventoryItem", error);
    return failure("Unable to save the stock item right now. Please try again.");
  }
  redirect(target);
}

export async function updateInventoryItem(
  _prevState: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to edit stock items.");
  }

  const values = formDataToRecord(formData);
  const itemId = values.id;
  if (!itemId) {
    return failure("Missing stock item reference.");
  }

  const base: InventoryFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = itemFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ...base,
      errors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  let target: string | null = null;
  try {
    const current = await db.inventoryItem.findUnique({
      where: { id: itemId },
    });
    if (!current) {
      return failure("This stock item no longer exists.");
    }

    const data = parsed.data;
    const skuExists = await db.inventoryItem.findFirst({
      where: { sku: { equals: data.sku, mode: "insensitive" }, NOT: { id: itemId } },
      select: { id: true },
    });
    if (skuExists) {
      return {
        ...base,
        errors: { sku: ["An item with this SKU already exists."] },
      };
    }

    await db.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          name: data.name,
          sku: data.sku,
          category: data.category ?? null,
          unit: data.unit,
          minimumStock: data.minimumStock ? Number(data.minimumStock) : 0,
          reorderLevel: data.reorderLevel ? Number(data.reorderLevel) : null,
          locationId: data.locationId && data.locationId !== NO_LOCATION ? data.locationId : null,
          notes: data.notes ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "STOCK_ITEM_UPDATED",
          entityType: "InventoryItem",
          entityId: itemId,
          summary: `${data.name} (${data.sku}) updated`,
          before: {
            name: current.name,
            sku: current.sku,
            minimumStock: current.minimumStock,
            quantity: current.quantity,
          },
          after: {
            name: data.name,
            sku: data.sku,
            minimumStock: data.minimumStock ? Number(data.minimumStock) : 0,
          },
          ip: await clientIp(),
        },
      });
    });

    target = `/inventory/stock?just=updated#${itemId}`;
  } catch (error) {
    logActionError("updateInventoryItem", error);
    return failure("Unable to save your changes right now. Please try again.");
  }
  redirect(target);
}

const POSITIVE_TYPES = new Set(["RECEIVED", "ISSUED", "DAMAGED", "LOST", "RETURNED"]);

export async function recordStockTransaction(
  _prevState: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to record stock movements.");
  }

  const values = formDataToRecord(formData);
  const base: InventoryFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = stockTxFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ...base,
      errors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const data = parsed.data;
  const inputQuantity = Number(data.quantity);
  if (POSITIVE_TYPES.has(data.type) && inputQuantity < 0) {
    return {
      ...base,
      errors: { quantity: ["Enter a positive quantity."] },
    };
  }

  let delta: number;
  if (data.type === "RECEIVED" || data.type === "RETURNED") {
    delta = Math.abs(inputQuantity);
  } else if (data.type === "ADJUSTED") {
    delta = inputQuantity;
  } else {
    delta = -Math.abs(inputQuantity);
  }

  let target: string | null = null;
  try {
    const outcome = await db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: data.itemId },
        select: { id: true, name: true, sku: true, unit: true, quantity: true },
      });
      if (!item) {
        return { ok: false as const, error: "This stock item no longer exists." };
      }
      const nextQuantity = item.quantity + delta;
      if (nextQuantity < 0) {
        return {
          ok: false as const,
          error: `Only ${item.quantity} ${item.unit ?? "unit"}${item.quantity === 1 ? "" : "s"} of ${item.name} in stock.`,
        };
      }

      const txRow = await tx.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: data.type,
          quantityChange: delta,
          quantityAfter: nextQuantity,
          performedById: user.id,
          reference: data.reference ?? null,
          notes: data.notes ?? null,
        },
      });
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: nextQuantity },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: `STOCK_${data.type}`,
          entityType: "InventoryItem",
          entityId: item.id,
          summary: `${item.name} (${item.sku}) ${delta > 0 ? "+" : ""}${delta} → ${nextQuantity}`,
          before: { quantity: item.quantity },
          after: {
            quantity: nextQuantity,
            type: data.type,
            reference: data.reference ?? null,
          },
          ip: await clientIp(),
        },
      });
      return {
        ok: true as const,
        name: item.name,
        delta,
        quantity: nextQuantity,
        transactionId: txRow.id,
      };
    });

    if (!outcome.ok) {
      return failure(outcome.error);
    }
    target = `/inventory/stock?just=transacted#${outcome.transactionId}`;
  } catch (error) {
    logActionError("recordStockTransaction", error);
    return failure(
      "Unable to record the stock movement right now. Please try again."
    );
  }
  redirect(target);
}
