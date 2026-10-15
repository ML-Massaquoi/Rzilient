import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpDownIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  DownloadIcon,
  HotelIcon,
  LandmarkIcon,
  LayoutGridIcon,
  MapPinIcon,
  PlaneIcon,
  RadioTowerIcon,
  ServerIcon,
  SmartphoneIcon,
  StoreIcon,
  UsersIcon,
  UtensilsCrossedIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/server/auth";
import {
  applyDepartmentFilter,
  listDepartmentsWithCounts,
} from "@/server/queries/employees";
import { db } from "@/lib/db";
import {
  DepartmentDialog,
  DepartmentRowActions,
} from "@/components/departments/department-dialog";
import { DepartmentToolbar } from "@/components/departments/department-toolbar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SweetAlert } from "@/components/sweet-alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";

export const metadata: Metadata = {
  title: "Departments",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const PAGE_SIZE = 15;
const SORT_KEYS = ["name", "code", "employees", "devices"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const TILE_STYLES: { icon: LucideIcon; className: string }[] = [
  { icon: Building2Icon, className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  { icon: UsersIcon, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { icon: LandmarkIcon, className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  { icon: PlaneIcon, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { icon: HotelIcon, className: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  { icon: UtensilsCrossedIcon, className: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  { icon: StoreIcon, className: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  { icon: BriefcaseBusinessIcon, className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
  { icon: RadioTowerIcon, className: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  { icon: WrenchIcon, className: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  { icon: ServerIcon, className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function departmentTile(id: string, name: string) {
  return TILE_STYLES[hashString(`${id}:${name}`) % TILE_STYLES.length];
}

function buildSearch(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.toString();
}

function sortHref(
  key: SortKey,
  current: SortKey,
  dir: "asc" | "desc",
  base: Record<string, string | undefined>
): string {
  const nextDir: "asc" | "desc" =
    key === current && dir === "asc" ? "desc" : "asc";
  const qs = buildSearch({ ...base, sort: key, dir: nextDir });
  return qs ? `/departments?${qs}` : "/departments";
}

function pageHref(target: number, search: string): string {
  const params = new URLSearchParams(search);
  if (target > 1) params.set("page", String(target));
  else params.delete("page");
  const qs = params.toString();
  return qs ? `/departments?${qs}` : "/departments";
}

function SortHead({
  label,
  sortKey,
  current,
  dir,
  base,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  base: Record<string, string | undefined>;
}) {
  const active = sortKey === current;
  return (
    <Link
      href={sortHref(sortKey, current, dir, base)}
      className="hover:text-foreground inline-flex items-center gap-1"
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ChevronUpIcon className="size-3.5" />
        ) : (
          <ChevronDownIcon className="size-3.5" />
        )
      ) : (
        <ArrowUpDownIcon className="text-muted-foreground size-3.5" />
      )}
    </Link>
  );
}

function DepartmentPagination({
  page,
  pageCount,
  search,
}: {
  page: number;
  pageCount: number;
  search: string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-1">
      {page > 1 ? (
        <Link
          href={pageHref(page - 1, search)}
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "size-8")}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Link>
      ) : (
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-sm" }),
            "size-8 pointer-events-none opacity-40"
          )}
          aria-hidden
        >
          <ChevronLeftIcon />
        </span>
      )}
      {pages.map((n) =>
        n === page ? (
          <span
            key={n}
            aria-current="page"
            className={cn(
              buttonVariants({ size: "icon-sm" }),
              "size-8 tabular-nums"
            )}
          >
            {n}
          </span>
        ) : (
          <Link
            key={n}
            href={pageHref(n, search)}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "text-muted-foreground hover:text-foreground size-8 tabular-nums"
            )}
          >
            {n}
          </Link>
        )
      )}
      {page < pageCount ? (
        <Link
          href={pageHref(page + 1, search)}
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "size-8")}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Link>
      ) : (
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-sm" }),
            "size-8 pointer-events-none opacity-40"
          )}
          aria-hidden
        >
          <ChevronRightIcon />
        </span>
      )}
    </div>
  );
}

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = first(sp.q)?.trim() || undefined;
  const just = first(sp.just);
  const deletedName = first(sp.name);
  const filter = first(sp.filter) ?? "all";
  const rawSort = first(sp.sort);
  const sort: SortKey = SORT_KEYS.includes(rawSort as SortKey)
    ? (rawSort as SortKey)
    : "name";
  const dir: "asc" | "desc" = first(sp.dir) === "desc" ? "desc" : "asc";
  const pageParam = Number(first(sp.page) ?? "1");

  const [result, locations] = await Promise.all([
    listDepartmentsWithCounts({ q }),
    db.location.count(),
  ]);

  const canAdmin = user.role === "ADMIN";

  const totalEmployees = result.departments.reduce(
    (sum, d) => sum + d.employeeCount,
    0
  );
  const totalCheckedOut = result.departments.reduce(
    (sum, d) => sum + d.checkedOutCount,
    0
  );

  const destinations = result.departments.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  const filtered = applyDepartmentFilter(result.departments, filter);
  const filteredEmployees = filtered.reduce(
    (sum, d) => sum + d.employeeCount,
    0
  );
  const filteredCheckedOut = filtered.reduce(
    (sum, d) => sum + d.checkedOutCount,
    0
  );

  const sorted = [...filtered].sort((a, b) => {
    const mul = dir === "desc" ? -1 : 1;
    switch (sort) {
      case "code":
        return (
          mul *
          (a.code ?? "").localeCompare(b.code ?? "", undefined, {
            sensitivity: "base",
          }) || a.name.localeCompare(b.name)
        );
      case "employees":
        return (
          mul * (a.employeeCount - b.employeeCount) ||
          a.name.localeCompare(b.name)
        );
      case "devices":
        return (
          mul * (a.checkedOutCount - b.checkedOutCount) ||
          a.name.localeCompare(b.name)
        );
      default:
        return mul * a.name.localeCompare(b.name);
    }
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(
    Math.max(1, Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1),
    pageCount
  );
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const baseParams: Record<string, string | undefined> = {
    q,
    filter: filter !== "all" ? filter : undefined,
  };
  const activeParams = new URLSearchParams();
  if (q) activeParams.set("q", q);
  if (filter !== "all") activeParams.set("filter", filter);
  if (sort !== "name") activeParams.set("sort", sort);
  if (!(sort === "name" && dir === "asc")) activeParams.set("dir", dir);
  const search = activeParams.toString();
  const hasSearchOrFilter = Boolean(q) || filter !== "all";

  const statCards = [
    {
      label: "Total Departments",
      value: result.departments.length,
      caption: "All airport departments",
      Icon: Building2Icon,
      tile: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Active Employees",
      value: totalEmployees,
      caption: "Currently in the system",
      Icon: UsersIcon,
      tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Devices Checked Out",
      value: totalCheckedOut,
      caption: "Across all departments",
      Icon: SmartphoneIcon,
      tile: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Locations",
      value: locations,
      caption: "Airport locations",
      Icon: MapPinIcon,
      tile: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
  ];

  const chips = [
    { label: "Departments", value: result.departments.length, Icon: Building2Icon },
    { label: "Active Employees", value: totalEmployees, Icon: UsersIcon },
    { label: "Devices Checked Out", value: totalCheckedOut, Icon: SmartphoneIcon },
    { label: "Locations", value: locations, Icon: MapPinIcon },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      {just === "deleted" ? (
        <SweetAlert
          title="Department deleted"
          description={
            deletedName
              ? `"${deletedName}" has been removed from the directory.`
              : "The department has been removed from the directory."
          }
        />
      ) : null}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex size-11 shrink-0 items-center justify-center rounded-xl">
            <UsersIcon className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Departments
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Manage airport departments, employees and device checkouts.
            </p>
          </div>
        </div>
        <div className="bg-primary/5 border-primary/10 hidden items-center gap-1 rounded-xl border p-1.5 lg:flex">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm"
            >
              <chip.Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold tabular-nums">{chip.value}</span>
              <span className="text-muted-foreground">{chip.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card border-border rounded-xl border p-4"
          >
            <div className="flex items-center gap-3.5">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  card.tile
                )}
              >
                <card.Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-muted-foreground text-sm font-medium">
                  {card.label}
                </p>
                <p className="mt-0.5 text-2xl leading-none font-bold tabular-nums">
                  {card.value}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs">
                  {card.caption}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Department list card */}
      <div className="bg-card border-border rounded-xl border">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 pb-3">
          <div>
            <h2 className="text-base font-semibold">Department List</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Showing{" "}
              <span className="text-foreground font-semibold">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? "department" : "departments"} ·{" "}
              <span className="text-foreground font-semibold">
                {filteredEmployees}
              </span>{" "}
              active employees ·{" "}
              <span className="text-foreground font-semibold">
                {filteredCheckedOut}
              </span>{" "}
              devices checked out
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canAdmin ? <DepartmentDialog mode="create" /> : null}
            <DepartmentToolbar q={q} filter={filter} />
          </div>
        </div>

        {pageItems.length === 0 ? (
          <div className="border-border border-t px-4 py-10">
            <EmptyState
              icon={hasSearchOrFilter ? MapPinIcon : Building2Icon}
              title={hasSearchOrFilter ? "No departments match" : "No departments yet"}
              description={
                hasSearchOrFilter
                  ? "Try a different search or filter to widen the results."
                  : "Departments are seeded from the FIA department codes, and new ones can be created here."
              }
            />
          </div>
        ) : (
          <div className="border-border border-t px-2 py-1">
            <Table className="[&_td]:px-3.5 [&_th]:px-3.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <SortHead
                      label="Department"
                      sortKey="name"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHead
                      label="Code"
                      sortKey="code"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHead
                      label="Active Employees"
                      sortKey="employees"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHead
                      label="Devices Checked Out"
                      sortKey="devices"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((department) => {
                  const tile = departmentTile(department.id, department.name);
                  return (
                    <TableRow key={department.id} className="group">
                      <TableCell className="min-w-[220px]">
                        <span className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              tile.className
                            )}
                          >
                            <tile.icon className="size-4" />
                          </span>
                          <Link
                            href={`/departments/${department.id}`}
                            className="hover:text-primary text-sm font-medium underline-offset-2 hover:underline"
                          >
                            {department.name}
                          </Link>
                        </span>
                      </TableCell>
                      <TableCell>
                        {department.code ? (
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {department.code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {department.employeeCount}
                      </TableCell>
                      <TableCell>
                        {department.checkedOutCount > 0 ? (
                          <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
                            {department.checkedOutCount}
                          </span>
                        ) : (
                          <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[220px] truncate text-xs">
                        {department.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {canAdmin ? (
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                              <DepartmentRowActions
                                department={department}
                                destinations={destinations}
                              />
                            </div>
                          ) : null}
                          <Link
                            href={`/departments/${department.id}`}
                            aria-label={`Open ${department.name}`}
                            className="text-muted-foreground hover:text-primary block"
                          >
                            <ChevronRightIcon className="size-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <DepartmentPagination
            page={page}
            pageCount={pageCount}
            search={search}
          />
          <div className="flex flex-wrap items-center gap-2">
            {hasSearchOrFilter ? (
              <Link href="/departments" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <LayoutGridIcon />
                View All {result.departments.length} Departments
              </Link>
            ) : null}
            <Link
              href={`/api/departments/export${search ? `?${search}` : ""}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <DownloadIcon />
              Export
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
