import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftIcon,
  BatteryIcon,
  BoxesIcon,
  Building2Icon,
  HardDriveIcon,
  LaptopIcon,
  MonitorIcon,
  NetworkIcon,
  PhoneIcon,
  PrinterIcon,
  ProjectorIcon,
  RadioIcon,
  ServerIcon,
  TabletIcon,
  UsersIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import { requireUser } from "@/server/auth";
import {
  getDepartmentCategoryAssets,
  getDepartmentOverview,
  getDepartmentSystemAccounts,
} from "@/server/queries/departments";
import { StatusBadge } from "@/components/assets/status-badge";
import {
  NewSystemDialog,
  SystemAccountsPanel,
} from "@/components/departments/department-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  title: "Department",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  laptop: LaptopIcon,
  "desktop-pc": MonitorIcon,
  monitor: MonitorIcon,
  printer: PrinterIcon,
  deskphone: PhoneIcon,
  radio: RadioIcon,
  tablet: TabletIcon,
  server: ServerIcon,
  "network-equipment": NetworkIcon,
  ups: BatteryIcon,
  projector: ProjectorIcon,
  "storage-device": HardDriveIcon,
  "it-tool": WrenchIcon,
  other: BoxesIcon,
};

const tileClassName =
  "border-border bg-card flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.04]";

