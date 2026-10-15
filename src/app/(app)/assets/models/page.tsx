import type { Metadata } from "next";
import { CpuIcon, HardDriveIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/lib/db";
import { ModelDialog, ModelRowActions } from "@/components/assets/model-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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

export const metadata: Metadata = {
  title: "Device Models",
};

export default async function DeviceModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ just?: string }>;
}) {
  const user = await requireUser();
  const { just } = await searchParams;
  const canWrite = user.role !== "VIEWER";

  const [categories, models] = await Promise.all([
    db.assetCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.deviceModel.findMany({
      orderBy: [{ category: { name: "asc" } }, { brand: "asc" }, { name: "asc" }],
      select: {
        id: true,
        categoryId: true,
        brand: true,
        name: true,
        notes: true,
        category: { select: { name: true } },
        _count: { select: { assets: true } },
      },
    }),
  ]);

  const totalDevices = models.reduce((sum, m) => sum + m._count.assets, 0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        icon={CpuIcon}
        iconClassName="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
        title="Device Models"
        subtitle={`Brands like Xerox, HP and Dell stay consistent across the register.`}
        chips={[
          { label: "Models", value: models.length, icon: CpuIcon },
          { label: "Devices Linked", value: totalDevices, icon: HardDriveIcon },
          { label: "Categories", value: categories.length, icon: HardDriveIcon },
        ]}
        actions={
          canWrite ? <ModelDialog mode="create" categories={categories} /> : null
        }
      />

      {just === "created" ? (
        <SweetAlert title="Model added" description="It is now available when registering devices." />
      ) : just === "saved" ? (
        <SweetAlert title="Model saved" description="Your changes have been applied." />
      ) : just === "inuse" ? (
        <SweetAlert
          type="error"
          title="Model still in use"
          description="Devices are linked to this model, so it cannot be deleted."
        />
      ) : null}

      {models.length === 0 ? (
        <EmptyState
          icon={CpuIcon}
          title="No device models yet"
          description="Models are created automatically from brand/model details when you register devices — or add the first one here."
        />
      ) : (
        <div className="bg-card border-border rounded-xl border">
          <div className="border-border border-t px-2 py-1">
            <Table className="[&_td]:px-3.5 [&_th]:px-3.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Devices</TableHead>
                  {canWrite ? <TableHead className="w-28" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id} className="group">
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {model.category.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium whitespace-nowrap">
                      {model.brand}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {model.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[260px] truncate text-xs">
                      {model.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      {model._count.assets > 0 ? (
                        <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
                          {model._count.assets}
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
                          0
                        </span>
                      )}
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <div className="flex items-center justify-end opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                          <ModelRowActions model={model} categories={categories} />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
