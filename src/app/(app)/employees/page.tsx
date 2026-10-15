import type { Metadata } from "next";
import Link from "next/link";
import { Building2Icon, UploadIcon, UsersIcon, PlusIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import {
  getEmployeeFilterOptions,
  listEmployees,
} from "@/server/queries/employees";
import { EmployeeFilters } from "@/components/employees/employee-filters";
import { EmployeeTable } from "@/components/employees/employee-table";
import { ListPagination } from "@/components/assets/list-pagination";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export const metadata: Metadata = {
  title: "Employee Directory",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const q = first(sp.q);
  const department = first(sp.department);
  const status = first(sp.status);
  const pageParam = Number(first(sp.page) ?? "1");

  const [result, options] = await Promise.all([
    listEmployees({
      q,
      department,
      status,
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
    getEmployeeFilterOptions(),
  ]);

  const canWrite = user.role !== "VIEWER";
  const hasFilters = Boolean(q || department || status);

  const activeParams = new URLSearchParams();
  if (q) activeParams.set("q", q);
  if (department) activeParams.set("department", department);
  if (status) activeParams.set("status", status);
  const search = activeParams.toString();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        icon={UsersIcon}
        title="Employee Directory"
        subtitle={
          result.total === 0
            ? "No employees in the directory yet"
            : `${result.total} employee${result.total === 1 ? "" : "s"}${
                hasFilters ? " matching the current filters" : ""
              }`
        }
        chips={[
          {
            label: "Employees",
            value: result.total,
            icon: UsersIcon,
          },
          {
            label: "Departments",
            value: options.departments.length,
            icon: Building2Icon,
          },
        ]}
        actions={
          canWrite ? (
            <>
              <Link
                href="/employees/import"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <UploadIcon />
                Import
              </Link>
              <Link href="/employees/new" className={cn(buttonVariants())}>
                <PlusIcon />
                New employee
              </Link>
            </>
          ) : null
        }
      />

      <EmployeeFilters departments={options.departments} />

      {result.items.length > 0 ? (
        <div className="flex flex-col gap-4">
          <EmployeeTable items={result.items} />
          <ListPagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            search={search}
            basePath="/employees"
            noun="employees"
          />
        </div>
      ) : hasFilters ? (
        <EmptyState
          icon={UsersIcon}
          title="No employees match these filters"
          description="Adjust the search or filters to widen the results."
        />
      ) : (
        <EmptyState
          icon={UsersIcon}
          title="The directory is empty"
          description={
            canWrite
              ? "Add employees one at a time, or import the existing department spreadsheets."
              : "Employees will appear here once the IT team adds them."
          }
        />
      )}
    </div>
  );
}
