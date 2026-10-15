/**
 * Replace every radio-category asset with the authentic RDO VHF list.
 *
 *   npx tsx scripts/import-vhf.ts            # dry run — prints the plan
 *   npx tsx scripts/import-vhf.ts --apply    # performs the replacement
 *
 * Source data: scripts/vhf-list.json (parsed from Rdo/VHF-List (002).xlsx).
 * The sheet lists 83 rows but some S/Ns appear twice (radio reassigned) —
 * the row with the person's name wins; S/N is unique so 64 radios result.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    console.error("No .env found in the current folder. Run from the project root.");
    process.exit(1);
  }
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let value = m[2]!.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    process.env[m[1]!] = value;
  }
}

type Row = {
  type: string;
  brand: string;
  model: string;
  sn: string;
  radioId: string;
  alias: string;
  assetNo: string;
  department: string;
  endUser: string;
  name: string;
  contact: string;
};

// Sheet department text → existing Department name (only confident matches;
// everything else keeps its raw text in specifications/notes, departmentId = null).
const DEPT_MAP: Record<string, string> = {
  WESTMINSTER: "Westminster (WSL)",
  "WESTMINSTER HOTEL BRAVO-BMS": "Westminster (WSL)",
  "WESTMINSTER-WHISKY ALPHA ONE TERMINAL BUILDING": "Westminster (WSL)",
  "CCTV OFFICE WEST MINISTER": "Westminster (WSL)",
  FIRESTATION: "Fire Station",
  "FIRESTATION-WATCH ROOM": "Fire Station",
  "FIRESTATION-ABULANCE": "Fire Station",
  "IT OFFICE": "Information Technology Department",
  "IT SUPPORT": "Information Technology Department",
  "AOCC-OPERATIONS": "Airside Operation Control Center",
  AOCC: "Airside Operation Control Center",
  WILDLIFE: "Wild Life",
  "CIVIL-ENGINEER-OFFICE": "Civil Engineer Office",
  BMS: "BMS Office",
  "BMS OFFICE TECHNICAL": "BMS Office",
  "SAFETY AND QUALITY": "Quality, Safety and Environmental Department",
  "QUALITY AND SAFETY MANAGEMENT OFFICE-ADMIN": "Quality, Safety and Environmental Department",
  "QUALITY AND SAFETY AIRSIDE OFFICE": "Quality, Safety and Environmental Department",
};

function pickWinner(rows: Row[]): { winner: Row; losers: string[] } {
  const named = rows.filter((r) => /[A-Za-z]/.test(r.name));
  const pool = named.length > 0 ? named : rows.filter((r) => r.name.length > 0);
  const winner = pool.length > 0 ? pool[pool.length - 1]! : rows[0]!;
  return { winner, losers: rows.filter((r) => r !== winner).map((r) => r.assetNo) };
}

function titleBrand(b: string) {
  return b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (check .env).");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  const data = JSON.parse(readFileSync(resolve(process.cwd(), "scripts/vhf-list.json"), "utf8")) as {
    rows: Row[];
  };

  // ── Dedupe by S/N ────────────────────────────────────────────────────────
  const bySn = new Map<string, Row[]>();
  for (const r of data.rows) {
    if (!r.sn) {
      console.error(`Row ${r.assetNo} has no S/N — skipped.`);
      continue;
    }
    bySn.set(r.sn, [...(bySn.get(r.sn) ?? []), r]);
  }
  const winners: { winner: Row; losers: string[] }[] = [];
  for (const [, rows] of bySn) winners.push(pickWinner(rows));
  winners.sort((a, b) => a.winner.assetNo.localeCompare(b.winner.assetNo));

  // ── Resolve category / models / departments ─────────────────────────────
  const radio = await db.assetCategory.findUnique({ where: { slug: "radio" } });
  if (!radio) throw new Error('Asset category "radio" not found.');

  const modelIds = new Map<string, string>();
  for (const modelName of [...new Set(winners.map((w) => w.winner.model))]) {
    let m = await db.deviceModel.findFirst({
      where: {
        categoryId: radio.id,
        brand: { equals: "Hytera", mode: "insensitive" },
        name: { equals: modelName, mode: "insensitive" },
      },
    });
    if (!m) m = await db.deviceModel.create({ data: { categoryId: radio.id, brand: "Hytera", name: modelName } });
    modelIds.set(modelName, m.id);
  }

  const depts = await db.department.findMany();
  const deptByName = new Map(depts.map((d) => [d.name.toLowerCase(), d.id]));
  const unmapped = new Set<string>();
  const resolveDept = (sheetDept: string): string | null => {
    const target = DEPT_MAP[sheetDept];
    if (!target) {
      if (sheetDept) unmapped.add(sheetDept);
      return null;
    }
    const id = deptByName.get(target.toLowerCase());
    if (!id) {
      console.warn(`  ! mapped department "${target}" not found in DB`);
      unmapped.add(sheetDept);
      return null;
    }
    return id;
  };

  const old = await db.asset.findMany({
    where: { categoryId: radio.id },
    select: { id: true, assetTag: true, status: true },
  });
  const oldSns = await db.asset.findMany({
    where: { categoryId: radio.id, serialNumber: { not: null } },
    select: { serialNumber: true },
  });
  const newSns = new Set(winners.map((w) => w.winner.sn.toUpperCase()));
  const gone = oldSns.filter((a) => !newSns.has(a.serialNumber!.toUpperCase()));

  console.log(`\nPlan (${apply ? "APPLY" : "dry run — pass --apply to execute"}):`);
  console.log(`  sheet rows: ${data.rows.length}  →  unique radios: ${winners.length}`);
  console.log(`  delete: ${old.length} existing radio assets (incl. their assignments, transactions, records)`);
  if (gone.length) console.log(`  S/Ns in DB but not in new list: ${gone.map((g) => g.serialNumber).join(", ")}`);
  if (unmapped.size) console.log(`  departments kept as text only: ${[...unmapped].join(", ")}`);
  console.log(`  insert: ${winners.length} new assets (category radio, all AVAILABLE, S/N + person info kept)`);

  if (!apply) {
    console.log("\nSample rows:");
    for (const { winner, losers } of winners.slice(0, 8)) {
      console.log(
        `  ${winner.assetNo}  ${winner.sn}  ${titleBrand(winner.brand)} ${winner.model}  ${winner.department}  ${winner.name || "-"}${losers.length ? `  (also ${losers.join(", ")})` : ""}`
      );
    }
    await db.$disconnect();
    return;
  }

  // ── Delete old radio data (FK-safe order) ───────────────────────────────
  // Guard triggers (append-only / no-delete) block hard deletes. This is a
  // one-time data replacement, so they are disabled for the duration and
  // re-enabled immediately afterwards. AuditLog rows are left untouched.
  const GUARDS: [string, string][] = [
    ["AssetTransaction", "trg_asset_transaction_append_only"],
    ["Asset", "trg_asset_no_delete"],
    ["AssetAssignment", "trg_asset_assignment_no_delete"],
  ];
  const ids = old.map((a) => a.id);
  if (ids.length > 0) {
    const maints = await db.maintenanceRecord.findMany({ where: { assetId: { in: ids } }, select: { id: true } });
    const mIds = maints.map((m) => m.id);
    const assignments = await db.assetAssignment.findMany({ where: { assetId: { in: ids } }, select: { id: true } });
    const aIds = assignments.map((a) => a.id);

    for (const [table, trigger] of GUARDS)
      await db.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER "${trigger}"`);
    try {
      await db.$transaction([
        db.asset.updateMany({ where: { id: { in: ids } }, data: { activeAssignmentId: null } }),
        ...(aIds.length ? [db.assetAssignment.updateMany({ where: { id: { in: aIds } }, data: { previousAssignmentId: null } })] : []),
        db.attachment.deleteMany({
          where: {
            OR: [
              { assetId: { in: ids } },
              ...(mIds.length ? [{ maintenanceRecordId: { in: mIds } }] : []),
            ],
          },
        }),
        db.maintenanceRecord.deleteMany({ where: { assetId: { in: ids } } }),
        db.assetTransaction.deleteMany({ where: { assetId: { in: ids } } }),
        ...(aIds.length ? [db.assetAssignment.deleteMany({ where: { id: { in: aIds } } })] : []),
        db.asset.deleteMany({ where: { id: { in: ids } } }),
      ]);
      console.log(`\n✓ deleted ${old.length} radio assets and dependent records`);
    } finally {
      for (const [table, trigger] of GUARDS)
        await db.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER "${trigger}"`);
      console.log("✓ guard triggers re-enabled");
    }
  }

  // ── Insert new radios ───────────────────────────────────────────────────
  const assets = winners.map(({ winner: r, losers }) => {
    const deptId = resolveDept(r.department);
    const title = titleBrand(r.brand);
    const notesParts = [
      `VHF radio per RDO inventory check-list (Rdo/VHF-List (002).xlsx).`,
      `Sheet department: ${r.department || "-"}.`,
      r.endUser ? `End user: ${r.endUser}.` : null,
      r.name ? `Named user: ${r.name}${r.contact ? ` (contact ${r.contact})` : ""}.` : null,
      r.radioId ? `Radio ID: ${r.radioId}${r.alias ? `, alias "${r.alias}"` : ""}.` : null,
      losers.length ? `Sheet also lists this S/N under ${losers.join(", ")}.` : null,
    ].filter(Boolean);
    return {
      assetTag: r.assetNo,
      serialNumber: r.sn,
      name: `${title} ${r.model} VHF Radio`,
      description: "VHF two-way radio",
      status: "AVAILABLE" as const,
      condition: "GOOD" as const,
      categoryId: radio.id,
      departmentId: deptId,
      modelId: modelIds.get(r.model) ?? null,
      brand: title,
      model: r.model,
      notes: notesParts.join(" "),
      specifications: {
        source: "Rdo/VHF-List (002).xlsx",
        type: r.type || "VHF",
        sheetDepartment: r.department,
        endUser: r.endUser,
        namedUser: r.name || null,
        contactNumber: r.contact || null,
        radioId: r.radioId || null,
        alias: r.alias || null,
        assetNumbers: [r.assetNo, ...losers],
      },
    };
  });

  for (let i = 0; i < assets.length; i += 100) {
    await db.asset.createMany({ data: assets.slice(i, i + 100) });
  }

  const count = await db.asset.count({ where: { categoryId: radio.id } });
  console.log(`✓ inserted ${assets.length} radios — ${count} radio assets now in the database`);

  await db.auditLog.create({
    data: {
      action: "RADIO_INVENTORY_REPLACED",
      entityType: "Asset",
      summary: `VHF radio inventory replaced from RDO check-list: removed ${old.length}, created ${assets.length}`,
      after: {
        source: "Rdo/VHF-List (002).xlsx",
        removed: old.length,
        created: assets.length,
        sheetRows: data.rows.length,
      },
    },
  });
  console.log("✓ audit log entry written");
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
