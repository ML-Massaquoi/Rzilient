import { AlertTriangleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ItemDialog } from "@/components/inventory/item-dialog";
import { TransactDialog } from "@/components/inventory/transact-dialog";
import { isLowStock, type InventoryListItem } from "@/server/queries/inventory";
import { formatDateTime } from "@/lib/datetime";

export function StockTable({
  items,
  canWrite,
  categories,
  locations,
}: {
  items: InventoryListItem[];
  canWrite: boolean;
  categories: string[];
  locations: { id: string; name: string }[];
}) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b">
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              Item
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              On hand
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              Minimum
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              Location
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              Updated
            </th>
            {canWrite ? (
              <th className="text-muted-foreground px-3 py-2.5 text-right text-xs font-medium tracking-wide uppercase">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const low = isLowStock(item);
            return (
              <tr
                key={item.id}
                id={item.id}
                className="border-border/70 border-b last:border-b-0"
              >
                <td className="px-3 py-2.5 align-top">
                  <span className="block font-medium">{item.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    <span className="font-mono">{item.sku}</span>
                    {item.category ? ` · ${item.category}` : ""}
                  </span>
                </td>
                <td className="px-3 py-2.5 align-top whitespace-nowrap tabular-nums">
                  <span className="font-medium">
                    {item.quantity} {item.unit}
                  </span>
                  {low ? (
                    <Badge
                      variant="outline"
                      className="ml-2 bg-status-maintenance/15 text-status-maintenance"
                    >
                      <AlertTriangleIcon className="size-3" />
                      Low stock
                    </Badge>
                  ) : null}
                </td>
                <td className="text-muted-foreground px-3 py-2.5 align-top whitespace-nowrap tabular-nums">
                  {item.minimumStock > 0 ? item.minimumStock : "—"}
                  {item.reorderLevel != null
                    ? ` · reorder ${item.reorderLevel}`
                    : ""}
                </td>
                <td className="text-muted-foreground px-3 py-2.5 align-top whitespace-nowrap">
                  {item.location?.name ?? "—"}
                </td>
                <td className="text-muted-foreground px-3 py-2.5 align-top whitespace-nowrap">
                  {formatDateTime(item.updatedAt)}
                </td>
                {canWrite ? (
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-center justify-end gap-2">
                      <TransactDialog item={item} />
                      <ItemDialog
                        mode="edit"
                        item={item}
                        categories={categories}
                        locations={locations}
                      />
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
