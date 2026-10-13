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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
