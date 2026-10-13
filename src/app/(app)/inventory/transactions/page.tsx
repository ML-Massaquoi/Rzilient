import type { Metadata } from "next";
import { HistoryIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listStockTransactions, listStockUsers } from "@/server/queries/inventory";
import { TransactionFilters } from "@/components/inventory/tx-filters";
import { TransactionsTable } from "@/components/inventory/transactions-table";
import { ListPagination } from "@/components/assets/list-pagination";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Stock Transactions",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StockTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireUser();
  const sp = await searchParams;

  const q = first(sp.q);
  const type = first(sp.type);
  const userId = first(sp.user);
  const from = first(sp.from);
  const to = first(sp.to);
  const pageParam = Number(first(sp.page) ?? "1");

  const [result, users] = await Promise.all([
    listStockTransactions({
      q,
      type,
      userId,
      from,
      to,
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
    listStockUsers(),
  ]);

  const hasFilters = Boolean(q || type || userId || from || to);

  const activeParams = new URLSearchParams();
  if (q) activeParams.set("q", q);
  if (type) activeParams.set("type", type);
  if (userId) activeParams.set("user", userId);
  if (from) activeParams.set("from", from);
  if (to) activeParams.set("to", to);
  const search = activeParams.toString();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Stock Transactions
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every receive, issue, adjustment, damage and loss — immutable and
          ordered newest first.
        </p>
      </div>

      <TransactionFilters users={users} />

      {result.items.length > 0 ? (
        <div className="flex flex-col gap-4">
          <TransactionsTable items={result.items} />
          <ListPagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            search={search}
            basePath="/inventory/transactions"
            noun="transactions"
          />
        </div>
      ) : hasFilters ? (
        <EmptyState
          icon={HistoryIcon}
          title="No transactions match these filters"
          description="Adjust the search or filters to widen the results."
        />
      ) : (
        <EmptyState
          icon={HistoryIcon}
          title="No stock transactions yet"
          description="Record a movement from the Stock page — every quantity change is tracked here."
        />
      )}
    </div>
  );
}
