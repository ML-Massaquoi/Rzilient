"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";
import {
  assetFormSchema,
  isSubmittableStatus,
} from "@/lib/validation/asset";

export type AssetFormState = {
  ok: boolean;
  attempt?: number;
  error?: string;
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
  assetId?: string;
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

function fieldFailure(
  field: string,
  message: string,
  prev: AssetFormState
): AssetFormState {
  return {
    ok: false,
    attempt: (prev.attempt ?? 0) + 1,
    errors: { [field]: [message] },
    values: prev.values,
  };
}

type ParsedAsset = z.infer<typeof assetFormSchema>;

function toAssetData(data: ParsedAsset) {
  return {
    name: data.name,
    assetTag: data.assetTag,
    categoryId: data.categoryId,
    serialNumber: data.serialNumber ?? null,
    brand: data.brand ?? null,
    model: data.model ?? null,
    description: data.description ?? null,
    notes: data.notes ?? null,
    condition: data.condition,
    locationId: data.locationId ?? null,
    departmentId: data.departmentId ?? null,
    os: data.os ?? null,
    fqdn: data.fqdn ?? null,
    ethernetMac: data.ethernetMac ?? null,
    wifiMac: data.wifiMac ?? null,
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
    purchaseCost: data.purchaseCost ?? null,
    supplier: data.supplier ?? null,
    warrantyEndsAt: data.warrantyEndsAt ? new Date(data.warrantyEndsAt) : null,
  };
}

/**
 * Links the asset to the DeviceModel catalog — reusing an existing
 * category+brand+model entry when there is one, creating it when it's new
 * (that is how new models get added during registration).
 */
async function resolveDeviceModelId(
  categoryId: string,
  brand?: string,
  model?: string
): Promise<string | null> {
  const b = (brand ?? "").trim();
  const m = (model ?? "").trim();
  if (!b || !m) return null;

  const candidates = await db.deviceModel.findMany({
    where: { categoryId, brand: { equals: b, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  const hit = candidates.find(
    (candidate) => candidate.name.toLowerCase() === m.toLowerCase()
  );
  if (hit) return hit.id;

  const created = await db.deviceModel.create({
    data: { categoryId, brand: b, name: m },
  });
  return created.id;
}

const CHANGE_LABELS: Record<string, string> = {
  name: "name",
  assetTag: "tag",
  categoryId: "category",
  serialNumber: "serial number",
  brand: "brand",
  model: "model",
  description: "description",
  notes: "notes",
  condition: "condition",
  locationId: "location",
  departmentId: "department",
  os: "operating system",
  fqdn: "hostname",
  ethernetMac: "Ethernet MAC",
  wifiMac: "Wi-Fi MAC",
  purchaseDate: "purchase date",
  purchaseCost: "purchase cost",
  supplier: "supplier",
  warrantyEndsAt: "warranty end",
};

export async function createAsset(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to register assets.");
  }

  const values = formDataToRecord(formData);
  const base: AssetFormState = { ok: false, attempt: (_prevState.attempt ?? 0) + 1, values };

  const parsed = assetFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ...base, errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }

  if (!isSubmittableStatus(parsed.data.status)) {
    return fieldFailure("status", "Select a valid status.", base);
  }
  const initialStatus = parsed.data.status;

  let target: string | null = null;
  try {
    const data = parsed.data;

    const [tagExists, serialExists, category] = await Promise.all([
      db.asset.findUnique({
        where: { assetTag: data.assetTag },
        select: { id: true },
      }),
      data.serialNumber
        ? db.asset.findUnique({
            where: { serialNumber: data.serialNumber },
            select: { id: true },
          })
        : Promise.resolve(null),
      db.assetCategory.findUnique({ where: { id: data.categoryId }, select: { id: true, requiresSerial: true } }),
    ]);

    if (!category) {
      return fieldFailure("categoryId", "Selected category no longer exists.", base);
    }
    if (category.requiresSerial && !data.serialNumber) {
      return fieldFailure(
        "serialNumber",
        "This category requires a serial number.",
        base
      );
    }
    if (tagExists) {
      return fieldFailure("assetTag", "This asset tag is already in use.", base);
    }
    if (serialExists) {
      return fieldFailure(
        "serialNumber",
        "An asset with this serial number already exists.",
        base
      );
    }

    const modelId = await resolveDeviceModelId(
      data.categoryId,
      data.brand,
      data.model
    );

    const asset = await db.$transaction(async (tx) => {
      const created = await tx.asset.create({
        data: {
          ...toAssetData(data),
          modelId,
          status: initialStatus,
          createdById: user.id,
        },
      });
      await tx.assetTransaction.create({
        data: {
          assetId: created.id,
          action: "CREATED",
          performedById: user.id,
          toStatus: created.status,
          conditionAfter: created.condition,
          notes: "Asset registered",
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ASSET_CREATED",
          entityType: "Asset",
          entityId: created.id,
          summary: `${created.assetTag} registered`,
          after: {
            assetTag: created.assetTag,
            name: created.name,
            status: created.status,
            condition: created.condition,
          },
          ip: await clientIp(),
        },
      });
      return created;
    });

    target = `/assets/${asset.id}`;
    if (formData.get("noRedirect") === "1") {
      return { ok: true, attempt: base.attempt, assetId: asset.id };
    }
  } catch (error) {
    logActionError("createAsset", error);
    return failure("Unable to save the asset right now. Please try again.");
  }
  redirect(target!);
}

const UPDATE_SCHEMA_FIELD_KEYS = Object.keys(CHANGE_LABELS);

export async function updateAsset(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to edit assets.");
  }

  const values = formDataToRecord(formData);
  const assetId = values.id;
  if (!assetId) {
    return failure("Missing asset reference.");
  }

  const base: AssetFormState = { ok: false, attempt: (_prevState.attempt ?? 0) + 1, values };

  const parsed = assetFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ...base, errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }

  let target: string | null = null;
  try {
    const current = await db.asset.findUnique({
      where: { id: assetId },
      select: { id: true, status: true, condition: true },
    });
    if (!current) {
      return failure("This asset no longer exists.");
    }

    const statusLocked =
      current.status === "CHECKED_OUT" ||
      current.status === "RETIRED" ||
      current.status === "DISPOSED";

    let nextStatus = current.status;
    if (parsed.data.status !== current.status) {
      if (statusLocked) {
        return fieldFailure(
          "status",
          `${current.status === "CHECKED_OUT" ? "Checked-out" : current.status === "RETIRED" ? "Retired" : "Disposed"} assets are managed through their dedicated workflows, not the edit form.`,
          base
        );
      }
      if (!isSubmittableStatus(parsed.data.status)) {
        return fieldFailure("status", "Select a valid status.", base);
      }
      nextStatus = parsed.data.status;
    }

    const data = parsed.data;
    const [tagExists, serialExists, category] = await Promise.all([
      db.asset.findFirst({
        where: { assetTag: data.assetTag, NOT: { id: assetId } },
        select: { id: true },
      }),
      data.serialNumber
        ? db.asset.findFirst({
            where: { serialNumber: data.serialNumber, NOT: { id: assetId } },
            select: { id: true },
          })
        : Promise.resolve(null),
      db.assetCategory.findUnique({ where: { id: data.categoryId }, select: { id: true, requiresSerial: true } }),
    ]);

    if (!category) {
      return fieldFailure("categoryId", "Selected category no longer exists.", base);
    }
    if (category.requiresSerial && !data.serialNumber) {
      return fieldFailure(
        "serialNumber",
        "This category requires a serial number.",
        base
      );
    }
    if (tagExists) {
      return fieldFailure("assetTag", "This asset tag is already in use.", base);
    }
    if (serialExists) {
      return fieldFailure(
        "serialNumber",
        "An asset with this serial number already exists.",
        base
      );
    }

    const previous = await db.asset.findUnique({ where: { id: assetId } });
    if (!previous) {
      return failure("This asset no longer exists.");
    }

    const modelId = await resolveDeviceModelId(
      data.categoryId,
      data.brand,
      data.model
    );

    const nextData = {
      ...toAssetData(data),
      modelId,
      status: nextStatus,
    };

    const changed = UPDATE_SCHEMA_FIELD_KEYS.filter((key) => {
      const before = (previous as Record<string, unknown>)[key];
      const after = (nextData as Record<string, unknown>)[key];
      if (before instanceof Date && after instanceof Date) {
        return before.getTime() !== after.getTime();
      }
      return (before ?? null) !== (after ?? null);
    });
    const statusChanged = previous.status !== nextData.status;
    const conditionChanged = previous.condition !== nextData.condition;

    await db.$transaction(async (tx) => {
      await tx.asset.update({ where: { id: assetId }, data: nextData });

      if (changed.length > 0 || statusChanged || conditionChanged) {
        const summary = changed.map((key) => CHANGE_LABELS[key]).join(", ");
        await tx.assetTransaction.create({
          data: {
            assetId,
            action: "EDITED",
            performedById: user.id,
            fromStatus: statusChanged ? previous.status : undefined,
            toStatus: statusChanged ? nextData.status : undefined,
            conditionBefore: conditionChanged ? previous.condition : undefined,
            conditionAfter: conditionChanged ? nextData.condition : undefined,
            notes: statusChanged
              ? `Status changed to ${nextData.status}`
              : `Updated: ${summary}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ASSET_UPDATED",
          entityType: "Asset",
          entityId: assetId,
          summary: `${data.assetTag} updated`,
          before: {
            status: previous.status,
            condition: previous.condition,
            categoryId: previous.categoryId,
            locationId: previous.locationId,
          },
          after: {
            status: nextData.status,
            condition: nextData.condition,
            categoryId: nextData.categoryId,
            locationId: nextData.locationId,
          },
          ip: await clientIp(),
        },
      });
    });

    target = `/assets/${assetId}`;
  } catch (error) {
    logActionError("updateAsset", error);
    return failure("Unable to save your changes right now. Please try again.");
  }
  redirect(target);
}
