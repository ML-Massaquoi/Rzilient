import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { StockTransactionType } from "@/generated/prisma/enums";
import { STOCK_TX_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/datetime";
import type { StockTxListItem } from "@/server/queries/inventory";

const TX_STYLES: Record<StockTransactionType, string> = {
  RECEIVED: "bg-status-available/15 text-status-available",
  RETURNED: "bg-status-available/15 text-status-available",
  ISSUED: "bg-status-checked-out/15 text-status-checked-out",
  ADJUSTED: "bg-status-maintenance/15 text-status-maintenance",
  DAMAGED: "bg-destructive/10 text-destructive",
  LOST: "bg-destructive/10 text-destructive",
};

export function TransactionsTable({ items }: { items: StockTxListItem[] }) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b">
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              When
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              Item
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              Type
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-right text-xs font-medium tracking-wide uppercase">
              Change
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-right text-xs font-medium tracking-wide uppercase">
              After
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              By
            </th>
            <th className="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase">
              Reference / Notes
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => (
            <tr
              key={tx.id}
              id={tx.id}
              className="border-border/70 border-b last:border-b-0"
            >
              <td className="text-muted-foreground px-3 py-2.5 align-top whitespace-nowrap">
                {formatDateTime(tx.createdAt)}
              </td>
              <td className="px-3 py-2.5 align-top">
                <Link
                  href={`/inventory/stock?q=${encodeURIComponent(tx.item.sku)}`}
                  className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {tx.item.name}
                </Link>
                <span className="text-muted-foreground block text-xs font-mono">
                  {tx.item.sku}
                </span>
              </td>
              <td className="px-3 py-2.5 align-top">
                <Badge variant="outline" className={TX_STYLES[tx.type]}>
                  {STOCK_TX_LABELS[tx.type]}
                </Badge>
              </td>
              <td
                className={`px-3 py-2.5 text-right align-top whitespace-nowrap font-medium tabular-nums ${
                  tx.quantityChange > 0
                    ? "text-status-available"
                    : "text-destructive"
                }`}
              >
                {tx.quantityChange > 0 ? "+" : ""}
                {tx.quantityChange}
              </td>
              <td className="px-3 py-2.5 text-right align-top whitespace-nowrap tabular-nums">
                {tx.quantityAfter}
              </td>
              <td className="text-muted-foreground px-3 py-2.5 align-top whitespace-nowrap">
                {tx.performedBy.name}
              </td>
              <td className="text-muted-foreground min-w-[180px] px-3 py-2.5 align-top text-xs">
                {[tx.reference, tx.notes].filter(Boolean).join(" · ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
