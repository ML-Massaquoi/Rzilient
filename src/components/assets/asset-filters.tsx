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
import { AssetCondition, AssetStatus } from "@/generated/prisma/enums";
import { CONDITION_LABELS, STATUS_LABELS } from "@/lib/labels";

const ANY = "any";

type Option = { value: string; label: string };

const STATUS_OPTIONS: Option[] = Object.values(AssetStatus).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

const CONDITION_OPTIONS: Option[] = Object.values(AssetCondition).map(
  (value) => ({ value, label: CONDITION_LABELS[value] })
);

export function AssetFilters({
  categories,
  brands = [],
  models = [],
}: {
  categories: { slug: string; name: string }[];
  brands?: string[];
  models?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const model = searchParams.get("model") ?? "";
  const hasFilters = Boolean(
    q || status || category || condition || brand || model
  );

  function patch(key: string, value: string, clear: string[] = []) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ANY) params.set(key, value);
    else params.delete(key);
    for (const stale of clear) params.delete(stale);
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

  const categoryOptions: Option[] = categories.map((c) => ({
    value: c.slug,
    label: c.name,
  }));

  // Keep the active selection visible even when it falls outside the
  // currently scoped option list (e.g. brand filtered down by a category).
  const brandOptions: string[] = brand && !brands.includes(brand)
    ? [brand, ...brands]
    : brands;
  const modelOptions: string[] = model && !models.includes(model)
    ? [model, ...models]
    : models;

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
          placeholder="Search tag, serial, name, brand, model…"
          className="h-9 pl-8"
          aria-label="Search assets"
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
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={category || ANY}
          onValueChange={(value) => patch("category", value ?? ANY, ["brand", "model"])}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any category</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={brand || ANY}
          onValueChange={(value) => patch("brand", value ?? ANY, ["model"])}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by brand">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any brand</SelectItem>
            {brandOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={model || ANY}
          onValueChange={(value) => patch("model", value ?? ANY)}
        >
          <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any model</SelectItem>
            {modelOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={condition || ANY}
          onValueChange={(value) => patch("condition", value ?? ANY)}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by condition">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any condition</SelectItem>
            {CONDITION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
