import ExcelJS from "exceljs";

export type ParsedEmployeeRow = {
  rowIndex: number;
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  department?: string;
  fiaNumber?: string;
  employeeNo?: string;
  position?: string;
  unit?: string;
  email?: string;
  phone?: string;
};

export type ImportRowKind =
  | "new"
  | "update"
  | "duplicate"
  | "invalid"
  | "skipped";

export type ClassifiedImportRow = {
  rowIndex: number;
  kind: ImportRowKind;
  reason?: string;
  employee: ParsedEmployeeRow;
  existingId?: string;
  changes?: string[];
};

export type EmployeeImportPreview = {
  fileName: string;
  rows: ClassifiedImportRow[];
  departmentsToCreate: string[];
  summary: {
    total: number;
    new: number;
    update: number;
    duplicate: number;
    invalid: number;
    skipped: number;
  };
};

export type ExistingEmployee = {
  id: string;
  fullName: string;
  departmentName: string | null;
  phone: string | null;
  position: string | null;
  unit: string | null;
  email: string | null;
  fiaNumber: string | null;
  employeeNo: string | null;
};

/** Case/punctuation-insensitive key so "Abu Bakarr" matches "ABU BAKARR". */
export function normalizeName(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeDepartment(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

const SKIP_RULES: [RegExp, string][] = [
  [/^end-user$|^user$|^type$/i, "column header, not a person"],
  [/no\s*person/i, "placeholder for unstaffed device"],
  [/^(counter|gate|bridge|desk)\b\s*\d/i, "counter or gate, not a person"],
  [/\b(pc|laptop|printer|workstation|cctv|desktop)\b/i, "device name, not a person"],
  [/\busers?\b/i, "group or shared label"],
  [/\//, "multiple names in one entry"],
  [/^(fire station|watch room|ambulance|admin building|meeting room|office)/i, "facility or room, not a person"],
  [/secretary|supervisor|helpdesk/i, "shared role label"],
];

/**
 * Heuristic gate: decides whether an End-User value looks like a person.
 * Everything rejected is shown in the preview as "skipped" with a reason so
 * a human reviews every exclusion — nothing is silently dropped.
 */
export function personReason(value: string): string | null {
  const name = value.trim();
  if (!name) return "empty";
  if (name.length < 3) return "too short to identify";
  for (const [pattern, reason] of SKIP_RULES) {
    if (pattern.test(name)) return reason;
  }
  const words = name.split(/\s+/);
  if (words.length < 2) return "single word — needs review";
  if (words.every((word) => word.length <= 1)) return "not a readable name";
  return null;
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function splitFullName(full: string): {
  firstName: string;
  middleName?: string;
  lastName: string;
} {
  const words = full.replace(/\s+/g, " ").trim().split(" ");
  if (words.length === 1) return { firstName: words[0], lastName: words[0] };
  if (words.length === 2) {
    return { firstName: words[0], lastName: words[1] };
  }
  return {
    firstName: words[0],
    middleName: words.slice(1, -1).join(" "),
    lastName: words[words.length - 1],
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

type HeaderMap = {
  mode: "inventory" | "generic";
  columns: Record<string, number>;
};

const GENERIC_HEADER_PATTERNS: [string, RegExp][] = [
  ["fiaNumber", /^fia\s*(number|no|#)/i],
  ["employeeNo", /^(employee|staff|personnel)\s*(id|number|no|#)/i],
  ["firstName", /^first\s*name/i],
  ["middleName", /^middle\s*name/i],
  ["lastName", /^last\s*name|^surname/i],
  ["fullName", /^(full\s*name|name|end[- ]?user|employee\s*name|user)$/i],
  ["department", /^(department|dept)/i],
  ["position", /^(position|title|job)/i],
  ["unit", /^(unit|section)/i],
  ["email", /e-?mail/i],
  ["phone", /^(phone|mobile|tel|contact|dial)/i],
];

function detectHeader(cells: string[]): HeaderMap | null {
  const lower = cells.map((cell) => cell.toLowerCase().trim());
  if (lower.includes("end-user") && lower.includes("department")) {
    const columns: Record<string, number> = {};
    cells.forEach((cell, index) => {
      const c = cell.toLowerCase().trim();
      if (c === "type") columns.type = index;
      if (c === "department") columns.department = index;
      if (c === "end-user") columns.fullName = index;
      if (c === "dial-number" || c === "contact") columns.phone = index;
      if (c === "s/n") columns.serial = index;
    });
    if (columns.fullName !== undefined && columns.department !== undefined) {
      return { mode: "inventory", columns };
    }
  }

  const columns: Record<string, number> = {};
  cells.forEach((cell, index) => {
    for (const [key, pattern] of GENERIC_HEADER_PATTERNS) {
      if (columns[key] === undefined && pattern.test(cell.trim())) {
        columns[key] = index;
      }
    }
  });
  if (columns.fullName !== undefined) {
    return { mode: "generic", columns };
  }
  return null;
}

/** Reads an uploaded .xlsx/.xls/.csv file into normalized employee rows. */
export async function parseEmployeeFile(
  fileName: string,
  data: ArrayBuffer
): Promise<{ rows: ParsedEmployeeRow[]; sheetName: string }> {
  const isCsv = /\.csv$/i.test(fileName);
  let matrix: string[][] = [];

  if (isCsv) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(data);
    matrix = parseCsv(text).map((row) => row.map(cellToString));
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);
    const worksheet =
      workbook.worksheets.find((ws) => ws.name.toLowerCase() !== "sheet1") ??
      workbook.worksheets[0];
    if (!worksheet) throw new Error("The file contains no worksheets.");
    worksheet.eachRow((row, rowNumber) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push(cellToString(cell.value));
      });
      matrix[rowNumber - 1] = cells;
    });
  }

  let headerMap: HeaderMap | null = null;
  let headerRowIndex = -1;
  const scanLimit = Math.min(25, matrix.length);
  for (let i = 0; i < scanLimit; i++) {
    headerMap = detectHeader(matrix[i] ?? []);
    if (headerMap) {
      headerRowIndex = i;
      break;
    }
  }
  if (!headerMap) {
    throw new Error(
      "Could not find a header row. Expected columns such as “Full Name / End-User” and “Department”."
    );
  }

  const get = (cells: string[] | undefined, key: string): string => {
    const index = headerMap!.columns[key];
    if (index === undefined) return "";
    return (cells?.[index] ?? "").trim();
  };

  const rows: ParsedEmployeeRow[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const fullName = get(cells, "fullName");
    const department = get(cells, "department");
    if (!fullName && !department) continue;
    // Repeated column headers inside the sheet body.
    if (/^(end-user|type|name)$/i.test(fullName)) continue;

    const first = get(cells, "firstName");
    const last = get(cells, "lastName");
    const middle = get(cells, "middleName");

    let resolvedName = fullName;
    let firstName: string | undefined;
    let lastName: string | undefined;
    let middleName: string | undefined;

    if (!fullName && (first || last)) {
      resolvedName = [first, middle, last].filter(Boolean).join(" ");
      firstName = first || undefined;
      lastName = last || undefined;
      middleName = middle || undefined;
    } else if (fullName) {
      const split = splitFullName(fullName);
      firstName = split.firstName;
      lastName = split.lastName;
      middleName = split.middleName;
    }

    rows.push({
      rowIndex: i + 1,
      fullName: resolvedName,
      firstName,
      middleName,
      lastName,
      department: department || undefined,
      fiaNumber: get(cells, "fiaNumber") || undefined,
      employeeNo: get(cells, "employeeNo") || undefined,
      position: get(cells, "position") || undefined,
      unit: get(cells, "unit") || undefined,
      email: get(cells, "email") || undefined,
      phone: get(cells, "phone") || undefined,
    });
  }

  return { rows, sheetName: isCsv ? "csv" : "worksheet" };
}

export function classifyEmployeeRows(
  fileName: string,
  parsed: ParsedEmployeeRow[],
  existing: ExistingEmployee[],
  existingDepartments: { id: string; name: string }[]
): EmployeeImportPreview {
  const existingByNormalizedName = new Map<string, ExistingEmployee>();
  for (const employee of existing) {
    existingByNormalizedName.set(normalizeName(employee.fullName), employee);
  }

  const deptByNormalizedName = new Map<string, { id: string; name: string }>();
  for (const dept of existingDepartments) {
    deptByNormalizedName.set(normalizeDepartment(dept.name), dept);
  }

  const departmentsToCreate = new Map<string, string>();
  const seenInFile = new Set<string>();
  const rows: ClassifiedImportRow[] = [];

  const summary = {
    total: parsed.length,
    new: 0,
    update: 0,
    duplicate: 0,
    invalid: 0,
    skipped: 0,
  };

  for (const employee of parsed) {
    const push = (row: ClassifiedImportRow) => {
      rows.push(row);
      summary[row.kind] += 1;
    };

    const skipReason = personReason(employee.fullName);
    if (skipReason === "empty") {
      push({ rowIndex: employee.rowIndex, kind: "invalid", reason: "missing name", employee });
      continue;
    }
    if (skipReason) {
      push({ rowIndex: employee.rowIndex, kind: "skipped", reason: skipReason, employee });
      continue;
    }

    const key = normalizeName(employee.fullName);
    if (seenInFile.has(key)) {
      push({
        rowIndex: employee.rowIndex,
        kind: "duplicate",
        reason: "same person already appears earlier in this file",
        employee,
      });
      continue;
    }
    seenInFile.add(key);

    if (employee.department) {
      const deptKey = normalizeDepartment(employee.department);
      if (!deptByNormalizedName.has(deptKey) && !departmentsToCreate.has(deptKey)) {
        departmentsToCreate.set(deptKey, employee.department.trim());
      }
    }

    const match = existingByNormalizedName.get(key);
    if (match) {
      const changes: string[] = [];
      if (
        employee.department &&
        match.departmentName &&
        normalizeDepartment(match.departmentName) !==
          normalizeDepartment(employee.department)
      ) {
        changes.push(`department: ${match.departmentName} → ${employee.department.trim()}`);
      }
      if (employee.phone && employee.phone !== (match.phone ?? "")) {
        changes.push(`phone: ${match.phone ?? "—"} → ${employee.phone}`);
      }
      if (employee.position && employee.position !== (match.position ?? "")) {
        changes.push(`position: ${match.position ?? "—"} → ${employee.position}`);
      }
      if (employee.email && employee.email.toLowerCase() !== (match.email ?? "").toLowerCase()) {
        changes.push(`email updated`);
      }
      if (employee.fiaNumber && !match.fiaNumber) {
        changes.push(`FIA number: ${employee.fiaNumber}`);
      }
      if (employee.employeeNo && !match.employeeNo) {
        changes.push(`employee no: ${employee.employeeNo}`);
      }
      push({
        rowIndex: employee.rowIndex,
        kind: "update",
        reason: changes.length ? undefined : "already up to date",
        employee,
        existingId: match.id,
        changes,
      });
      continue;
    }

    push(
      employee.department
        ? { rowIndex: employee.rowIndex, kind: "new", employee }
        : {
            rowIndex: employee.rowIndex,
            kind: "invalid",
            reason: "no department — an employee must belong to a department",
            employee,
          }
    );
  }

  return {
    fileName,
    rows,
    departmentsToCreate: [...departmentsToCreate.values()],
    summary,
  };
}
