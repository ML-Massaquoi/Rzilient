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
  bulkDepartmentTransferSchema,
  deleteDepartmentFormSchema,
  departmentFormSchema,
  systemFormSchema,
  slugifySystemName,
} from "@/lib/validation/departments";
import { searchEmployees } from "@/server/queries/employees";

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

function flattenFieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

async function departmentNameClash(
  name: string,
  excludeId?: string
): Promise<boolean> {
  const clash = await db.department.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  return Boolean(clash);
}

async function departmentCodeClash(
  code: string,
  excludeId?: string
): Promise<boolean> {
  const clash = await db.department.findFirst({
    where: { ...(excludeId ? { id: { not: excludeId } } : {}), code },
    select: { id: true },
  });
  return Boolean(clash);
}

export async function createDepartment(
  _prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const user = await getActionUser("ADMIN");
  if (!user) {
    return failure("Only administrators can create departments.");
  }

  const values = formDataToRecord(formData);
  const base: DepartmentFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = departmentFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ...base, errors: flattenFieldErrors(parsed.error) };
  }

  const code = parsed.data.code ? parsed.data.code.toUpperCase() : null;
  let target: string | null = null;
  try {
    if (await departmentNameClash(parsed.data.name)) {
      return { ...base, errors: { name: ["A department with this name already exists."] } };
    }
    if (code && (await departmentCodeClash(code))) {
      return { ...base, errors: { code: ["This code is already in use."] } };
    }

    await db.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: {
          name: parsed.data.name,
          code,
          description: parsed.data.description ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DEPARTMENT_CREATED",
          entityType: "Department",
          entityId: department.id,
          summary: `Department "${department.name}" created`,
          after: {
            name: department.name,
            code: department.code,
            description: department.description,
          },
          ip: await clientIp(),
        },
      });
      target = `/departments/${department.id}?just=created`;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ...base,
        errors: { name: ["A department with this name already exists."] },
      };
    }
    logActionError("createDepartment", error);
    return failure("Unable to create the department right now. Please try again.");
  }

  redirect(target!);
}

export async function updateDepartment(
  _prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const user = await getActionUser("ADMIN");
  if (!user) {
    return failure("Only administrators can edit departments.");
  }

  const values = formDataToRecord(formData);
  const base: DepartmentFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ...base, errors: { id: ["Department is required."] } };
  }

  const parsed = departmentFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ...base, errors: flattenFieldErrors(parsed.error) };
  }

  const code = parsed.data.code ? parsed.data.code.toUpperCase() : null;
  let target: string | null = null;
  try {
    const existing = await db.department.findUnique({
      where: { id },
      select: { id: true, name: true, code: true },
    });
    if (!existing) {
      return failure("This department no longer exists.");
    }
    if (await departmentNameClash(parsed.data.name, id)) {
      return { ...base, errors: { name: ["A department with this name already exists."] } };
    }
    if (code && (await departmentCodeClash(code, id))) {
      return { ...base, errors: { code: ["This code is already in use."] } };
    }

    const before = {
      name: existing.name,
      code: existing.code,
      description: null as string | null,
    };
    const current = await db.department.findUnique({
      where: { id },
      select: { description: true },
    });
    before.description = current?.description ?? null;

    await db.$transaction(async (tx) => {
      const department = await tx.department.update({
        where: { id },
        data: {
          name: parsed.data.name,
          code,
          description: parsed.data.description ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DEPARTMENT_UPDATED",
          entityType: "Department",
          entityId: department.id,
          summary: `Department "${department.name}" updated`,
          before,
          after: {
            name: department.name,
            code: department.code,
            description: department.description,
          },
          ip: await clientIp(),
        },
      });
      target = `/departments/${department.id}?just=updated`;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ...base,
        errors: { name: ["A department with this name already exists."] },
      };
    }
    logActionError("updateDepartment", error);
    return failure("Unable to save the department right now. Please try again.");
  }

  redirect(target!);
}

