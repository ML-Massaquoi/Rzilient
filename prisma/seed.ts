/**
 * Rzilient seed data.
 *
 * - Demo system users (roles per README §9)
 * - Departments + locations imported from the real FIA "DepartmentCodes" sheet
 * - Asset categories (README §2/§14)
 * - System settings (README §66)
 *
 * Idempotent: safe to run multiple times.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  DEFAULT_WAREHOUSE_CODE,
  WAREHOUSES,
  WAREHOUSE_ROOT_CODE,
  WAREHOUSE_ROOT_NAME,
} from "../src/lib/warehouses";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DEPARTMENTS_FILE = path.join(
  process.cwd(),
  "Inventory",
  "Copy of Computers-UPDATE.xlsx"
);

const CATEGORIES: { name: string; slug: string; requiresSerial: boolean; description?: string }[] = [
  { name: "Laptop", slug: "laptop", requiresSerial: true },
  { name: "Desktop PC", slug: "desktop-pc", requiresSerial: true },
  { name: "Monitor", slug: "monitor", requiresSerial: true },
  { name: "Printer", slug: "printer", requiresSerial: true },
  { name: "Deskphone", slug: "deskphone", requiresSerial: true, description: "Fixed-line office telephone" },
  { name: "Radio", slug: "radio", requiresSerial: true, description: "VHF/UHF two-way radio" },
  { name: "Tablet", slug: "tablet", requiresSerial: true },
  { name: "Server", slug: "server", requiresSerial: true },
  { name: "Network Equipment", slug: "network-equipment", requiresSerial: true, description: "Switches, routers, access points" },
  { name: "UPS", slug: "ups", requiresSerial: true, description: "Uninterruptible power supply" },
  { name: "Projector", slug: "projector", requiresSerial: true },
  { name: "Storage Device", slug: "storage-device", requiresSerial: false },
  { name: "IT Tool", slug: "it-tool", requiresSerial: false },
  { name: "Other IT Equipment", slug: "other", requiresSerial: false },
];

async function seedUsers() {
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@2026";
  const hash = bcrypt.hashSync(password, 12);

  const users = [
    { email: "admin@fia.sl", name: "System Administrator", role: "ADMIN" as const },
    { email: "itstaff@fia.sl", name: "IT Staff", role: "IT_STAFF" as const },
    { email: "viewer@fia.sl", name: "Read Only", role: "VIEWER" as const },
  ];

  for (const user of users) {
    await db.user.upsert({
      where: { email: user.email },
      update: { role: user.role },
      create: { ...user, passwordHash: hash },
    });
  }
  return users;
}

async function seedCategories() {
  for (const category of CATEGORIES) {
    await db.assetCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
}

async function seedDepartmentsAndLocations() {
  let createdDepartments = 0;
  let createdLocations = 0;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(DEPARTMENTS_FILE);
    const sheet = workbook.getWorksheet("DepartmentCodes");
    if (!sheet) throw new Error('Sheet "DepartmentCodes" not found');

    const locations = new Map<string, { name: string; code: string }>();
    const departments: { name: string; code: string | null }[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header
      const locationName = String(row.getCell(1).value ?? "").trim();
      const locationCode = String(row.getCell(2).value ?? "").trim();
      const departmentName = String(row.getCell(3).value ?? "").trim();
      const departmentCode = String(row.getCell(4).value ?? "").trim();

      if (locationName && locationCode && !locations.has(locationCode)) {
        locations.set(locationCode, { name: locationName, code: locationCode });
      }
      if (!departmentName) return;
      departments.push({
        name: departmentName,
        code: departmentCode || null,
      });
    });

    for (const department of departments) {
      try {
        await db.department.upsert({
          where: { code: department.code ?? department.name },
          update: { name: department.name },
          create: department,
        });
        createdDepartments += 1;
      } catch (err) {
        console.warn(`Skipping department "${department.name}": ${(err as Error).message}`);
      }
    }

    for (const location of locations.values()) {
      try {
        await db.location.upsert({
          where: { code: location.code },
          update: { name: location.name },
          create: location,
        });
        createdLocations += 1;
      } catch (err) {
        console.warn(`Skipping location "${location.name}": ${(err as Error).message}`);
      }
    }
  } catch (err) {
    console.warn(`Could not import departments/locations from inventory file: ${err}`);
  }

  return { createdDepartments, createdLocations };
}

async function seedSettings() {
  const settings: { key: string; value: unknown }[] = [
    { key: "systemName", value: "Rzilient" },
    { key: "organizationName", value: "Freetown International Airport" },
    { key: "assetTagPrefix", value: "FIA-IT" },
    { key: "assetTagDigits", value: 5 },
    { key: "timezone", value: "Africa/Freetown" },
    { key: "defaultReturnDays", value: 14 },
    { key: "autoMaintenanceOnDamagedReturn", value: true },
  ];

  for (const setting of settings) {
    await db.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value as never },
    });
  }
}

const SYSTEMS: { name: string; slug: string }[] = [
  { name: "Office 365", slug: "office-365" },
  { name: "Sage", slug: "sage" },
  { name: "TAMS", slug: "tams" },
  { name: "FIDS", slug: "fids" },
  { name: "Payroll", slug: "payroll" },
];

async function seedSystems() {
  for (const system of SYSTEMS) {
    await db.itSystem.upsert({
      where: { slug: system.slug },
      update: {},
      create: system,
    });
  }
  return SYSTEMS.length;
}

/** Creates the "Warehouses" root location + the three warehouse children. */
async function seedWarehouses() {
  const root = await db.location.upsert({
    where: { code: WAREHOUSE_ROOT_CODE },
    update: { name: WAREHOUSE_ROOT_NAME },
    create: { name: WAREHOUSE_ROOT_NAME, code: WAREHOUSE_ROOT_CODE },
  });

  const warehouses = [];
  for (const warehouse of WAREHOUSES) {
    const row = await db.location.upsert({
      where: { code: warehouse.code },
      update: { name: warehouse.name, parentId: root.id },
      create: { ...warehouse, parentId: root.id },
    });
    warehouses.push(row);
  }
  return warehouses;
}

