import { AlertTriangleIcon, PackageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ItemDialog } from "@/components/inventory/item-dialog";
import { TransactDialog } from "@/components/inventory/transact-dialog";
import { tileClassForKey } from "@/components/layout/page-header";
import { isLowStock, type InventoryListItem } from "@/server/queries/inventory";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "cn";

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
    <div className="bg-card border-border rounded-xl border">
      <div className="border-border overflow-x-auto border-t">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-3.5 py-2.5 pl-4 text-left text-xs font-medium tracking-wide uppercase">
                Item
              </th>
              <th className="text-muted-foreground px-3.5 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                On hand
              </th>
              <th className="text-muted-foreground px-3.5 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                Minimum
              </th>
              <th className="text-muted-foreground px-3.5 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                Location
              </th>
              <th className="text-muted-foreground px-3.5 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
                Updated
              </th>
              {canWrite ? (
                <th className="text-muted-foreground w-40 px-3.5 py-2.5 pr-4 text-right text-xs font-medium tracking-wide uppercase">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const low = isLowStock(item);
              const tile = tileClassForKey(item.sku + item.name);
              return (
                <tr
                  key={item.id}
                  id={item.id}
                  className="border-border/70 group border-b last:border-b-0"
                >
                  <td className="px-3.5 py-2.5 pl-4 align-top">
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          tile
                        )}
                      >
                        <PackageIcon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{item.name}</span>
                        <span className="text-muted-foreground block text-xs">
                          <span className="font-mono">{item.sku}</span>
                          {item.category ? ` · ${item.category}` : ""}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 align-top whitespace-nowrap tabular-nums">
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
                  <td className="text-muted-foreground px-3.5 py-2.5 align-top whitespace-nowrap tabular-nums">
                    {item.minimumStock > 0 ? item.minimumStock : "—"}
                    {item.reorderLevel != null
                      ? ` · reorder ${item.reorderLevel}`
                      : ""}
                  </td>
                  <td className="text-muted-foreground px-3.5 py-2.5 align-top whitespace-nowrap">
                    {item.location?.name ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-3.5 py-2.5 align-top whitespace-nowrap">
                    {formatDateTime(item.updatedAt)}
                  </td>
                  {canWrite ? (
                    <td className="px-3.5 py-2.5 pr-4 align-top">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
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
    </div>
  );
}
