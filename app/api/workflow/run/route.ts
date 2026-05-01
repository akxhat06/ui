import { NextResponse } from "next/server";
import { runWorkflow } from "@/lib/pipeline/orchestrator";
import { getCurrent } from "@/lib/pipeline/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const existing = await getCurrent();
  if (existing) {
    return NextResponse.json({ ok: true, runId: existing.id, alreadyRunning: true });
  }
  // fire-and-forget so the request returns immediately
  runWorkflow("manual").catch((e) => console.error("[run] workflow failed", e));
  return NextResponse.json({ ok: true, started: true });
}
