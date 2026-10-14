import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, LaptopIcon, HistoryIcon, PencilIcon, CameraIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getEmployeeDetail } from "@/server/queries/employees";
import {
  AssignmentHistory,
  CurrentAssets,
  EmployeeHeader,
  EmployeeInfoCard,
} from "@/components/employees/employee-detail";
import { PhotoGallery } from "@/components/attachments/photo-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SweetAlert } from "@/components/sweet-alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Employee",
};

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ just?: string; count?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { just, count } = await searchParams;
  const employee = await getEmployeeDetail(id);
  if (!employee) notFound();

  const canWrite = user.role !== "VIEWER";
  const activeCount = employee.assignments.filter(
    (a) => a.status === "ACTIVE"
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <Link
        href="/employees"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon className="size-3.5" />
        Employee directory
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <EmployeeHeader employee={employee} canWrite={canWrite} />
        {canWrite ? (
          <Button
            variant="outline"
            render={<Link href={`/employees/${employee.id}/edit`} />}
          >
            <PencilIcon />
            Edit employee
          </Button>
        ) : null}
      </div>

      {just === "photo" || just === "deleted" ? (
        <SweetAlert
          title={just === "deleted" ? "Photo removed" : "Photos uploaded"}
          description={
            just === "deleted"
              ? "The photo was deleted from this profile."
              : `Your photos are now visible on ${employee.fullName}'s profile.`
          }
        />
      ) : null}

      {just === "checked-out-multi" ? (
        <SweetAlert
          title={`${Number(count ?? "1")} devices checked out`}
          description={`All selected devices are now assigned to ${employee.fullName}. Open each device below for serial numbers and photos.`}
        />
      ) : null}

      <EmployeeInfoCard employee={employee} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CameraIcon className="size-4" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoGallery
            entity="employee"
            entityId={employee.id}
            photos={employee.attachments}
            canWrite={canWrite}
            returnUrl={`/employees/${employee.id}`}
            subject="employee"
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">
            <LaptopIcon />
            Current assets
            {activeCount > 0 ? (
              <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {activeCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="history">
            <HistoryIcon />
            Assignment history
            <span className="text-muted-foreground ml-1 text-xs tabular-nums">
              {employee.assignments.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" keepMounted className="mt-4">
          <CurrentAssets employee={employee} />
        </TabsContent>

        <TabsContent value="history" keepMounted className="mt-4">
          <AssignmentHistory employee={employee} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