export async function deleteDepartment(
  _prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const user = await getActionUser("ADMIN");
  if (!user) {
    return failure("Only administrators can delete departments.");
  }

  const values = formDataToRecord(formData);
  const base: DepartmentFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = deleteDepartmentFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ...base, errors: flattenFieldErrors(parsed.error) };
  }

  const { departmentId, moveToDepartmentId } = parsed.data;
  let target: string | null = null;
  try {
    const department = await db.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true, code: true, description: true },
    });
    if (!department) {
      return failure("This department no longer exists.");
    }

    const totalDepartments = await db.department.count();
    if (totalDepartments <= 1) {
      return failure(
        "This is the last remaining department — create another department first."
      );
    }

    const employeeCount = await db.employee.count({
      where: { departmentId },
    });

    if (employeeCount > 0) {
      if (!moveToDepartmentId) {
        return {
          ...base,
          errors: {
            moveToDepartmentId: [
              `${employeeCount} ${
                employeeCount === 1 ? "employee belongs" : "employees belong"
              } to this department — choose where to move them.`,
            ],
          },
        };
      }
      if (moveToDepartmentId === departmentId) {
        return {
          ...base,
          errors: { moveToDepartmentId: ["Choose a different department."] },
        };
      }
      const destination = await db.department.findUnique({
        where: { id: moveToDepartmentId },
        select: { id: true, name: true },
      });
      if (!destination) {
        return {
          ...base,
          errors: { moveToDepartmentId: ["The destination department no longer exists."] },
        };
      }
    }

    const destinationName = moveToDepartmentId
      ? (await db.department.findUnique({
          where: { id: moveToDepartmentId },
          select: { name: true },
        }))?.name ?? "another department"
      : null;

    await db.$transaction(async (tx) => {
      if (employeeCount > 0 && moveToDepartmentId) {
        await tx.employee.updateMany({
          where: { departmentId },
          data: { departmentId: moveToDepartmentId },
        });
      }
      await tx.department.delete({ where: { id: departmentId } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DEPARTMENT_DELETED",
          entityType: "Department",
          entityId: departmentId,
          summary:
            employeeCount > 0 && destinationName
              ? `Department "${department.name}" deleted — ${employeeCount} ${
                  employeeCount === 1 ? "employee" : "employees"
                } moved to ${destinationName}`
              : `Department "${department.name}" deleted`,
          before: {
            name: department.name,
            code: department.code,
            description: department.description,
            employeeCount,
          },
          after: { moveToDepartmentId: moveToDepartmentId ?? null },
          ip: await clientIp(),
        },
      });
    });

    target = `/departments?just=deleted&name=${encodeURIComponent(department.name)}`;
  } catch (error) {
    logActionError("deleteDepartment", error);
    return failure(
      "Unable to delete the department right now — new employees may have been added to it. Please try again."
    );
  }

  redirect(target!);
}

export async function bulkTransferEmployeesToDepartment(
  _prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to move employees.");
  }

  const values = formDataToRecord(formData);
  const base: DepartmentFormState = {
    ok: false,
    attempt: (_prevState.attempt ?? 0) + 1,
    values,
  };

  const parsed = bulkDepartmentTransferSchema.safeParse(values);
  if (!parsed.success) {
    return { ...base, errors: flattenFieldErrors(parsed.error) };
  }

  const employeeIds = [
    ...new Set(
      formData
        .getAll("employeeIds")
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ];
  if (employeeIds.length === 0) {
    return { ...base, error: "Select at least one employee." };
  }

  const { departmentId, redirectTo } = parsed.data;
  if (!/^\/(employees|departments\/[A-Za-z0-9_-]+)$/.test(redirectTo)) {
    return failure("Invalid redirect target.");
  }

  let target: string | null = null;
  try {
    const department = await db.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true },
    });
    if (!department) {
      return failure("The selected department no longer exists.");
    }

    const employees = await db.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        fullName: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    });
    if (employees.length === 0) {
      return failure("None of the selected employees exist any more.");
    }

    const toMove = employees.filter((e) => e.departmentId !== departmentId);
    if (toMove.length === 0) {
      return {
        ...base,
        error: `All selected employees are already in ${department.name}.`,
      };
    }

    const fromCounts = new Map<string, number>();
    for (const employee of toMove) {
      const from = employee.department.name;
      fromCounts.set(from, (fromCounts.get(from) ?? 0) + 1);
    }
    const fromSummary = [...fromCounts.entries()]
      .map(([name, count]) => `${count} from ${name}`)
      .join(", ");

    await db.$transaction(async (tx) => {
      for (const employee of toMove) {
        await tx.employee.update({
          where: { id: employee.id },
          data: { departmentId },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "EMPLOYEES_TRANSFERRED",
          entityType: "Employee",
          entityId: departmentId,
          summary: `${toMove.length} ${
            toMove.length === 1 ? "employee" : "employees"
          } moved to ${department.name} (${fromSummary})`,
          after: {
            departmentId,
            department: department.name,
            employeeIds: toMove.map((e) => e.id),
          },
          ip: await clientIp(),
        },
      });
    });

    target = `${redirectTo}?just=moved&count=${toMove.length}`;
  } catch (error) {
    logActionError("bulkTransferEmployeesToDepartment", error);
    return failure("Unable to move the employees right now. Please try again.");
  }

  redirect(target!);
}

/** Employee search for the "Move employees here" dialog (excludes current members). */
export async function searchMovableEmployeesAction(
  query: string,
  excludeDepartmentId?: string
) {
  const user = await getActionUser();
  if (!user) return [];
  return searchEmployees(
    query,
    10,
    excludeDepartmentId ? { excludeDepartmentId } : undefined
  );
}
