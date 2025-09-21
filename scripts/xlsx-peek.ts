import path from "node:path";
import xlsx from "xlsx";

const argPath = process.argv[2] || process.env.SCHEDULE_XLSX_PATH || "./schedule_pages.xlsx";
const abs = path.resolve(process.cwd(), argPath);
const rowsToShow = Number(process.argv[3] || 5);

const wb = xlsx.readFile(abs);
console.log("Workbook:", abs);
console.log("Sheets:", wb.SheetNames);

const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

if (!rows.length) {
    console.log("No rows.");
    process.exit(0);
}

const headers = Object.keys(rows[0]);
console.log("Headers:", headers);

console.log("\nSample rows:");
for (const r of rows.slice(0, rowsToShow)) {
    console.log(r);
}
