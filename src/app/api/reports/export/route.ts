import ExcelJS from "exceljs";
import { getCurrentUser } from "@/server/auth";
import {
  describeReportFilters,
  isReportType,
  parseReportFilters,
  REPORT_META,
  runReport,
  toCsv,
  type ReportFilters,
  type ReportType,
} from "@/server/queries/reports";

async function buildXlsx(
  type: ReportType,
  filters: ReportFilters,
  columns: string[],
  rows: string[][]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Avci";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(REPORT_META[type].title.slice(0, 31));

  sheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = REPORT_META[type].title;
  titleCell.font = { bold: true, size: 15 };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, columns.length);
  sheet.getCell(2, 1).value = `Generated ${new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Freetown",
    dateStyle: "medium",
    timeStyle: "short",
  })} (Africa/Freetown) · Freetown International Airport · IT Department`;

  sheet.mergeCells(3, 1, 3, columns.length);
  sheet.getCell(3, 1).value = `Filters: ${describeReportFilters(filters)}`;

  const headerRow = sheet.getRow(5);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };
    cell.alignment = { vertical: "middle" };
  });
  headerRow.height = 20;

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 6);
    row.forEach((value, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = value;
      if (rowIndex % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
  });

  columns.forEach((column, index) => {
    let width = column.length + 2;
    for (const row of rows.slice(0, 200)) {
      width = Math.max(width, String(row[index] ?? "").length + 2);
    }
    sheet.getColumn(index + 1).width = Math.min(width, 42);
  });

  sheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: columns.length },
  };
  sheet.views = [{ state: "frozen", ySplit: 5 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sign in to export reports.", { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (!isReportType(type)) {
    return new Response("Unknown report type.", { status: 400 });
  }
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  try {
    const filters = parseReportFilters(url.searchParams);
    const { columns, rows } = await runReport(type, filters);
    const date = new Date().toISOString().slice(0, 10);

    if (format === "xlsx") {
      const buffer = await buildXlsx(type, filters, columns, rows);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${type}-report-${date}.xlsx"`,
          "Cache-Control": "no-store",
          "X-Report-Title": REPORT_META[type].title,
        },
      });
    }

    const csv = toCsv(columns, rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-report-${date}.csv"`,
        "Cache-Control": "no-store",
        "X-Report-Title": REPORT_META[type].title,
      },
    });
  } catch (error) {
    console.error("[reports:export]", error);
    return new Response("Unable to build the report right now.", {
      status: 500,
    });
  }
}
