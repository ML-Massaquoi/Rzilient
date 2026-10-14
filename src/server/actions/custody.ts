"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";
import {
  checkoutSchema,
  returnSchema,
  statusAfterReturn,
  transferSchema,
} from "@/lib/validation/custody";
import { partitionAccessories } from "@/lib/custody";
import { searchEmployees } from "@/server/queries/employees";
import { searchAvailableAssets } from "@/server/queries/custody";

export type CustodyFormState = {
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

function stringList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

function parseDateOnly(value: string | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function safeParse<T extends z.ZodType>(
  schema: T,
  values: Record<string, string>,
  base: CustodyFormState
): { ok: true; data: z.output<T> } | { ok: false; state: CustodyFormState } {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      state: {
        ...base,
        errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
      },
    };
  }
  return { ok: true, data: parsed.data };
}

/* ------------------------------------------------------------------ */
/* Search helpers for the client-side selectors                        */
/* ------------------------------------------------------------------ */

export async function searchCheckoutAssetsAction(query: string) {
  const user = await getActionUser();
  if (!user) return [];
  return searchAvailableAssets(query);
}

export async function searchAssignableEmployeesAction(query: string) {
  const user = await getActionUser();
  if (!user) return [];
  return searchEmployees(query, 8);
}

/* ------------------------------------------------------------------ */
/* Check-out (§20)                                                     */
/* ------------------------------------------------------------------ */

export async function checkOutAsset(
  _prevState: CustodyFormState,
  formData: FormData
): Promise<CustodyFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to check out assets.");
  }

  const values = formDataToRecord(formData);
  const base: CustodyFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = safeParse(checkoutSchema, values, base);
  if (!parsed.ok) return parsed.state;

  const accessories = stringList(formData, "accessories");
  const { assetId, employeeId, condition, expectedReturnAt, notes } = parsed.data;
  const expectedReturnDate = parseDateOnly(expectedReturnAt);
  const ip = await clientIp();

  let target: string | null = null;
  try {
    const outcome = await db.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
        select: {
          id: true,
          assetTag: true,
          name: true,
          status: true,
          condition: true,
          activeAssignmentId: true,
        },
      });
      if (!asset) return { ok: false as const, error: "That asset no longer exists." };
      if (asset.activeAssignmentId) {
        return { ok: false as const, error: `${asset.assetTag} already has an active assignment.` };
      }
      if (asset.status !== "AVAILABLE") {
        return {
          ok: false as const,
          error: `${asset.assetTag} is not available (status: ${asset.status
            .toLowerCase()
            .replace("_", " ")}).`,
        };
      }

      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, fullName: true, status: true, departmentId: true },
      });
      if (!employee) return { ok: false as const, error: "The selected employee no longer exists." };
      if (employee.status !== "ACTIVE") {
        return { ok: false as const, error: `${employee.fullName} is not an active employee.` };
      }

      const assignment = await tx.assetAssignment.create({
        data: {
          assetId: asset.id,
          employeeId: employee.id,
          conditionAtCheckout: condition,
          assignedById: user.id,
          expectedReturnAt: expectedReturnDate,
          accessoriesOut: accessories,
          notes: notes || null,
        },
      });

      await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: "CHECKED_OUT",
          activeAssignmentId: assignment.id,
          departmentId: employee.departmentId,
        },
      });

      await tx.assetTransaction.create({
        data: {
          assetId: asset.id,
          action: "CHECKED_OUT",
          performedById: user.id,
          employeeId: employee.id,
          fromStatus: asset.status,
          toStatus: "CHECKED_OUT",
          conditionBefore: asset.condition,
          conditionAfter: condition,
          assignmentId: assignment.id,
          notes: notes || null,
          metadata: {
            accessories,
            expectedReturnAt: expectedReturnDate?.toISOString() ?? null,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ASSET_CHECKED_OUT",
          entityType: "Asset",
          entityId: asset.id,
          summary: `${asset.assetTag} checked out to ${employee.fullName}`,
          after: {
            assignmentId: assignment.id,
            employee: employee.fullName,
            condition,
            accessories,
            expectedReturnAt:
              expectedReturnDate?.toISOString() ?? null,
          },
          ip,
        },
      });

      return {
        ok: true as const,
        assetId: asset.id,
        assetName: asset.name,
        employeeName: employee.fullName,
      };
    });

    if (!outcome.ok) {
      return failure(outcome.error);
    }
    target = `/assets/${outcome.assetId}?just=checked-out`;
  } catch (error) {
    logActionError("checkOutAsset", error);
    return failure("Unable to check out this asset right now. Please try again.");
  }
  redirect(target);
}

