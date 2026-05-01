import { existsSync } from "node:fs";
  import { readFile } from "node:fs/promises";
  import { NextResponse } from "next/server";                                                                                                                                                                        
  import { xlsxPathFor } from "@/lib/pipeline/xlsx-writer";
  import { getSupabaseServer } from "@/lib/supabase/server";                                                                                                                                                         
                                                                                                                                                                                                                     
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";                                                                                                                                                                            
                  
  export async function GET() {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();                                                                                                                                                        
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                                                                                                                                                                                                                     
    const p = xlsxPathFor(user.id);
    if (!existsSync(p)) {                                                                                                                                                                                            
      return NextResponse.json({ error: "no sheet yet" }, { status: 404 });
    }                                                                                                                                                                                                                
    const buf = await readFile(p);
    return new NextResponse(buf, {                                                                                                                                                                                   
      headers: {                                                                                                                                                                                                     
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="jobs.xlsx"',                                                                                                                                                   
      },                                                                                                                                                                                                             
    });
  }