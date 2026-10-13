import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, isPast } from "@/lib/datetime";
import type { ActiveAssignmentItem } from "@/server/queries/custody";

export function AssignmentList({
  items,
  mode,
  selectedId,
}: {
  items: ActiveAssignmentItem[];
  mode: "return" | "transfer";
  selectedId?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ArrowRightIcon}
        title="No active check-outs"
        description="Assets checked out to employees will appear here."
      />
    );
  }

  const actionLabel = mode === "return" ? "Return" : "Transfer";

  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-4 py-2.5 font-medium">Asset</th>
            <th className="px-4 py-2.5 font-medium">Custodian</th>
            <th className="px-4 py-2.5 font-medium">Checked out</th>
            <th className="px-4 py-2.5 font-medium">Expected return</th>
            <th className="px-4 py-2.5 font-medium">Accessories</th>
            <th className="px-4 py-2.5 font-medium">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const overdue =
              item.expectedReturnAt && isPast(item.expectedReturnAt);
            const selected = selectedId === item.id;
            return (
              <tr
                key={item.id}
                className={`border-border border-t ${selected ? "bg-muted/40" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/assets/${item.asset.id}`}
                    className="hover:text-primary font-mono text-xs"
                  >
                    {item.asset.assetTag}
                  </Link>
                  <p className="text-sm font-medium">{item.asset.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.asset.category.name}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-sm font-medium">
                    {item.employee.fullName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {item.employee.department.name}
                    {item.employee.fiaNumber
                      ? ` · ${item.employee.fiaNumber}`
                      : ""}
                  </p>
                </td>
                <td className="text-muted-foreground px-4 py-2.5 text-xs">
                  {formatDate(item.assignedAt)}
                  <p className="mt-0.5">by {item.assignedBy.name}</p>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {item.expectedReturnAt ? (
                    overdue ? (
                      <Badge
                        variant="outline"
                        className="border-destructive/40 text-destructive"
                      >
                        Overdue · {formatDate(item.expectedReturnAt)}
                      </Badge>
                    ) : (
                      formatDate(item.expectedReturnAt)
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="text-muted-foreground px-4 py-2.5 text-xs">
                  {item.accessoriesOut.length > 0
                    ? item.accessoriesOut.join(", ")
                    : "None"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/operations/${mode === "return" ? "returns" : "transfers"}?assignment=${item.id}`}
                    className={`hover:text-primary inline-flex items-center gap-1 text-sm font-medium ${
                      selected ? "text-primary" : ""
                    }`}
                  >
                    {actionLabel}
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
