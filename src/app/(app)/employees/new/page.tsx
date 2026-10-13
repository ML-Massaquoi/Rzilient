import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import { getEmployeeFilterOptions } from "@/server/queries/employees";
import { createEmployee } from "@/server/actions/employees";
import { EmployeeForm } from "@/components/employees/employee-form";

export const metadata: Metadata = {
  title: "Add Employee",
};

export default async function NewEmployeePage() {
  await requireRole("ADMIN", "IT_STAFF");

  const options = await getEmployeeFilterOptions();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/employees"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-3.5" />
          Employee directory
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Add employee
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a directory record. FIA number, employee number and email are
            optional, but must be unique when filled in.
          </p>
        </div>
      </div>

      <EmployeeForm
        action={createEmployee}
        mode="create"
        departments={options.departments}
        defaults={{ status: "ACTIVE" }}
        cancelHref="/employees"
      />
    </div>
  );
}
