/**
 * Database transfer tool — move the full data set between two Avci installs
 * (e.g. Windows dev machine → Ubuntu server) without pg_dump.
 *
 *   Export (on the source machine, project root):
 *       npx tsx scripts/db-transfer.ts export [output.json]
 *
 *   Import (on the target machine, project root):
 *       npx tsx scripts/db-transfer.ts import <input.json>
 *
 * Import TRUNCATEs every table first, so it replaces whatever is there.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ── .env loader (dotenv is not a dependency) ────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    console.error("No .env found in the current folder. Run from the project root.");
    process.exit(1);
  }
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let value = m[2]!.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Last occurrence wins (matches dotenv / Next.js behaviour — .env files
    // often contain an example placeholder line above the real value).
    process.env[key] = value;
  }
}

// Insert order: parents before children. Self-references and the
// Asset.activeAssignmentId ⇄ AssetAssignment circular FK are patched after.
const TABLES = [
  "User",
  "Department",
  "Location",
  "AssetCategory",
  "DeviceModel",
  "ItSystem",
  "Employee",
  "EmployeeAccount",
  "Asset",
  "AssetAssignment",
  "AssetTransaction",
  "MaintenanceRecord",
  "InventoryItem",
  "InventoryTransaction",
  "Attachment",
  "AuditLog",
  "Notification",
  "Setting",
] as const;

type TableName = (typeof TABLES)[number];

const DELEGATES: Record<TableName, string> = {
  User: "user",
  Department: "department",
  Location: "location",
  AssetCategory: "assetCategory",
  DeviceModel: "deviceModel",
  ItSystem: "itSystem",
  Employee: "employee",
  EmployeeAccount: "employeeAccount",
  Asset: "asset",
  AssetAssignment: "assetAssignment",
  AssetTransaction: "assetTransaction",
  MaintenanceRecord: "maintenanceRecord",
  InventoryItem: "inventoryItem",
  InventoryTransaction: "inventoryTransaction",
  Attachment: "attachment",
  AuditLog: "auditLog",
  Notification: "notification",
  Setting: "setting",
};

// Columns that cannot be set at insert time (patched afterwards).
const DEFER: Partial<Record<TableName, string[]>> = {
  Location: ["parentId"],
  Asset: ["activeAssignmentId", "parentId"],
  AssetAssignment: ["previousAssignmentId"],
};

// Scalar-list columns that contain NULL in some legacy rows — Prisma rejects
// null for non-nullable lists, so coerce them to [].
const LIST_COLUMNS: Partial<Record<TableName, string[]>> = {
  AssetAssignment: ["accessoriesOut", "accessoriesReturned", "accessoriesMissing"],
};

type AnyDb = {
  $queryRawUnsafe<T>(sql: string): Promise<T>;
  $executeRawUnsafe(sql: string): Promise<number>;
  $disconnect(): Promise<void>;
  location: { update(args: { where: { id: string }; data: { parentId: string } }): Promise<unknown> };
  assetAssignment: {
    update(args: { where: { id: string }; data: { previousAssignmentId: string } }): Promise<unknown>;
  };
  asset: {
    update(args: { where: { id: string }; data: { activeAssignmentId: string } }): Promise<unknown>;
  };
  assetCount?: never;
  [key: string]: unknown;
};

async function createClient(): Promise<AnyDb> {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter }) as unknown as AnyDb;
}

async function exportData(db: AnyDb, outFile: string) {
  const tables: Record<string, unknown[]> = {};
  console.log("Exporting…");
  for (const t of TABLES) {
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${t}" ORDER BY "createdAt", "id"`
    );
    tables[t] = rows;
    console.log(`  ✓ ${t}: ${rows.length}`);
  }
  writeFileSync(
    outFile,
    JSON.stringify({ exportedAt: new Date().toISOString(), tables }, null, 1)
  );
  console.log(`Written to ${outFile}`);
}

async function importData(db: AnyDb, inFile: string) {
  if (!existsSync(inFile)) {
    console.error(`File not found: ${inFile}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(inFile, "utf8")) as {
    tables: Record<string, Record<string, unknown>[]>;
  };

  console.log("Clearing existing data…");
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`
  );

  for (const t of TABLES) {
    const rows = data.tables[t] ?? [];
    if (rows.length === 0) {
      console.log(`  ✓ ${t}: 0`);
      continue;
    }
    const deferred = DEFER[t] ?? [];
    const listCols = LIST_COLUMNS[t] ?? [];
    const cleaned = rows.map((row) => {
      const copy: Record<string, unknown> = { ...row };
      for (const col of deferred) delete copy[col];
      for (const col of listCols) {
        if (copy[col] === null || copy[col] === undefined) copy[col] = [];
      }
      return copy;
    });
    const delegate = db[DELEGATES[t]] as {
      createMany(args: { data: unknown[] }): Promise<unknown>;
    };
    for (let i = 0; i < cleaned.length; i += 400) {
      await delegate.createMany({ data: cleaned.slice(i, i + 400) });
    }
    console.log(`  ✓ ${t}: ${rows.length}`);
  }

  console.log("Patching self-references…");
  for (const row of data.tables.Location ?? []) {
    if (row.parentId) {
      await db.location.update({
        where: { id: String(row.id) },
        data: { parentId: String(row.parentId) },
      });
    }
  }
  for (const row of data.tables.AssetAssignment ?? []) {
    if (row.previousAssignmentId) {
      await db.assetAssignment.update({
        where: { id: String(row.id) },
        data: { previousAssignmentId: String(row.previousAssignmentId) },
      });
    }
  }
  for (const row of data.tables.Asset ?? []) {
    if (row.activeAssignmentId) {
      await db.asset.update({
        where: { id: String(row.id) },
        data: { activeAssignmentId: String(row.activeAssignmentId) },
      });
    }
    if (row.parentId) {
      await db.asset.update({
        where: { id: String(row.id) },
        data: { parentId: String(row.parentId) },
      });
    }
  }

  const assets = (await db.$queryRawUnsafe<{ n: number }[]>(
    'SELECT COUNT(*)::int AS n FROM "Asset"'
  ))[0]!.n;
  const employees = (await db.$queryRawUnsafe<{ n: number }[]>(
    'SELECT COUNT(*)::int AS n FROM "Employee"'
  ))[0]!.n;
  const assignments = (await db.$queryRawUnsafe<{ n: number }[]>(
    'SELECT COUNT(*)::int AS n FROM "AssetAssignment"'
  ))[0]!.n;
  console.log(
    `Import complete — ${assets} assets, ${employees} employees, ${assignments} assignments.`
  );
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (check .env).");
    process.exit(1);
  }
  const db = await createClient();
  const [mode, file] = process.argv.slice(2);
  if (mode === "export") {
    await exportData(db, resolve(process.cwd(), file ?? "data-transfer.json"));
  } else if (mode === "import") {
    if (!file) {
      console.error("Usage: npx tsx scripts/db-transfer.ts import <file.json>");
      process.exit(1);
    }
    await importData(db, resolve(process.cwd(), file));
  } else {
    console.error("Usage: npx tsx scripts/db-transfer.ts export|import [file]");
    process.exit(1);
  }
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
