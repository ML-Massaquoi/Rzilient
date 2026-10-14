"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";
import { searchComponentAssets } from "@/server/queries/assets";

export type ComponentFormState = {
  ok: boolean;
  attempt?: number;
  error?: string;
  errors?: Record<string, string[]>;
};

async function clientIp(): Promise<string | null> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** True when parentAssetId sits inside componentAssetId's own subtree. */
async function wouldCreateLoop(
  componentAssetId: string,
  parentAssetId: string
): Promise<boolean> {
  let cursor: string | null = parentAssetId;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    if (cursor === componentAssetId) return true;
    seen.add(cursor);
    const row: { parentId: string | null } | null =
      await db.asset.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
    cursor = row?.parentId ?? null;
  }
  return false;
}

/** Search devices to attach as a component of `parentAssetId`. */
export async function searchComponentAssetsAction(
  query: string,
  parentAssetId: string
) {
  const user = await getActionUser();
  if (!user) return [];
  return searchComponentAssets(query, parentAssetId, 10);
}

/** Assigns one asset as a component of another (batteries → radio, SSD → laptop). */
export async function assignComponent(
  _prevState: ComponentFormState,
  formData: FormData
): Promise<ComponentFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to assign components.");
  }

  const base: ComponentFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
  };

  const componentAssetId = String(
    formData.get("componentAssetId") ?? ""
  ).trim();
  const parentAssetId = String(formData.get("parentAssetId") ?? "").trim();

  if (!componentAssetId || !parentAssetId) {
    return { ...base, error: "Select an asset to attach." };
  }
  if (componentAssetId === parentAssetId) {
    return { ...base, error: "An asset cannot be a component of itself." };
  }

  let target: string | null = null;
  try {
    const [component, parent] = await Promise.all([
      db.asset.findUnique({
        where: { id: componentAssetId },
        select: {
          id: true,
          assetTag: true,
          name: true,
          status: true,
          parentId: true,
          archivedAt: true,
        },
      }),
      db.asset.findUnique({
        where: { id: parentAssetId },
        select: { id: true, assetTag: true, name: true },
      }),
    ]);

    if (!component || !parent) {
      return { ...base, error: "One of the assets no longer exists." };
    }
    if (component.archivedAt) {
      return {
        ...base,
        error: `${component.assetTag} is archived and cannot be attached.`,
      };
    }
    if (await wouldCreateLoop(componentAssetId, parentAssetId)) {
      return {
        ...base,
        error: "That would create a loop in the component tree.",
      };
    }

    await db.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: componentAssetId },
        data: { parentId: parentAssetId },
      });
      await tx.assetTransaction.create({
        data: {
          assetId: componentAssetId,
          action: "COMPONENT_ADDED",
          performedById: user.id,
          fromStatus: component.status,
          toStatus: component.status,
          notes: `Installed in ${parent.assetTag} · ${parent.name}`,
          metadata: {
            parentAssetId: parent.id,
            parentAssetTag: parent.assetTag,
            previousParentId: component.parentId,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ASSET_COMPONENT_ADDED",
          entityType: "Asset",
          entityId: componentAssetId,
          summary: `${component.assetTag} assigned to ${parent.assetTag}`,
          after: {
            parentAssetId: parent.id,
            parentAssetTag: parent.assetTag,
          },
          ip: await clientIp(),
        },
      });
    });

    target = `/assets/${parentAssetId}?just=component-added`;
  } catch (error) {
    logActionError("assignComponent", error);
    return failure(
      "Unable to attach the component right now. Please try again."
    );
  }
  redirect(target);
}

/** Detaches a component from its parent asset. */
export async function removeComponent(formData: FormData): Promise<void> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) return;

  const componentAssetId = String(
    formData.get("componentAssetId") ?? ""
  ).trim();
  if (!componentAssetId) return;

  const component = await db.asset.findUnique({
    where: { id: componentAssetId },
    select: { id: true, assetTag: true, status: true, parentId: true },
  });
  if (!component || !component.parentId) return;
  const parentAssetId = component.parentId;
  const parent = await db.asset.findUnique({
    where: { id: parentAssetId },
    select: { assetTag: true, name: true },
  });

  try {
    await db.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: component.id },
        data: { parentId: null },
      });
      await tx.assetTransaction.create({
        data: {
          assetId: component.id,
          action: "COMPONENT_REMOVED",
          performedById: user.id,
          fromStatus: component.status,
          toStatus: component.status,
          notes: parent
            ? `Detached from ${parent.assetTag} · ${parent.name}`
            : null,
          metadata: { previousParentId: parentAssetId },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ASSET_COMPONENT_REMOVED",
          entityType: "Asset",
          entityId: component.id,
          summary: `${component.assetTag} detached from its parent device`,
          before: { parentAssetId },
          ip: await clientIp(),
        },
      });
    });
  } catch (error) {
    logActionError("removeComponent", error);
    return;
  }

  redirect(`/assets/${parentAssetId}?just=component-removed`);
}
