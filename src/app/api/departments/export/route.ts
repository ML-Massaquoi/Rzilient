import { getCurrentUser } from "@/server/auth";
import {
  applyDepartmentFilter,
  listDepartmentsWithCounts,
} from "@/server/queries/employees";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sign in to export departments.", { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const filter = url.searchParams.get("filter") ?? undefined;

  try {
    const { departments } = await listDepartmentsWithCounts({ q });
    const rows = applyDepartmentFilter(departments, filter);

    const columns = [
      "Department",
      "Code",
      "Active Employees",
      "All Employees",
      "Devices Checked Out",
      "Notes",
    ];
    const csvRows = rows.map((department) => [
      department.name,
      department.code ?? "",
      department.employeeCount,
      department.allEmployeeCount,
      department.checkedOutCount,
      department.description ?? "",
    ]);

    const csv = [columns, ...csvRows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="departments-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[departments:export]", error);
    return new Response("Unable to export departments right now.", {
      status: 500,
    });
  }
}
