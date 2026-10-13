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
import { MaintenanceStatus, MaintenanceType } from "@/generated/prisma/enums";
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from "@/lib/labels";

const ANY = "any";

export function MaintenanceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";
  const hasFilters = Boolean(q || status || type);

  function patch(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ANY) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
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
          placeholder="Search title, asset tag, technician…"
          className="h-9 pl-8"
          aria-label="Search maintenance records"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
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
                {MAINTENANCE_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type || ANY}
          onValueChange={(value) => patch("type", value ?? ANY)}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any type</SelectItem>
            {Object.values(MaintenanceType).map((value) => (
              <SelectItem key={value} value={value}>
                {MAINTENANCE_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