export default async function DepartmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tile?: string; just?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { tile, just } = await searchParams;

  const overview = await getDepartmentOverview(id);
  if (!overview) notFound();

  const canWrite = user.role !== "VIEWER";
  const canAddSystem = user.role === "ADMIN";

  const baseHref = `/departments/${id}`;
  const activeTile = typeof tile === "string" ? tile : null;

  let categoryDrill: {
    slug: string;
    name: string;
    assets: Awaited<ReturnType<typeof getDepartmentCategoryAssets>>;
  } | null = null;
  let systemDrill: Awaited<ReturnType<typeof getDepartmentSystemAccounts>> =
    null;

  if (activeTile?.startsWith("cat:")) {
    const slug = activeTile.slice(4);
    const tileInfo = overview.deviceTiles.find((t) => t.slug === slug);
    if (tileInfo) {
      categoryDrill = {
        slug,
        name: tileInfo.name,
        assets: await getDepartmentCategoryAssets(id, slug),
      };
    }
  } else if (activeTile?.startsWith("sys:")) {
    const slug = activeTile.slice(4);
    systemDrill = await getDepartmentSystemAccounts(id, slug);
  }

  const { department, employees, deviceTiles, systemTiles, stats } = overview;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <Link
        href="/departments"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon className="size-3.5" />
        Departments
      </Link>

      {just === "system" ? (
        <SweetAlert
          title="System added"
          description="You can now record which employees have accounts for it."
        />
      ) : just === "account" ? (
        <SweetAlert title="Account saved" description="The account is now listed under this department." />
      ) : null}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Building2Icon className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {department.name}
              </h1>
              {department.code ? (
                <Badge variant="outline" className="font-mono text-xs">
                  {department.code}
                </Badge>
              ) : null}
            </div>
            {department.description ? (
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                {department.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Card className="py-3">
          <CardContent className="flex items-center gap-3 px-3.5">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <UsersIcon className="size-4" />
            </div>
            <div>
              <p className="text-xl leading-none font-semibold tabular-nums">
                {stats.activeEmployees}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Active employees
                {stats.inactiveEmployees > 0
                  ? ` · ${stats.inactiveEmployees} inactive`
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3 px-3.5">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <BoxesIcon className="size-4" />
            </div>
            <div>
              <p className="text-xl leading-none font-semibold tabular-nums">
                {stats.deviceTotal}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Devices in department
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3 px-3.5">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <LaptopIcon className="size-4" />
            </div>
            <div>
              <p className="text-xl leading-none font-semibold tabular-nums">
                {stats.checkedOut}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Checked out right now
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device tiles */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">Devices</h2>
          <p className="text-muted-foreground text-xs">
            Click a device type to see every unit in this department — brand,
            model and serial number.
          </p>
        </div>
        {deviceTiles.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No devices are assigned to this department yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {deviceTiles.map((deviceTile) => {
              const Icon = CATEGORY_ICONS[deviceTile.slug] ?? BoxesIcon;
              const active = activeTile === `cat:${deviceTile.slug}`;
              return (
                <Link
                  key={deviceTile.slug}
                  href={`${baseHref}?tile=cat:${deviceTile.slug}`}
                  className={cn(
                    tileClassName,
                    active && "border-primary ring-primary/30 ring-2"
                  )}
                >
                  <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {deviceTile.name}
                    </p>
                    <p className="text-muted-foreground text-xs">Devices</p>
                  </div>
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
                    {deviceTile.count}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* System tiles */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Systems &amp; accounts</h2>
            <p className="text-muted-foreground text-xs">
              Click a system to see who in this department has an account.
            </p>
          </div>
          {canAddSystem ? <NewSystemDialog departmentId={id} /> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {systemTiles.map((systemTile) => {
            const active = activeTile === `sys:${systemTile.slug}`;
            return (
              <Link
                key={systemTile.slug}
                href={`${baseHref}?tile=sys:${systemTile.slug}`}
                className={cn(
                  tileClassName,
                  active && "border-primary ring-primary/30 ring-2"
                )}
              >
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
                  {systemTile.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {systemTile.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {systemTile.count === 0
                      ? "No accounts yet"
                      : `${systemTile.count} ${
                          systemTile.count === 1 ? "account" : "accounts"
                        }`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Drill-down panel */}
      {categoryDrill ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                {categoryDrill.name} in {department.name}
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] tabular-nums">
                  {categoryDrill.assets.length}
                </span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={baseHref} />}
              >
                <XIcon />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {categoryDrill.assets.length === 0 ? (
              <EmptyState
                icon={BoxesIcon}
                title="Nothing here"
                description="No devices of this type are assigned to the department."
              />
            ) : (
              <div className="border-border overflow-x-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Brand / model</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Custodian</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryDrill.assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="min-w-[200px]">
                          <Link
                            href={`/assets/${asset.id}`}
                            className="hover:text-primary text-sm font-medium underline-offset-2 hover:underline"
                          >
                            {asset.name}
                          </Link>
                          <p className="text-muted-foreground font-mono text-xs">
                            {asset.assetTag}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {[asset.brand, asset.model].filter(Boolean).join(" ") || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          {asset.serialNumber ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={asset.status} />
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {asset.activeAssignment ? (
                            <Link
                              href={`/employees/${asset.activeAssignment.employee.id}`}
                              className="hover:text-primary underline-offset-2 hover:underline"
                            >
                              {asset.activeAssignment.employee.fullName}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">In store</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {asset.location?.name ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : systemDrill ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                {systemDrill.system.name} — {department.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={baseHref} />}
              >
                <XIcon />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <SystemAccountsPanel
              departmentId={id}
              system={systemDrill.system}
              accounts={systemDrill.accounts}
              employees={employees.map((employee) => ({
                id: employee.id,
                fullName: employee.fullName,
                position: employee.position,
              }))}
              canWrite={canWrite}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Employees */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <UsersIcon className="size-4" />
            Employees
            <span className="text-muted-foreground font-normal tabular-nums">
              {employees.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No employees in this department"
              description="Employees appear here once they are assigned to the department in the directory."
            />
          ) : (
            <div className="border-border overflow-x-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="min-w-[200px] text-sm font-medium">
                        <Link
                          href={`/employees/${employee.id}`}
                          className="hover:text-primary underline-offset-2 hover:underline"
                        >
                          {employee.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
                        {employee.position ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[160px] truncate text-sm">
                        {employee.unit ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {employee._count.assignments > 0 ? (
                          <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-xs font-semibold">
                            {employee._count.assignments}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            employee.status === "ACTIVE" ? "secondary" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {employee.status === "ACTIVE" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {employee.phone ?? employee.email ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
