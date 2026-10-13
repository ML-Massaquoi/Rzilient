import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function EmployeeTable({ items }: { items: EmployeeListItem[] }) {
  return (
    <div className="border-border overflow-x-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>FIA number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned devices</TableHead>
            <TableHead>Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="min-w-[200px]">
                <Link
                  href={`/employees/${employee.id}`}
                  className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block text-sm font-medium hover:underline">
                    {employee.fullName}
                  </span>
                </Link>
                <span className="text-muted-foreground block text-xs">
                  {employee.employeeNo ? (
                    <span className="font-mono">{employee.employeeNo}</span>
                  ) : (
                    <span className="font-mono">—</span>
                  )}
                  {employee.email ? ` · ${employee.email}` : ""}
                </span>
              </TableCell>
              <TableCell className="min-w-[150px] text-sm">
                <span className="block">{employee.department.name}</span>
                <span className="text-muted-foreground block text-xs">
                  {employee.department.code}
                </span>
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {employee.position ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="font-mono text-sm whitespace-nowrap">
                {employee.fiaNumber ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <EmploymentStatusBadge status={employee.status} />
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {employee._count.assignments > 0 ? (
                  <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-xs font-semibold">
                    {employee._count.assignments}
                  </span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDate(employee.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
