"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";
import { maintenanceFormSchema } from "@/lib/validation/maintenance";
import { searchMaintenanceAssets } from "@/server/queries/maintenance";

export type MaintenanceFormState = {
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

export async function searchMaintenanceAssetsAction(query: string) {
  const user = await getActionUser();
  if (!user) return [];
  return searchMaintenanceAssets(query);
}

export async function createMaintenanceRecord(
  _prevState: MaintenanceFormState,
  formData: FormData
): Promise<MaintenanceFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to record maintenance.");
  }

  const values = formDataToRecord(formData);
  const base: MaintenanceFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = maintenanceFormSchema.safeParse(values);
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
    const asset = await db.asset.findUnique({
      where: { id: data.assetId },
      select: { id: true, assetTag: true, name: true, status: true },
    });
    if (!asset) {
      return failure("The selected asset no longer exists.");
    }
    if (["RETIRED", "DISPOSED", "MISSING"].includes(asset.status)) {
      return failure(
        `${asset.assetTag} is ${asset.status.toLowerCase()} and cannot enter maintenance.`
      );
    }

    const openRecord = await db.maintenanceRecord.findFirst({
      where: { assetId: asset.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      select: { id: true },
    });
    if (openRecord) {
      return failure(
        `${asset.assetTag} already has an open maintenance record. Complete or cancel it first.`
      );
    }

    const assetEnteredMaintenance = asset.status !== "MAINTENANCE";
    await db.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.create({
        data: {
          assetId: asset.id,
          type: data.type,
          title: data.title,
          issue: data.issue ?? null,
          diagnosis: data.diagnosis ?? null,
          actionTaken: data.actionTaken ?? null,
          partsReplaced: data.partsReplaced ?? null,
          cost: data.cost ?? null,
          technician: data.technician ?? null,
          downtimeHours: data.downtimeHours
            ? Number(data.downtimeHours)
            : null,
          notes: data.notes ?? null,
          reportedById: user.id,
        },
      });

      if (assetEnteredMaintenance) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { status: "MAINTENANCE" },
        });
      }

      await tx.assetTransaction.create({
        data: {
          assetId: asset.id,
          action: "MAINTENANCE_STARTED",
          performedById: user.id,
          fromStatus: assetEnteredMaintenance ? asset.status : undefined,
          toStatus: assetEnteredMaintenance ? "MAINTENANCE" : undefined,
          notes: `Maintenance started: ${data.title}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "MAINTENANCE_CREATED",
          entityType: "MaintenanceRecord",
          entityId: record.id,
          summary: `${asset.assetTag} — maintenance opened: ${data.title}`,
          after: {
            assetTag: asset.assetTag,
            type: data.type,
            title: data.title,
            technician: data.technician ?? null,
            assetStatus: assetEnteredMaintenance
              ? "MAINTENANCE"
              : asset.status,
          },
          ip: await clientIp(),
        },
      });
    });

    target = `/assets/${asset.id}`;
  } catch (error) {
    logActionError("createMaintenanceRecord", error);
    return failure(
      "Unable to save the maintenance record right now. Please try again."
    );
  }
  redirect(target);
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export type MaintenanceStatusResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setMaintenanceStatus(
  recordId: string,
  next: "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
): Promise<MaintenanceStatusResult> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return { ok: false, error: "You do not have permission to update maintenance." };
  }

  try {
    const outcome = await db.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.findUnique({
        where: { id: recordId },
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              status: true,
              condition: true,
              activeAssignmentId: true,
            },
          },
        },
      });
      if (!record) {
        return { ok: false as const, error: "This maintenance record no longer exists." };
      }
      if (!STATUS_TRANSITIONS[record.status]?.includes(next)) {
        return {
          ok: false as const,
          error: `A ${record.status.toLowerCase().replace("_", " ")} record cannot move to ${next.toLowerCase().replace("_", " ")}.`,
        };
      }

      const previousAssetStatus = record.asset.status;
      const assetToStatus =
        record.asset.activeAssignmentId != null ? "CHECKED_OUT" : "AVAILABLE";
      const assetLeavesMaintenance =
        previousAssetStatus === "MAINTENANCE" &&
        (next === "COMPLETED" || next === "CANCELLED");

      if (next === "IN_PROGRESS") {
        await tx.maintenanceRecord.update({
          where: { id: record.id },
          data: {
            status: "IN_PROGRESS",
            startedAt: record.startedAt ?? new Date(),
          },
        });
      } else {
        await tx.maintenanceRecord.update({
          where: { id: record.id },
          data: {
            status: next,
            completedAt: next === "COMPLETED" ? new Date() : record.completedAt,
          },
        });
        if (assetLeavesMaintenance) {
          await tx.asset.update({
            where: { id: record.asset.id },
            data: { status: assetToStatus },
          });
        }
      }

      if (next === "COMPLETED" || next === "CANCELLED") {
        await tx.assetTransaction.create({
          data: {
            assetId: record.asset.id,
            action:
              next === "COMPLETED" ? "MAINTENANCE_COMPLETED" : "STATUS_CHANGED",
            performedById: user.id,
            fromStatus: assetLeavesMaintenance ? "MAINTENANCE" : undefined,
            toStatus: assetLeavesMaintenance ? assetToStatus : undefined,
            conditionAfter: assetLeavesMaintenance
              ? record.asset.condition
              : undefined,
            notes:
              next === "COMPLETED"
                ? `Maintenance completed: ${record.title}`
                : `Maintenance cancelled: ${record.title}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "MAINTENANCE_STATUS_CHANGED",
          entityType: "MaintenanceRecord",
          entityId: record.id,
          summary: `${record.asset.assetTag} — ${record.title}: ${record.status.replaceAll("_", " ").toLowerCase()} → ${next.replaceAll("_", " ").toLowerCase()}`,
          before: { status: record.status, assetStatus: previousAssetStatus },
          after: {
            status: next,
            assetStatus: assetLeavesMaintenance ? assetToStatus : previousAssetStatus,
          },
          ip: await clientIp(),
        },
      });

      return { ok: true as const, assetId: record.asset.id };
    });

    if (!outcome.ok) return outcome;
    revalidatePath("/maintenance");
    revalidatePath(`/assets/${outcome.assetId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    logActionError("setMaintenanceStatus", error);
    return {
      ok: false,
      error: "Unable to update the maintenance record right now. Please try again.",
    };
  }
}
