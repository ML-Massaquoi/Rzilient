"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, Loader2Icon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/assets/status-badge";
import { visibleSections } from "@/components/layout/nav";
import type { Role } from "@/generated/prisma/enums";

type AssetHit = { id: string; assetTag: string; name: string; status: string };
type EmployeeHit = {
  id: string;
  fullName: string;
  fiaNumber: string | null;
  department: { name: string };
};

export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{
    q: string;
    assets: AssetHit[];
    employees: EmployeeHit[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmed = query.trim();
  const loading = trimmed.length >= 2 && data?.q !== trimmed;
  const assets = data?.q === trimmed ? data.assets : [];
  const employees = data?.q === trimmed ? data.employees : [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || trimmed.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => (res.ok ? res.json() : { assets: [], employees: [] }))
        .then((result) => {
          if (cancelled) return;
          setData({
            q: trimmed,
            assets: result.assets ?? [],
            employees: result.employees ?? [],
          });
        })
        .catch(() => {
          if (cancelled) return;
          setData({ q: trimmed, assets: [], employees: [] });
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, open]);

  const pages = visibleSections(role).flatMap((section) => section.items);
  const pageHits = trimmed
    ? pages.filter((item) =>
        item.title.toLowerCase().includes(trimmed.toLowerCase())
      )
    : pages.slice(0, 6);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent/60 hidden h-8 cursor-pointer items-center gap-2 rounded-lg border bg-transparent px-2.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
      >
        <SearchIcon className="size-3.5" />
        Search…
        <kbd className="bg-muted text-muted-foreground rounded border px-1 py-px font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="bg-accent/60 hover:bg-accent inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
      >
        <SearchIcon className="size-4" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery("");
            setData(null);
          }
        }}
      >
        <DialogContent className="top-[18%] left-1/2 max-w-lg translate-y-0 gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command loop shouldFilter={false} className="bg-transparent">
            <div className="border-border flex items-center gap-2 border-b px-3">
              <SearchIcon className="text-muted-foreground size-4 shrink-0" />
              <CommandInput
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Search assets, employees or pages…"
                className="h-11 flex-1 border-0 bg-transparent text-sm outline-none"
              />
              {loading ? (
                <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
              ) : null}
            </div>
            <CommandList className="max-h-80 p-2">
              <CommandEmpty>
                {query.trim().length < 2
                  ? "Type at least 2 characters to search."
                  : "No results found."}
              </CommandEmpty>

              {pageHits.length > 0 ? (
                <CommandGroup heading="Pages">
                  {pageHits.map((item) => (
                    <CommandItem
                      key={item.href}
                      value={`page-${item.href}`}
                      onSelect={() => go(item.href)}
                      className="cursor-pointer"
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {assets.length > 0 ? (
                <CommandGroup heading="Assets">
                  {assets.map((asset) => (
                    <CommandItem
                      key={asset.id}
                      value={`asset-${asset.id}`}
                      onSelect={() => go(`/assets/${asset.id}`)}
                      className="cursor-pointer"
                    >
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate text-sm">
                          <span className="font-mono text-xs">
                            {asset.assetTag}
                          </span>{" "}
                          {asset.name}
                        </span>
                        <StatusBadge status={asset.status as never} />
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {employees.length > 0 ? (
                <CommandGroup heading="Employees">
                  {employees.map((employee) => (
                    <CommandItem
                      key={employee.id}
                      value={`employee-${employee.id}`}
                      onSelect={() => go(`/employees/${employee.id}`)}
                      className="cursor-pointer"
                    >
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate text-sm">
                          {employee.fullName}
                          {employee.fiaNumber ? (
                            <span className="text-muted-foreground ml-1.5 font-mono text-xs">
                              {employee.fiaNumber}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {employee.department.name}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
