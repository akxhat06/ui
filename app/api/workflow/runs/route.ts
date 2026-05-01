import { NextResponse } from "next/server";
import { listRuns } from "@/lib/pipeline/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const runs = await listRuns();
  return NextResponse.json({ runs: runs.slice(0, 20) });
}
