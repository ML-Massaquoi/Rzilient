import Link from "next/link";
import { WrenchIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tileClassForKey } from "@/components/layout/page-header";
import { MaintenanceStatusBadge } from "@/components/maintenance/status-badge";
import { MaintenanceDocuments } from "@/components/attachments/maintenance-documents";
import { RecordActions } from "@/components/maintenance/record-actions";
import { MAINTENANCE_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/datetime";
import type { MaintenanceListItem } from "@/server/queries/maintenance";
import { cn } from "cn";

export function MaintenanceTable({
  items,
  canWrite,
}: {
  items: MaintenanceListItem[];
  canWrite: boolean;
}) {
  return (
    <div className="bg-card border-border rounded-xl border">
      <div className="border-border border-t px-2 py-1">
        <Table className="[&_td]:px-3.5 [&_th]:px-3.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Asset</TableHead>
              <TableHead>Maintenance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Completed</TableHead>
              {canWrite ? (
                <TableHead className="w-24 text-right">Actions</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((record) => {
              const tile = tileClassForKey(record.type);
              return (
                <TableRow key={record.id} className="group">
                  <TableCell className="min-w-[200px]">
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          tile
                        )}
                      >
                        <WrenchIcon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={`/assets/${record.asset.id}`}
                          className="hover:text-primary block text-sm font-medium underline-offset-2 hover:underline"
                        >
                          {record.asset.name}
                        </Link>
                        <span className="text-muted-foreground block text-xs font-mono">
                          {record.asset.assetTag}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <span className="block text-sm font-medium">{record.title}</span>
                    <span className="text-muted-foreground block text-xs">
                      {MAINTENANCE_TYPE_LABELS[record.type]}
                      {record.technician ? ` · ${record.technician}` : ""}
                      {record.issue ? ` · ${record.issue}` : ""}
                    </span>
                    <span className="mt-1.5 block">
                      <MaintenanceDocuments
                        recordId={record.id}
                        recordTitle={record.title}
                        assetMeta={{
                          brand: record.asset.brand,
                          model: record.asset.model,
                          serialNumber: record.asset.serialNumber,
                        }}
                        documents={record.attachments}
                        canWrite={canWrite}
                        returnUrl={`/maintenance?q=${encodeURIComponent(record.asset.assetTag)}`}
                        triggerOnly
                      />
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
                      <div className="flex justify-end opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <RecordActions
                          recordId={record.id}
                          status={record.status}
                          compact
                        />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
