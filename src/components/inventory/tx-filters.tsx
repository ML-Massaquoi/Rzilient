"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockTransactionType } from "@/generated/prisma/enums";
import { STOCK_TX_LABELS } from "@/lib/labels";

const ANY = "any";

export function TransactionFilters({
  users,
}: {
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "";
  const userId = searchParams.get("user") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const hasFilters = Boolean(q || type || userId || from || to);

  function apply(next: URLSearchParams) {
    next.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  function patch(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ANY) params.set(key, value);
    else params.delete(key);
    apply(params);
  }

  function clearAll() {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <form
        className="relative flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          patch("q", String(formData.get("q") ?? "").trim());
        }}
      >
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search item, SKU or reference…"
          className="h-9 pl-8"
          aria-label="Search stock transactions"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={type || ANY}
          onValueChange={(value) => patch("type", value ?? ANY)}
        >
          <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any type</SelectItem>
            {Object.values(StockTransactionType).map((value) => (
              <SelectItem key={value} value={value}>
                {STOCK_TX_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={userId || ANY}
          onValueChange={(value) => patch("user", value ?? ANY)}
        >
          <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by user">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any user</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          defaultValue={from}
          aria-label="From date"
          className="h-9 w-[150px]"
          onChange={(event) => patch("from", event.target.value)}
        />
        <Input
          type="date"
          defaultValue={to}
          aria-label="To date"
          className="h-9 w-[150px]"
          onChange={(event) => patch("to", event.target.value)}
        />

        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={pending}
          >
            <XIcon />
            Clear
          </Button>
        ) : null}

        {pending ? (
          <span className="text-muted-foreground text-xs" aria-live="polite">
            Updating…
          </span>
        ) : null}
      </div>
    </div>
  );
}
