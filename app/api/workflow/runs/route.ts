import { NextResponse } from "next/server";
  import { listRuns } from "@/lib/pipeline/store";                                                                                                                                                                   
  import { getSupabaseServer } from "@/lib/supabase/server";                                                                                                                                                         
   
  export const runtime = "nodejs";                                                                                                                                                                                   
  export const dynamic = "force-dynamic";

  export async function GET() {                                                                                                                                                                                      
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();                                                                                                                                                        
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                                                                                                                                                                                                                     
    const runs = await listRuns(user.id);
    return NextResponse.json({ runs: runs.slice(0, 20) });                                                                                                                                                           
  } 