import type { Metadata } from "next";
import {
  ArrowRightLeftIcon,
  BoxesIcon,
  CircleCheckIcon,
  LayoutDashboardIcon,
  WrenchIcon,
} from "lucide-react";
import { requireUser } from "@/server/auth";
import { getDashboardStats } from "@/server/queries/dashboard";
import {
  formatDate,
  greetingForHour,
  hourInAppTimezone,
} from "@/lib/datetime";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttentionSection } from "@/components/dashboard/attention-card";
import { DistributionList } from "@/components/dashboard/distribution-list";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StatusBadge } from "@/components/assets/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await getDashboardStats();
  const firstName = user.name.split(" ")[0] || user.name;
  const today = new Date();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        icon={LayoutDashboardIcon}
        title={`${greetingForHour(hourInAppTimezone(today))}, ${firstName}`}
        subtitle={`Current picture of IT assets at Freetown International Airport · ${formatDate(today)}`}
        chips={[
          {
            label: "Total Assets",
            value: stats.totals.total,
            icon: BoxesIcon,
          },
          {
            label: "Checked Out",
            value: stats.totals.checkedOut,
            icon: ArrowRightLeftIcon,
          },
          {
            label: "Available",
            value: stats.totals.available,
            icon: CircleCheckIcon,
          },
          {
            label: "In Maintenance",
            value: stats.totals.maintenance,
            icon: WrenchIcon,
          },
        ]}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total assets"
          value={stats.totals.total}
          hint={`${stats.activeEmployees} active employees`}
          icon={BoxesIcon}
        />
        <StatCard
          label="Checked out"
          value={stats.totals.checkedOut}
          hint="Assigned to employees"
          icon={ArrowRightLeftIcon}
          tone="info"
        />
        <StatCard
          label="Available"
          value={stats.totals.available}
          hint="In store / unassigned"
          icon={CircleCheckIcon}
          tone="success"
        />
        <StatCard
          label="In maintenance"
          value={stats.totals.maintenance}
          hint={`${stats.openMaintenance} open maintenance ${stats.openMaintenance === 1 ? "record" : "records"}`}
          icon={WrenchIcon}
          tone="warning"
        />
      </section>

      <AttentionSection
        overdue={stats.attention.overdue}
        damaged={stats.attention.damaged}
        missing={stats.attention.missing}
        lowStock={stats.attention.lowStock}
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionList distribution={stats.distribution} />
        <ActivityFeed entries={stats.recentTransactions} />
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Recently registered
          </CardTitle>
          <CardDescription>
            The latest assets added to the register
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentAssets.length === 0 ? (
            <EmptyState
              icon={BoxesIcon}
              title="No assets registered yet"
              description="Register assets manually, or run an inventory import to populate the register."
            />
          ) : (
            <ul className="divide-border divide-y">
              {stats.recentAssets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {asset.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {asset.assetTag}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      {formatDate(asset.createdAt)}
                    </span>
                    <StatusBadge status={asset.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
