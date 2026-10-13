"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";
import {
  classifyEmployeeRows,
  normalizeDepartment,
  parseEmployeeFile,
  type ClassifiedImportRow,
} from "@/lib/import/employees";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().max(max).optional()
  );

const employeeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  middleName: optionalText(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  departmentId: z.string().min(1, "Department is required"),
  fiaNumber: optionalText(40),
  employeeNo: optionalText(40),
  position: optionalText(120),
  unit: optionalText(120),
  email: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.email("Enter a valid email address").optional()
  ),
  phone: optionalText(40),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: optionalText(2000),
});

export type EmployeeFormState = {
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

function composeFullName(first: string, middle: string | undefined, last: string): string {
  return [first, middle, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function fieldFailure(
  field: string,
  message: string,
  prev: EmployeeFormState
): EmployeeFormState {
  return {
    ok: false,
    attempt: (prev.attempt ?? 0) + 1,
    errors: { [field]: [message] },
    values: prev.values,
  };
}

async function checkUniqueness(
  data: z.infer<typeof employeeSchema>,
  excludeId?: string
): Promise<{ field: string; message: string } | null> {
  const notId = excludeId ? { NOT: { id: excludeId } } : undefined;
  const [fia, empNo, email] = await Promise.all([
    data.fiaNumber
      ? db.employee.findFirst({ where: { fiaNumber: data.fiaNumber, ...notId }, select: { id: true } })
      : Promise.resolve(null),
    data.employeeNo
      ? db.employee.findFirst({ where: { employeeNo: data.employeeNo, ...notId }, select: { id: true } })
      : Promise.resolve(null),
    data.email
      ? db.employee.findFirst({
          where: { email: { equals: data.email, mode: "insensitive" }, ...notId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (fia) return { field: "fiaNumber", message: "This FIA number is already used by another employee." };
  if (empNo) return { field: "employeeNo", message: "This employee number is already in use." };
  if (email) return { field: "email", message: "This email address is already in use." };
  return null;
}

export async function createEmployee(
  _prev: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) return failure("You do not have permission to add employees.");

  const values = formDataToRecord(formData);
  const base: EmployeeFormState = {
    ok: false,
    attempt: (_prev.attempt ?? 0) + 1,
    values,
  };

  const parsed = employeeSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ...base,
      errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  let target: string | null = null;
  try {
    const data = parsed.data;
    const department = await db.department.findUnique({
      where: { id: data.departmentId },
      select: { id: true },
    });
    if (!department) {
      return fieldFailure("departmentId", "Selected department no longer exists.", base);
    }
    const conflict = await checkUniqueness(data);
    if (conflict) return fieldFailure(conflict.field, conflict.message, base);

    const fullName = composeFullName(data.firstName, data.middleName, data.lastName);
    const created = await db.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          fullName,
          firstName: data.firstName,
          middleName: data.middleName ?? null,
          lastName: data.lastName,
          departmentId: data.departmentId,
          fiaNumber: data.fiaNumber ?? null,
          employeeNo: data.employeeNo ?? null,
          position: data.position ?? null,
          unit: data.unit ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          status: data.status,
          notes: data.notes ?? null,
          createdById: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "EMPLOYEE_CREATED",
          entityType: "Employee",
          entityId: employee.id,
          summary: `${employee.fullName} added to the directory`,
          after: { fullName, departmentId: data.departmentId },
          ip: await clientIp(),
        },
      });
      return employee;
    });

    target = `/employees/${created.id}`;
  } catch (error) {
    logActionError("createEmployee", error);
    return failure("Unable to save the employee right now. Please try again.");
  }
  redirect(target);
}

export async function updateEmployee(
  _prev: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) return failure("You do not have permission to edit employees.");

  const values = formDataToRecord(formData);
  const employeeId = values.id;
  if (!employeeId) return failure("Missing employee reference.");

  const base: EmployeeFormState = {
    ok: false,
    attempt: (_prev.attempt ?? 0) + 1,
    values,
  };

  const parsed = employeeSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ...base,
      errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  let target: string | null = null;
  try {
    const current = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, fullName: true },
    });
    if (!current) return failure("This employee no longer exists.");

    const data = parsed.data;
    const department = await db.department.findUnique({
      where: { id: data.departmentId },
      select: { id: true },
    });
    if (!department) {
      return fieldFailure("departmentId", "Selected department no longer exists.", base);
    }
    const conflict = await checkUniqueness(data, employeeId);
    if (conflict) return fieldFailure(conflict.field, conflict.message, base);

    const fullName = composeFullName(data.firstName, data.middleName, data.lastName);

    target = `/employees/${employeeId}`;
    await db.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          fullName,
          firstName: data.firstName,
          middleName: data.middleName ?? null,
          lastName: data.lastName,
          departmentId: data.departmentId,
          fiaNumber: data.fiaNumber ?? null,
          employeeNo: data.employeeNo ?? null,
          position: data.position ?? null,
          unit: data.unit ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          status: data.status,
          notes: data.notes ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "EMPLOYEE_UPDATED",
          entityType: "Employee",
          entityId: employeeId,
          summary: `${fullName} updated`,
          before: { fullName: current.fullName },
          after: { fullName },
          ip: await clientIp(),
        },
      });
    });
  } catch (error) {
    logActionError("updateEmployee", error);
    return failure("Unable to save your changes right now. Please try again.");
  }
  redirect(target);
}

