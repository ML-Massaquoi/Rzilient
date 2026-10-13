import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import { getEmployeeDetail, getEmployeeFilterOptions } from "@/server/queries/employees";
import { updateEmployee } from "@/server/actions/employees";
import { EmployeeForm } from "@/components/employees/employee-form";

export const metadata: Metadata = {
  title: "Edit Employee",
};

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "IT_STAFF");

  const { id } = await params;
  const [employee, options] = await Promise.all([
    getEmployeeDetail(id),
    getEmployeeFilterOptions(),
  ]);
  if (!employee) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href={`/employees/${employee.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-3.5" />
          {employee.fullName}
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Edit employee
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Directory changes are recorded in the audit log.
          </p>
        </div>
      </div>

      <EmployeeForm
        action={updateEmployee}
        mode="edit"
        employeeId={employee.id}
        departments={options.departments}
        defaults={{
          firstName: employee.firstName,
          middleName: employee.middleName ?? "",
          lastName: employee.lastName,
          departmentId: employee.departmentId,
          fiaNumber: employee.fiaNumber ?? "",
          employeeNo: employee.employeeNo ?? "",
          position: employee.position ?? "",
          unit: employee.unit ?? "",
          email: employee.email ?? "",
          phone: employee.phone ?? "",
          status: employee.status,
          notes: employee.notes ?? "",
        }}
        cancelHref={`/employees/${employee.id}`}
      />
    </div>
  );
}
