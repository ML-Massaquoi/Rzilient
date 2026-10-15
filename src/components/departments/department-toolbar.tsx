"use client";

import { ListFilterIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FILTER_LABELS: Record<string, string> = {
  all: "All departments",
  employees: "With employees",
  devices: "Devices checked out",
  empty: "No employees",
};

export function DepartmentToolbar({ q, filter }: { q?: string; filter?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <Input
        name="q"
        defaultValue={q ?? ""}
        placeholder="Search departments..."
        className="h-9 w-56"
        aria-label="Search departments"
      />
      <Select name="filter" defaultValue={filter ?? "all"}>
        <SelectTrigger className="h-9 w-44" aria-label="Filter departments">
          <ListFilterIcon className="text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(FILTER_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="outline" size="sm" className="h-9">
        <SearchIcon />
        Search
      </Button>
    </form>
  );
}
