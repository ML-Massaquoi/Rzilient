"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";
import { getWarehouseRootId } from "@/server/queries/warehouses";

export type MoveFormState = {
  ok: boolean;
  attempt?: number;
  error?: string;
  errors?: Record<string, string[]>;
};

async function clientIp(): Promise<string | null> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

function stringList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

/** Moves one or more devices between warehouses (Asset.locationId). */
export async function moveAssetsToWarehouse(
  _prevState: MoveFormState,
  formData: FormData
): Promise<MoveFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure(
      "You do not have permission to move devices between warehouses."
    );
  }

  const base: MoveFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
  };

  const assetIds = [...new Set(stringList(formData, "assetIds"))];
  const toLocationId = String(formData.get("toLocationId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (assetIds.length === 0) {
    return { ...base, error: "Select at least one device to move." };
  }
  if (!toLocationId) {
    return { ...base, error: "Choose the destination warehouse." };
  }

  let target: string | null = null;
  try {
    const rootId = await getWarehouseRootId();
    if (!rootId) {
      return failure("Warehouses are not configured yet. Run the seed.");
    }

    const [destination, source] = await Promise.all([
      db.location.findFirst({
        where: { id: toLocationId, parentId: rootId },
        select: { id: true, name: true },
      }),
      db.location.findMany({
        where: { parentId: rootId },
        select: { id: true, name: true },
      }),
    ]);
    if (!destination) {
      return { ...base, error: "The destination must be one of the warehouses." };
    }
    const locationName = new Map(source.map((row) => [row.id, row.name]));

    const assets = await db.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, assetTag: true, name: true, locationId: true, status: true },
    });
    if (assets.length === 0) {
      return { ...base, error: "None of the selected devices were found." };
    }

    const toMove = assets.filter((asset) => asset.locationId !== destination.id);
    if (toMove.length === 0) {
      return {
        ...base,
        error: `All ${assets.length} selected devices are already in ${destination.name}.`,
      };
    }

    await db.$transaction(async (tx) => {
      for (const asset of toMove) {
        const fromName = asset.locationId
          ? locationName.get(asset.locationId) ?? "another location"
          : "no location";
        await tx.asset.update({
          where: { id: asset.id },
          data: { locationId: destination.id },
        });
        await tx.assetTransaction.create({
          data: {
            assetId: asset.id,
            action: "LOCATION_CHANGED",
            performedById: user.id,
            fromLocationId: asset.locationId,
            toLocationId: destination.id,
            fromStatus: asset.status,
            toStatus: asset.status,
            notes: notes || `Moved from ${fromName} to ${destination.name}`,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ASSETS_MOVED_WAREHOUSE",
          entityType: "Asset",
          entityId: toMove[0].id,
          summary:
            toMove.length === 1
              ? `${toMove[0].assetTag} moved to ${destination.name}`
              : `${toMove.length} devices moved to ${destination.name}`,
          after: {
            toLocationId: destination.id,
            toLocationName: destination.name,
            assetIds: toMove.map((asset) => asset.id),
          },
          ip: await clientIp(),
        },
      });
    });

    const skipped = assets.length - toMove.length;
    target = `/inventory/warehouses/${destination.id}?just=moved&count=${toMove.length}${
      skipped > 0 ? `&skipped=${skipped}` : ""
    }`;
  } catch (error) {
    logActionError("moveAssetsToWarehouse", error);
    return failure(
      "Unable to move the devices right now. Please try again."
    );
  }
  redirect(target);
}
