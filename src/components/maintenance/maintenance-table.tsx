import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MaintenanceStatusBadge } from "@/components/maintenance/status-badge";
import { RecordActions } from "@/components/maintenance/record-actions";
import { MAINTENANCE_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/datetime";
import type { MaintenanceListItem } from "@/server/queries/maintenance";

export function MaintenanceTable({
  items,
  canWrite,
}: {
  items: MaintenanceListItem[];
  canWrite: boolean;
}) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Maintenance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Technician</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Reported</TableHead>
            <TableHead>Completed</TableHead>
            {canWrite ? <TableHead className="text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="min-w-[200px]">
                <Link
                  href={`/assets/${record.asset.id}`}
                  className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block text-sm font-medium hover:underline">
                    {record.asset.name}
                  </span>
                </Link>
                <span className="text-muted-foreground block text-xs font-mono">
                  {record.asset.assetTag}
                </span>
              </TableCell>
              <TableCell className="min-w-[220px]">
                <span className="block text-sm font-medium">{record.title}</span>
                <span className="text-muted-foreground block text-xs">
                  {MAINTENANCE_TYPE_LABELS[record.type]}
                  {record.technician ? ` · ${record.technician}` : ""}
                  {record.issue ? ` · ${record.issue}` : ""}
                </span>
              </TableCell>
              <TableCell>
                <MaintenanceStatusBadge status={record.status} />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {record.technician ?? "—"}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap tabular-nums">
                {record.cost != null ? `SLE ${record.cost.toString()}` : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDate(record.createdAt)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {record.completedAt ? formatDate(record.completedAt) : "—"}
              </TableCell>
              {canWrite ? (
                <TableCell>
                  <div className="flex justify-end">
                    <RecordActions
                      recordId={record.id}
                      status={record.status}
                      compact
                    />
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
