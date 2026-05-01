import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { Job } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
export const XLSX_PATH = path.join(DATA_DIR, "jobs.xlsx");
const SHEET = "jobs";

const HEADERS = [
  "scrapedAt",
  "score",
  "title",
  "company",
  "location",
  "experience",
  "postedOn",
  "salary",
  "url",
  "reason",
];

type Row = Record<string, string | number>;

function jobToRow(j: Job): Row {
  return {
    scrapedAt: j.scrapedAt,
    score: j.score ?? 0,
    title: j.title,
    company: j.company,
    location: j.location,
    experience: j.experience,
    postedOn: j.postedOn ?? "",
    salary: j.salary ?? "",
    url: j.url,
    reason: j.reason ?? "",
  };
}

async function loadExisting(): Promise<{ rows: Row[]; urls: Set<string> }> {
  if (!existsSync(XLSX_PATH)) return { rows: [], urls: new Set() };
  const buf = await readFile(XLSX_PATH);
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[SHEET] ?? wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], urls: new Set() };
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
  const urls = new Set<string>();
  for (const r of rows) {
    const u = String(r.url ?? "").trim();
    if (u) urls.add(u);
  }
  return { rows, urls };
}

export async function loadSavedUrls(): Promise<Set<string>> {
  const { urls } = await loadExisting();
  return urls;
}

export async function appendJobs(jobs: Job[]): Promise<{ added: number; total: number }> {
  await mkdir(DATA_DIR, { recursive: true });
  const { rows, urls } = await loadExisting();

  let added = 0;
  for (const j of jobs) {
    if (urls.has(j.url)) continue;
    rows.push(jobToRow(j));
    urls.add(j.url);
    added += 1;
  }

  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
  ws["!cols"] = HEADERS.map((h) => {
    if (h === "url" || h === "reason") return { wch: 60 };
    if (h === "title" || h === "company") return { wch: 32 };
    return { wch: 16 };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SHEET);
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  await writeFile(XLSX_PATH, out);

  return { added, total: rows.length };
}