/* ------------------------------------------------------------------ */
/* Return (§21)                                                        */
/* ------------------------------------------------------------------ */

export async function returnAsset(
  _prevState: CustodyFormState,
  formData: FormData
): Promise<CustodyFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to record returns.");
  }

  const values = formDataToRecord(formData);
  const base: CustodyFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = safeParse(returnSchema, values, base);
  if (!parsed.ok) return parsed.state;

  const returnedInput = stringList(formData, "returned");
  const { assignmentId, condition, damageNotes, notes } = parsed.data;
  const ip = await clientIp();

  let target: string | null = null;
  try {
    const outcome = await db.$transaction(async (tx) => {
      const assignment = await tx.assetAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              name: true,
              status: true,
              condition: true,
              activeAssignmentId: true,
            },
          },
          employee: { select: { fullName: true } },
        },
      });
      if (!assignment || assignment.status !== "ACTIVE") {
        return { ok: false as const, error: "This assignment is no longer active." };
      }
      if (assignment.asset.activeAssignmentId !== assignment.id) {
        return { ok: false as const, error: "This assignment was superseded. Refresh and try again." };
      }

      const { returned, missing } = partitionAccessories(
        assignment.accessoriesOut,
        returnedInput
      );
      // An asset already in maintenance stays there until its record completes.
      const newStatus =
        assignment.asset.status === "MAINTENANCE"
          ? "MAINTENANCE"
          : statusAfterReturn(condition);
      const combinedNotes = [notes, damageNotes].filter(Boolean).join(" — ") || null;

      await tx.assetAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "RETURNED",
          returnedAt: new Date(),
          returnedById: user.id,
          conditionAtReturn: condition,
          accessoriesReturned: returned,
          accessoriesMissing: missing,
          notes: combinedNotes,
        },
      });

      await tx.asset.update({
        where: { id: assignment.assetId },
        data: { status: newStatus, condition, activeAssignmentId: null },
      });

      await tx.assetTransaction.create({
        data: {
          assetId: assignment.assetId,
          action: "RETURNED",
          performedById: user.id,
          fromEmployeeId: assignment.employeeId,
          fromStatus: assignment.asset.status,
          toStatus: newStatus,
          conditionBefore: assignment.asset.condition,
          conditionAfter: condition,
          assignmentId: assignment.id,
          notes: combinedNotes,
          metadata: { accessoriesReturned: returned, accessoriesMissing: missing },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ASSET_RETURNED",
          entityType: "Asset",
          entityId: assignment.assetId,
          summary: `${assignment.asset.assetTag} returned by ${assignment.employee.fullName}`,
          after: {
            condition,
            status: newStatus,
            accessoriesMissing: missing,
          },
          ip,
        },
      });

      return {
        ok: true as const,
        assetId: assignment.assetId,
        toMaintenance: newStatus === "MAINTENANCE",
      };
    });

    if (!outcome.ok) {
      return failure(outcome.error);
    }
    target = `/assets/${outcome.assetId}?just=returned${
      outcome.toMaintenance ? "&maintenance=1" : ""
    }`;
  } catch (error) {
    logActionError("returnAsset", error);
    return failure("Unable to record this return right now. Please try again.");
  }
  redirect(target);
}

