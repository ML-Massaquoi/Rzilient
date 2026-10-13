"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangleIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AssetStatus,
  AssetTransactionAction,
  MaintenanceStatus,
  MaintenanceType,
} from "@/generated/prisma/enums";
import type { ReportType } from "@/server/queries/reports";

const ANY = "any";

export function ReportFilters({
  type,
  categories,
  departments,
}: {
  type: ReportType;
  categories: { slug: string; name: string }[];
  departments: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const department = searchParams.get("department") ?? "";
  const maintType = searchParams.get("type__") ?? "";
  const action = searchParams.get("action") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const low = searchParams.get("low") === "1";

  const hasFilters = Boolean(
    q ||
      status ||
      category ||
      department ||
      maintType ||
      action ||
      from ||
      to ||
      low
  );

  function patch(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ANY) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function toggleLow() {
    const params = new URLSearchParams(searchParams.toString());
    if (low) params.delete("low");
    else params.set("low", "1");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of [
      "q",
      "status",
      "category",
      "department",
      "type__",
      "action",
      "from",
      "to",
      "low",
    ]) {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
          placeholder="Search…"
          className="h-9 pl-8"
          aria-label="Search report"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {type === "asset-inventory" || type === "missing-damaged" ? (
          <Select
            value={status || ANY}
            onValueChange={(value) => patch("status", value ?? ANY)}
          >
            <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any status</SelectItem>
              {Object.values(AssetStatus).map((value) => (
                <SelectItem key={value} value={value}>
                  {value
                    .toLowerCase()
                    .replace(/\b\w/g, (char) => char.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {type === "asset-inventory" ? (
          <Select
            value={category || ANY}
            onValueChange={(value) => patch("category", value ?? ANY)}
          >
            <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any category</SelectItem>
              {categories.map((value) => (
                <SelectItem key={value.slug} value={value.slug}>
                  {value.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {type === "custody" ? (
          <Select
            value={department || ANY}
            onValueChange={(value) => patch("department", value ?? ANY)}
          >
            <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any department</SelectItem>
              {departments.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {type === "maintenance" ? (
          <>
            <Select
              value={status || ANY}
              onValueChange={(value) => patch("status", value ?? ANY)}
            >
              <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any status</SelectItem>
                {Object.values(MaintenanceStatus).map((value) => (
                  <SelectItem key={value} value={value}>
                    {value
                      .toLowerCase()
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={maintType || ANY}
              onValueChange={(value) => patch("type__", value ?? ANY)}
            >
              <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any type</SelectItem>
                {Object.values(MaintenanceType).map((value) => (
                  <SelectItem key={value} value={value}>
                    {value
                      .toLowerCase()
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null}

        {type === "stock" ? (
          <Button
            type="button"
            variant={low ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={toggleLow}
            disabled={pending}
          >
            <AlertTriangleIcon />
            Low stock only
          </Button>
        ) : null}

        {type === "asset-history" ? (
          <>
            <Select
              value={action || ANY}
              onValueChange={(value) => patch("action", value ?? ANY)}
            >
              <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any action</SelectItem>
                {Object.values(AssetTransactionAction).map((value) => (
                  <SelectItem key={value} value={value}>
                    {value
                      .toLowerCase()
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
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
          </>
        ) : null}

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