// ---------------------------------------------------------------------------
// Directory import (upload → preview → confirm)
// ---------------------------------------------------------------------------

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_DISPLAY_ROWS = 400;

export type EmployeeImportState = {
  ok: boolean;
  attempt?: number;
  error?: string;
  result?: {
    created: number;
    updated: number;
    departmentsCreated: number;
    ignored: number;
    fileName: string;
  };
  preview?: {
    fileName: string;
    payload: string;
    summary: {
      total: number;
      new: number;
      update: number;
      duplicate: number;
      invalid: number;
      skipped: number;
    };
    departmentsToCreate: string[];
    rows: ClassifiedImportRow[];
    totalRows: number;
  };
};

type SerializedImport = {
  fileName: string;
  rows: ClassifiedImportRow[];
  departmentsToCreate: string[];
};

export async function prepareEmployeeImport(
  _prev: EmployeeImportState,
  formData: FormData
): Promise<EmployeeImportState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) return { ok: false, error: "You do not have permission to import employees." };

  const attempt = (_prev.attempt ?? 0) + 1;
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, attempt, error: "Choose an Excel or CSV file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, attempt, error: "File is too large. The limit is 5 MB." };
  }
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return { ok: false, attempt, error: "Unsupported file type. Use .xlsx, .xls or .csv." };
  }

  try {
    const buffer = await file.arrayBuffer();
    const { rows: parsed } = await parseEmployeeFile(file.name, buffer);
    if (parsed.length === 0) {
      return { ok: false, attempt, error: "No employee rows were found in this file." };
    }
    if (parsed.length > MAX_ROWS) {
      return {
        ok: false,
        attempt,
        error: `This file has ${parsed.length} rows. The limit is ${MAX_ROWS}.`,
      };
    }

    const [existing, departments] = await Promise.all([
      db.employee.findMany({
        select: {
          id: true,
          fullName: true,
          phone: true,
          position: true,
          unit: true,
          email: true,
          fiaNumber: true,
          employeeNo: true,
          department: { select: { name: true } },
        },
      }),
      db.department.findMany({ select: { id: true, name: true } }),
    ]);

    const preview = classifyEmployeeRows(
      file.name,
      parsed,
      existing.map((employee) => ({
        id: employee.id,
        fullName: employee.fullName,
        departmentName: employee.department.name,
        phone: employee.phone,
        position: employee.position,
        unit: employee.unit,
        email: employee.email,
        fiaNumber: employee.fiaNumber,
        employeeNo: employee.employeeNo,
      })),
      departments
    );

    const payloadObj: SerializedImport = {
      fileName: preview.fileName,
      rows: preview.rows,
      departmentsToCreate: preview.departmentsToCreate,
    };

    return {
      ok: true,
      attempt,
      preview: {
        fileName: preview.fileName,
        payload: JSON.stringify(payloadObj),
        summary: preview.summary,
        departmentsToCreate: preview.departmentsToCreate,
        rows: preview.rows.slice(0, MAX_DISPLAY_ROWS),
        totalRows: preview.rows.length,
      },
    };
  } catch (error) {
    logActionError("prepareEmployeeImport", error);
    return {
      ok: false,
      attempt,
      error:
        error instanceof Error && error.message.includes("header")
          ? error.message
          : "Could not read this file. Check that it is a valid Excel/CSV export.",
    };
  }
}

