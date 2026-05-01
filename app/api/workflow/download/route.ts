import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { XLSX_PATH } from "@/lib/pipeline/xlsx-writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!existsSync(XLSX_PATH)) {
    return NextResponse.json({ error: "no sheet yet" }, { status: 404 });
  }
  const buf = await readFile(XLSX_PATH);
  return new NextResponse(buf, {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="jobs.xlsx"',
    },
  });
}
