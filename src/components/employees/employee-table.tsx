import Link from "next/link";
import { ChevronRightIcon, UserRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tileClassForKey } from "@/components/layout/page-header";
import { cn } from "cn";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/datetime";
import type { EmployeeListItem } from "@/server/queries/employees";

export function EmploymentStatusBadge({
  status,
}: {
  status: EmployeeListItem["status"];
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        status === "ACTIVE"
          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground"
      )}
    >
      {EMPLOYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function EmployeeTable({ items }: { items: EmployeeListItem[] }) {
  return (
    <div className="bg-card border-border rounded-xl border">
      <div className="border-border border-t px-2 py-1">
        <Table className="[&_td]:px-3.5 [&_th]:px-3.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>FIA number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned devices</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((employee) => {
              const tile = tileClassForKey(employee.id + employee.fullName);
              return (
                <TableRow key={employee.id} className="group">
                  <TableCell className="min-w-[200px]">
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                          tile
                        )}
                      >
                        {initials(employee.fullName) || (
                          <UserRoundIcon className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={`/employees/${employee.id}`}
                          className="hover:text-primary block text-sm font-medium underline-offset-2 hover:underline"
                        >
                          {employee.fullName}
                        </Link>
                        <span className="text-muted-foreground block truncate text-xs">
                          {employee.employeeNo ? (
                            <span className="font-mono">{employee.employeeNo}</span>
                          ) : (
                            <span className="font-mono">—</span>
                          )}
                          {employee.email ? ` · ${employee.email}` : ""}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[150px] text-sm">
                    <span className="block">{employee.department.name}</span>
                    {employee.department.code ? (
                      <Badge
                        variant="secondary"
                        className="mt-0.5 font-mono text-[10px]"
                      >
                        {employee.department.code}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {employee.position ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {employee.fiaNumber ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <EmploymentStatusBadge status={employee.status} />
                  </TableCell>
                  <TableCell>
                    {employee._count.assignments > 0 ? (
                      <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
                        {employee._count.assignments}
                      </span>
                    ) : (
                      <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
                        0
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDate(employee.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/employees/${employee.id}`}
                      aria-label={`Open ${employee.fullName}`}
                      className="text-muted-foreground hover:text-primary block"
                    >
                      <ChevronRightIcon className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