export async function confirmEmployeeImport(
  _prev: EmployeeImportState,
  formData: FormData
): Promise<EmployeeImportState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) return { ok: false, error: "You do not have permission to import employees." };

  const attempt = (_prev.attempt ?? 0) + 1;
  const raw = formData.get("payload");
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, attempt, error: "Import preview is missing. Upload the file again." };
  }

  let payload: SerializedImport;
  try {
    payload = JSON.parse(raw) as SerializedImport;
  } catch {
    return { ok: false, attempt, error: "Import preview is corrupted. Upload the file again." };
  }

  if (!Array.isArray(payload.rows) || payload.rows.length > MAX_ROWS) {
    return { ok: false, attempt, error: "Import payload is invalid. Upload the file again." };
  }

  try {
    let created = 0;
    let updated = 0;
    let ignored = 0;
    let departmentsCreated = 0;

    await db.$transaction(async (tx) => {
      const departmentIdByName = new Map<string, string>();
      for (const department of await tx.department.findMany({ select: { id: true, name: true } })) {
        departmentIdByName.set(normalizeDepartment(department.name), department.id);
      }

      for (const deptName of payload.departmentsToCreate ?? []) {
        if (typeof deptName !== "string" || !deptName.trim()) continue;
        const key = normalizeDepartment(deptName);
        if (departmentIdByName.has(key)) continue;
        const createdDept = await tx.department.create({
          data: { name: deptName.trim().slice(0, 120) },
        });
        departmentIdByName.set(key, createdDept.id);
        departmentsCreated += 1;
      }

      for (const row of payload.rows) {
        if (!row || typeof row !== "object") continue;
        const employee = row.employee;
        if (!employee || typeof employee.fullName !== "string") continue;
        const fullName = employee.fullName.trim().slice(0, 160);
        if (!fullName) continue;

        if (row.kind === "new") {
          const deptKey = employee.department
            ? normalizeDepartment(employee.department)
            : "";
          const departmentId = deptKey
            ? departmentIdByName.get(deptKey)
            : undefined;
          if (!departmentId) continue; // row without a resolvable department

          await tx.employee.create({
            data: {
              fullName,
              firstName: (employee.firstName ?? fullName.split(" ")[0]).slice(0, 80),
              middleName: employee.middleName?.slice(0, 80) ?? null,
              lastName: (employee.lastName ?? fullName.split(" ").slice(-1)[0]).slice(0, 80),
              departmentId,
              fiaNumber: employee.fiaNumber?.slice(0, 40) ?? null,
              employeeNo: employee.employeeNo?.slice(0, 40) ?? null,
              position: employee.position?.slice(0, 120) ?? null,
              unit: employee.unit?.slice(0, 120) ?? null,
              email: employee.email?.slice(0, 200) ?? null,
              phone: employee.phone?.slice(0, 40) ?? null,
              status: "ACTIVE",
              createdById: user.id,
            },
          });
          created += 1;
        } else if (row.kind === "update" && row.existingId) {
          const existing = await tx.employee.findUnique({
            where: { id: row.existingId },
            select: {
              id: true,
              departmentId: true,
              phone: true,
              position: true,
              unit: true,
              email: true,
              fiaNumber: true,
              employeeNo: true,
            },
          });
          if (!existing) {
            ignored += 1;
            continue;
          }

          const deptKey = employee.department
            ? normalizeDepartment(employee.department)
            : "";
          const departmentId = deptKey
            ? departmentIdByName.get(deptKey)
            : undefined;

          await tx.employee.update({
            where: { id: existing.id },
            data: {
              ...(departmentId && departmentId !== existing.departmentId
                ? { departmentId }
                : {}),
              ...(employee.phone && employee.phone !== existing.phone
                ? { phone: employee.phone.slice(0, 40) }
                : {}),
              ...(employee.position && employee.position !== existing.position
                ? { position: employee.position.slice(0, 120) }
                : {}),
              ...(employee.unit && employee.unit !== existing.unit
                ? { unit: employee.unit.slice(0, 120) }
                : {}),
              ...(employee.email &&
                employee.email.toLowerCase() !== (existing.email ?? "").toLowerCase()
                ? { email: employee.email.slice(0, 200) }
                : {}),
              ...(employee.fiaNumber && !existing.fiaNumber
                ? { fiaNumber: employee.fiaNumber.slice(0, 40) }
                : {}),
              ...(employee.employeeNo && !existing.employeeNo
                ? { employeeNo: employee.employeeNo.slice(0, 40) }
                : {}),
            },
          });
          updated += 1;
        } else {
          ignored += 1;
        }
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "EMPLOYEES_IMPORTED",
          entityType: "Employee",
          entityId: null,
          summary: `Directory import from ${payload.fileName}: ${created} added, ${updated} updated`,
          after: { created, updated, departmentsCreated, fileName: payload.fileName },
          ip: await clientIp(),
        },
      });
    });

    return {
      ok: true,
      attempt,
      result: { created, updated, departmentsCreated, ignored, fileName: payload.fileName },
    };
  } catch (error) {
    logActionError("confirmEmployeeImport", error);
    return { ok: false, attempt, error: "Import failed. Nothing was partially committed — please try again." };
  }
}