/* ------------------------------------------------------------------ */
/* Transfer (§23)                                                      */
/* ------------------------------------------------------------------ */

export async function transferAsset(
  _prevState: CustodyFormState,
  formData: FormData
): Promise<CustodyFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to transfer assets.");
  }

  const values = formDataToRecord(formData);
  const base: CustodyFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = safeParse(transferSchema, values, base);
  if (!parsed.ok) return parsed.state;

  const { assignmentId, toEmployeeId, reason, notes } = parsed.data;
  const ip = await clientIp();

  let target: string | null = null;
  try {
    const outcome = await db.$transaction(async (tx) => {
      const assignment = await tx.assetAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              name: true,
              status: true,
              condition: true,
              activeAssignmentId: true,
            },
          },
          employee: { select: { fullName: true } },
        },
      });
      if (!assignment || assignment.status !== "ACTIVE") {
        return { ok: false as const, error: "This assignment is no longer active." };
      }
      if (assignment.asset.activeAssignmentId !== assignment.id) {
        return { ok: false as const, error: "This assignment was superseded. Refresh and try again." };
      }
      if (toEmployeeId === assignment.employeeId) {
        return { ok: false as const, error: "The asset is already assigned to that employee." };
      }

      const toEmployee = await tx.employee.findUnique({
        where: { id: toEmployeeId },
        select: { id: true, fullName: true, status: true, departmentId: true },
      });
      if (!toEmployee) {
        return { ok: false as const, error: "The selected employee no longer exists." };
      }
      if (toEmployee.status !== "ACTIVE") {
        return { ok: false as const, error: `${toEmployee.fullName} is not an active employee.` };
      }

      const newAssignment = await tx.assetAssignment.create({
        data: {
          assetId: assignment.assetId,
          employeeId: toEmployee.id,
          previousAssignmentId: assignment.id,
          conditionAtCheckout: assignment.asset.condition,
          assignedById: user.id,
          expectedReturnAt: assignment.expectedReturnAt,
          accessoriesOut: assignment.accessoriesOut,
          reason: reason || null,
          notes: notes || null,
        },
      });

      await tx.assetAssignment.update({
        where: { id: assignment.id },
        data: { status: "TRANSFERRED" },
      });

      await tx.asset.update({
        where: { id: assignment.assetId },
        data: {
          activeAssignmentId: newAssignment.id,
          status: "CHECKED_OUT",
          departmentId: toEmployee.departmentId,
        },
      });

      await tx.assetTransaction.create({
        data: {
          assetId: assignment.assetId,
          action: "TRANSFERRED",
          performedById: user.id,
          fromEmployeeId: assignment.employeeId,
          toEmployeeId: toEmployee.id,
          employeeId: toEmployee.id,
          fromStatus: assignment.asset.status,
          toStatus: "CHECKED_OUT",
          conditionBefore: assignment.asset.condition,
          conditionAfter: assignment.asset.condition,
          assignmentId: newAssignment.id,
          notes: notes || null,
          metadata: { reason: reason || null, fromAssignmentId: assignment.id },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ASSET_TRANSFERRED",
          entityType: "Asset",
          entityId: assignment.assetId,
          summary: `${assignment.asset.assetTag} transferred from ${assignment.employee.fullName} to ${toEmployee.fullName}`,
          after: {
            from: assignment.employee.fullName,
            to: toEmployee.fullName,
            reason: reason || null,
          },
          ip,
        },
      });

      return { ok: true as const, assetId: assignment.assetId };
    });

    if (!outcome.ok) {
      return failure(outcome.error);
    }
    target = `/assets/${outcome.assetId}?just=transferred`;
  } catch (error) {
    logActionError("transferAsset", error);
    return failure("Unable to transfer this asset right now. Please try again.");
  }
  redirect(target);
}
