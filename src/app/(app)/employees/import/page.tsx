import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, UploadIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import { EmployeeImport } from "@/components/employees/import-uploader";

export const metadata: Metadata = {
  title: "Import Employees",
};

export default async function ImportEmployeesPage() {
  await requireRole("ADMIN", "IT_STAFF");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/employees"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-3.5" />
          Employee directory
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <UploadIcon className="size-5" />
            Import employee directory
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Load an Excel/CSV export of staff, review exactly what will change,
            then confirm. Rows that do not look like people (counters, gates,
            devices) are listed as skipped — nothing is imported silently.
          </p>
        </div>
      </div>

      <EmployeeImport />
    </div>
  );
}
