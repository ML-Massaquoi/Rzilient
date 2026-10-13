"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANY = "any";

type Option = { value: string; label: string };

export function EmployeeFilters({
  departments,
}: {
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const department = searchParams.get("department") ?? "";
  const status = searchParams.get("status") ?? "";
  const hasFilters = Boolean(q || department || status);

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

  const departmentOptions: Option[] = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-center")}>
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
          placeholder="Search name, FIA number, employee no, email…"
          className="h-9 pl-8"
          aria-label="Search employees"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={department || ANY}
          onValueChange={(value) => patch("department", value ?? ANY)}
        >
          <SelectTrigger
            className="h-9 w-[170px]"
            aria-label="Filter by department"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any department</SelectItem>
            {departmentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status || ANY}
          onValueChange={(value) => patch("status", value ?? ANY)}
        >
          <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
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
