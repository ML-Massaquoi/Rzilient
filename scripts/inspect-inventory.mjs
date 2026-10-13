import ExcelJS from "exceljs";
import path from "node:path";
import fs from "node:fs";

const root = process.cwd();

function collect(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(p));
    else if (entry.name.endsWith(".xlsx") && !entry.name.startsWith("~$") && !entry.name.startsWith(".~lock")) out.push(p);
  }
  return out;
}

const files = collect(path.join(root, "Inventory"));

for (const file of files) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(file);
  } catch (e) {
    console.log(`\n=== ${path.relative(root, file)} === (unreadable: ${e.message})`);
    continue;
  }
  console.log(`\n=== ${path.relative(root, file)} ===`);
  wb.eachSheet((sheet) => {
    console.log(`  -- sheet: "${sheet.name}" rows=${sheet.rowCount} cols=${sheet.columnCount}`);
    const limit = Math.min(sheet.rowCount, 8);
    for (let i = 1; i <= limit; i++) {
      const row = sheet.getRow(i);
      const vals = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        let v = cell.value;
        if (v && typeof v === "object") v = v.richText ? v.richText.map((r) => r.text).join("") : (v.text ?? v.result ?? JSON.stringify(v));
        vals.push(`${col}:${String(v ?? "").replace(/\s+/g, " ").slice(0, 60)}`);
      });
      console.log(`    r${i}: ${vals.join(" | ")}`);
    }
  });
}
