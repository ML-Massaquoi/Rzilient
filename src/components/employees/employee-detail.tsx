import Link from "next/link";
import { LaptopIcon, UserRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/assets/status-badge";
import { EmploymentStatusBadge } from "@/components/employees/employee-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PhotoCaptureButton } from "@/components/attachments/photo-gallery";
import { cn } from "cn";
import { formatDate, formatRelative } from "@/lib/datetime";
import { CONDITION_LABELS } from "@/lib/labels";
import type { EmployeeDetail } from "@/server/queries/employees";

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn("text-sm", mono && "font-mono")}>
        {value || <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

export function EmployeeInfoCard({ employee }: { employee: EmployeeDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Contact &amp; identifiers</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <InfoRow label="FIA number" value={employee.fiaNumber} mono />
        <InfoRow label="Employee number" value={employee.employeeNo} mono />
        <InfoRow label="Email" value={employee.email} />
        <InfoRow label="Phone / dial" value={employee.phone} mono />
        <InfoRow label="Position" value={employee.position} />
        <InfoRow label="Unit / section" value={employee.unit} />
        <InfoRow label="Department" value={employee.department.name} />
        <InfoRow label="Location" value={employee.location?.name} />
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">Status</span>
          <div>
            <EmploymentStatusBadge status={employee.status} />
          </div>
        </div>
        {employee.notes ? (
          <div className="col-span-2 flex flex-col gap-0.5 sm:col-span-3">
            <span className="text-muted-foreground text-xs">Notes</span>
            <span className="text-sm">{employee.notes}</span>
          </div>
        ) : null}
        <div className="text-muted-foreground col-span-2 text-xs sm:col-span-3">
          Added {formatDate(employee.createdAt)}
          {employee.createdBy ? ` by ${employee.createdBy.name}` : ""}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmployeeHeader({
  employee,
  canWrite,
}: {
  employee: EmployeeDetail;
  canWrite: boolean;
}) {
  const photo = employee.attachments.find(
    (item) => item.kind === "EMPLOYEE_PHOTO"
  );

  return (
    <div className="flex min-w-0 items-start gap-4">
      <div className="relative shrink-0">
        {photo ? (
          <a
            href={`/api/files/${photo.id}`}
            target="_blank"
            rel="noreferrer"
            className="block"
            title="View photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${photo.id}`}
              alt={employee.fullName}
              className="border-border size-20 rounded-lg border object-cover sm:size-24"
            />
          </a>
        ) : (
          <div className="bg-muted border-border text-muted-foreground flex size-20 items-center justify-center rounded-lg border sm:size-24">
            <UserRoundIcon className="size-8" />
          </div>
        )}
        {canWrite ? (
          <PhotoCaptureButton
            entity="employee"
            entityId={employee.id}
            returnUrl={`/employees/${employee.id}`}
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <EmploymentStatusBadge status={employee.status} />
          <Badge variant="outline">{employee.department.name}</Badge>
          {employee.fiaNumber ? (
            <span className="text-muted-foreground font-mono text-sm">
              {employee.fiaNumber}
            </span>
          ) : null}
        </div>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
          {employee.fullName}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {[employee.position, employee.unit].filter(Boolean).join(" · ")}
          {employee.email ? ` · ${employee.email}` : ""}
        </p>
      </div>
    </div>
  );
}

export function CurrentAssets({ employee }: { employee: EmployeeDetail }) {
  const active = employee.assignments.filter((a) => a.status === "ACTIVE");

  if (active.length === 0) {
    return (
      <EmptyState
        icon={LaptopIcon}
        title="No assets checked out"
        description="When this employee is assigned devices, they will appear here with condition and expected return dates."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {active.map((assignment) => {
        const photo = assignment.asset.attachments[0];
        const brandModel = [assignment.asset.brand, assignment.asset.model]
          .filter(Boolean)
          .join(" · ");
        const overdue =
          assignment.expectedReturnAt != null &&
          new Date(assignment.expectedReturnAt) < new Date();
        return (
          <div
            key={assignment.id}
            className="bg-card flex flex-col gap-2.5 rounded-lg border p-4"
          >
            <div className="flex items-start gap-3">
              {photo ? (
                <a
                  href={`/api/files/${photo.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0"
                  title="View device photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${photo.id}`}
                    alt={assignment.asset.name}
                    className="border-border size-16 rounded-md border object-cover"
                  />
                </a>
              ) : (
                <div className="bg-muted border-border text-muted-foreground flex size-16 shrink-0 items-center justify-center rounded-md border">
                  <LaptopIcon className="size-6" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/assets/${assignment.asset.id}`}
                    className="rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {assignment.asset.name}
                  </Link>
                  {brandModel ? (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {brandModel}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                    {assignment.asset.assetTag}
                    {assignment.asset.serialNumber
                      ? ` · ${assignment.asset.serialNumber}`
                      : ""}
                  </p>
                </div>
                <StatusBadge status={assignment.asset.status} />
              </div>
            </div>

            {assignment.asset.description ? (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {assignment.asset.description}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                {CONDITION_LABELS[assignment.asset.condition]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {assignment.asset.category.name}
              </Badge>
              {assignment.accessoriesOut.length > 0 ? (
                <Badge variant="outline" className="text-xs">
                  {assignment.accessoriesOut.length} accessor
                  {assignment.accessoriesOut.length === 1 ? "y" : "ies"}
                </Badge>
              ) : null}
            </div>

            <div className="text-muted-foreground flex items-center justify-between gap-2 border-t pt-2 text-xs">
              <span>Out since {formatDate(assignment.assignedAt)}</span>
              {assignment.expectedReturnAt ? (
                <span
                  className={cn(overdue && "text-destructive font-medium")}
                >
                  {overdue ? "Overdue · " : "Due "}
                  {formatDate(assignment.expectedReturnAt)}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AssignmentHistory({ employee }: { employee: EmployeeDetail }) {
  if (employee.assignments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No assignment history yet.
      </p>
    );
  }

  return (
    <div className="border-border overflow-x-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border bg-muted/50 text-left">
            <th className="px-3 py-2 font-medium">Asset</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Checked out</th>
            <th className="px-3 py-2 font-medium">Returned</th>
            <th className="px-3 py-2 font-medium">By</th>
          </tr>
        </thead>
        <tbody>
          {employee.assignments.map((assignment) => (
            <tr key={assignment.id} className="border-border border-t">
              <td className="px-3 py-1.5">
                <Link
                  href={`/assets/${assignment.asset.id}`}
                  className="rounded-sm text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {assignment.asset.name}
                </Link>
                <span className="text-muted-foreground block font-mono text-xs">
                  {assignment.asset.assetTag}
                </span>
              </td>
              <td className="px-3 py-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    assignment.status === "ACTIVE"
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}
                >
                  {assignment.status === "ACTIVE"
                    ? "Checked out"
                    : assignment.status === "RETURNED"
                      ? "Returned"
                      : "Transferred"}
                </Badge>
              </td>
              <td className="text-muted-foreground px-3 py-1.5 whitespace-nowrap">
                {formatDate(assignment.assignedAt)}
                <span className="block text-xs">
                  {formatRelative(assignment.assignedAt)}
                </span>
              </td>
              <td className="text-muted-foreground px-3 py-1.5 whitespace-nowrap">
                {assignment.returnedAt ? formatDate(assignment.returnedAt) : "—"}
              </td>
              <td className="text-muted-foreground px-3 py-1.5 text-xs">
                {assignment.assignedBy?.name ?? "—"}
                {assignment.returnedBy && assignment.returnedAt
                  ? ` → ${assignment.returnedBy.name}`
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
