import { NextResponse } from "next/server";
import { requestStopCurrent } from "@/lib/pipeline/store";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const run = await requestStopCurrent(user.id);
  if (!run) {
    return NextResponse.json({ ok: true, stopped: false, message: "No running workflow found." });
  }

  return NextResponse.json({ ok: true, stopped: true, runId: run.id });
}
