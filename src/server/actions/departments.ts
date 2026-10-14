"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";
import {
  accountFormSchema,
  systemFormSchema,
  slugifySystemName,
} from "@/lib/validation/departments";

export type DepartmentFormState = {
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

export async function createSystem(
  _prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const user = await getActionUser("ADMIN");
  if (!user) {
    return failure("Only administrators can add systems.");
  }

  const values = formDataToRecord(formData);
  const base: DepartmentFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = systemFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ...base,
      errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  const slug = slugifySystemName(parsed.data.name);
  if (!slug) {
    return { ...base, errors: { name: ["Enter a name with letters or numbers."] } };
  }

  try {
    const existing = await db.itSystem.findFirst({
      where: {
        OR: [
          { slug },
          { name: { equals: parsed.data.name, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      return { ...base, errors: { name: ["This system already exists."] } };
    }

    await db.$transaction(async (tx) => {
      const system = await tx.itSystem.create({
        data: { name: parsed.data.name, slug },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SYSTEM_CREATED",
          entityType: "ItSystem",
          entityId: system.id,
          summary: `System "${system.name}" added`,
          after: { name: system.name, slug: system.slug },
          ip: await clientIp(),
        },
      });
    });
  } catch (error) {
    logActionError("createSystem", error);
    return failure("Unable to add the system right now. Please try again.");
  }

  redirect(
    `/departments/${parsed.data.departmentId}?tile=sys:${slug}&just=system`
  );
}

export async function addSystemAccount(
  _prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to manage system accounts.");
  }

  const values = formDataToRecord(formData);
  const base: DepartmentFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = accountFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ...base,
      errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  let target: string | null = null;
  try {
    const [employee, system] = await Promise.all([
      db.employee.findUnique({
        where: { id: parsed.data.employeeId },
        select: { id: true, fullName: true, departmentId: true },
      }),
      db.itSystem.findUnique({
        where: { id: parsed.data.systemId },
        select: { id: true, name: true, slug: true },
      }),
    ]);
    if (!employee || !system) {
      return failure("The selected employee or system no longer exists.");
    }
    if (employee.departmentId !== parsed.data.departmentId) {
      return failure("Choose an employee from this department.");
    }

    await db.$transaction(async (tx) => {
      await tx.employeeAccount.create({
        data: {
          employeeId: employee.id,
          systemId: system.id,
          username: parsed.data.username ?? null,
          notes: parsed.data.notes ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SYSTEM_ACCOUNT_ADDED",
          entityType: "EmployeeAccount",
          entityId: employee.id,
          summary: `${employee.fullName} given a ${system.name} account`,
          after: {
            system: system.name,
            username: parsed.data.username ?? null,
          },
          ip: await clientIp(),
        },
      });
    });

    target = `/departments/${parsed.data.departmentId}?tile=sys:${system.slug}&just=account`;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ...base,
        errors: { employeeId: ["This employee already has an account for this system."] },
      };
    }
    logActionError("addSystemAccount", error);
    return failure("Unable to save the account right now. Please try again.");
  }

  redirect(target!);
}

export async function removeSystemAccount(formData: FormData): Promise<void> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  const departmentId = String(formData.get("departmentId") ?? "");
  if (!id || !departmentId) return;

  try {
    const account = await db.employeeAccount.findUnique({
      where: { id },
      include: {
        system: { select: { name: true } },
        employee: { select: { fullName: true } },
      },
    });
    if (!account) return;

    await db.$transaction(async (tx) => {
      await tx.employeeAccount.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SYSTEM_ACCOUNT_REMOVED",
          entityType: "EmployeeAccount",
          entityId: account.employeeId,
          summary: `${account.employee.fullName} removed from ${account.system.name}`,
          before: { system: account.system.name },
          ip: await clientIp(),
        },
      });
    });
  } catch (error) {
    logActionError("removeSystemAccount", error);
    return;
  }

  revalidatePath(`/departments/${departmentId}`, "page");
}
