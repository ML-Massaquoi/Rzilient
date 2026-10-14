import type { Metadata } from "next";
import Link from "next/link";
import { Building2Icon, ChevronRightIcon, MapPinIcon } from "lucide-react";
import { listDepartmentsWithCounts } from "@/server/queries/employees";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Departments",
};

export default async function DepartmentsPage() {
  const [result, locations] = await Promise.all([
    listDepartmentsWithCounts(),
    db.location.count(),
  ]);

  const totalEmployees = result.departments.reduce(
    (sum, d) => sum + d.employeeCount,
    0
  );
  const totalCheckedOut = result.departments.reduce(
    (sum, d) => sum + d.checkedOutCount,
    0
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <Building2Icon className="size-5" />
            Departments
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {result.departments.length} departments · {totalEmployees} active{" "}
            {totalEmployees === 1 ? "employee" : "employees"} ·{" "}
            {totalCheckedOut} {totalCheckedOut === 1 ? "device" : "devices"}{" "}
            checked out
            {locations > 0 ? ` · ${locations} locations` : ""}
          </p>
        </div>
      </div>

      {result.departments.length === 0 ? (
        <EmptyState
          icon={Building2Icon}
          title="No departments yet"
          description="Departments are seeded from the FIA department codes, and new ones can be created during a directory import."
        />
      ) : (
        <div className="border-border overflow-x-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Active employees</TableHead>
                <TableHead>Devices checked out</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="min-w-[220px] text-sm font-medium">
                    <Link
                      href={`/departments/${department.id}`}
                      className="hover:text-primary inline-flex items-center gap-1 underline-offset-2 hover:underline"
                    >
                      {department.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {department.code ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {department.employeeCount}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {department.checkedOutCount > 0 ? (
                      <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-xs font-semibold">
                        {department.checkedOutCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[280px] text-xs">
                    {department.description ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/departments/${department.id}`}
                      aria-label={`Open ${department.name}`}
                      className="text-muted-foreground hover:text-primary block"
                    >
                      <ChevronRightIcon className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <MapPinIcon className="size-3.5" />
        Locations are managed with the department codes seed and appear on asset
        and employee records.
      </p>
    </div>
  );
}
