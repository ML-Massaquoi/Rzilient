import type { Metadata } from "next";
import { CpuIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/lib/db";
import { ModelDialog, ModelRowActions } from "@/components/assets/model-dialog";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <CpuIcon className="size-5" />
            Device Models
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {models.length} {models.length === 1 ? "model" : "models"} ·{" "}
            {totalDevices} devices linked · brands like Xerox, HP, Dell stay
            consistent across the register
          </p>
        </div>
        {canWrite ? <ModelDialog mode="create" categories={categories} /> : null}
      </div>

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
        <div className="border-border overflow-x-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={model.id}>
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
                  <TableCell className="text-sm tabular-nums">
                    {model._count.assets > 0 ? (
                      <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-xs font-semibold">
                        {model._count.assets}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  {canWrite ? (
                    <TableCell>
                      <ModelRowActions model={model} categories={categories} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