/**
 * Places every device in a warehouse: devices outside the three warehouses
 * (no location, or an old building location) go to the default warehouse.
 * Idempotent — devices already in any warehouse keep their warehouse.
 */
async function warehouseBackfill(warehouses: { id: string; code: string | null }[]) {
  const ids = warehouses.map((w) => w.id);
  const defaultWarehouse =
    warehouses.find((w) => w.code === DEFAULT_WAREHOUSE_CODE) ?? warehouses[0];
  if (!defaultWarehouse) return 0;

  const result = await db.asset.updateMany({
    where: { OR: [{ locationId: null }, { locationId: { notIn: ids } }] },
    data: { locationId: defaultWarehouse.id },
  });
  return result.count;
}

/**
 * One-time-friendly backfills (idempotent):
 * - DeviceModel rows from every distinct category+brand+model on assets
 * - Asset.departmentId from the current custodian's department (where unset)
 */
async function backfills() {
  const existing = await db.deviceModel.findMany({
    select: { categoryId: true, brand: true, name: true, id: true },
  });
  const modelByKey = new Map(
    existing.map((m) => [`${m.categoryId}|${m.brand}|${m.name}`, m.id])
  );

  const assets = await db.asset.findMany({
    where: {
      modelId: null,
      brand: { not: null },
      model: { not: null },
    },
    select: { id: true, categoryId: true, brand: true, model: true },
  });

  let createdModels = 0;
  let linkedAssets = 0;
  for (const asset of assets) {
    const brand = (asset.brand ?? "").trim();
    const name = (asset.model ?? "").trim();
    if (!brand || !name) continue;
    const key = `${asset.categoryId}|${brand}|${name}`;
    let modelId = modelByKey.get(key);
    if (!modelId) {
      const created = await db.deviceModel.create({
        data: { categoryId: asset.categoryId, brand, name },
      });
      modelId = created.id;
      modelByKey.set(key, modelId);
      createdModels += 1;
    }
    await db.asset.update({
      where: { id: asset.id },
      data: { modelId },
    });
    linkedAssets += 1;
  }

  const departmentsSet = await db.$executeRaw`
    UPDATE "Asset" a
    SET "departmentId" = e."departmentId"
    FROM "AssetAssignment" asg
    JOIN "Employee" e ON e."id" = asg."employeeId"
    WHERE a."activeAssignmentId" = asg."id"
      AND a."departmentId" IS NULL`;

  return { createdModels, linkedAssets, departmentsSet };
}

async function main() {
  console.log("Seeding Rzilient...");

  await seedUsers();
  console.log("  ✓ users (admin@fia.sl / itstaff@fia.sl / viewer@fia.sl)");

  await seedCategories();
  console.log(`  ✓ ${CATEGORIES.length} asset categories`);

  const { createdDepartments, createdLocations } = await seedDepartmentsAndLocations();
  console.log(`  ✓ ${createdDepartments} departments, ${createdLocations} locations (from real FIA data)`);

  await seedSettings();
  console.log("  ✓ settings");

  const systems = await seedSystems();
  console.log(`  ✓ ${systems} systems (Office 365, Sage, TAMS, FIDS, Payroll)`);

  const warehouses = await seedWarehouses();
  console.log(
    `  ✓ ${warehouses.length} warehouses (${WAREHOUSES.map((w) => w.name).join(", ")})`
  );
  const movedToWarehouse = await warehouseBackfill(warehouses);
  console.log(`  ✓ ${movedToWarehouse} devices placed in their warehouse`);

  const { createdModels, linkedAssets, departmentsSet } = await backfills();
  console.log(
    `  ✓ backfill: ${createdModels} device models created, ${linkedAssets} assets linked, ${departmentsSet} departments set from custodians`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
