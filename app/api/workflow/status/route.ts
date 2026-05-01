import { NextResponse } from "next/server";
  import { getCurrent, getLatest } from "@/lib/pipeline/store";                                                                                                                                                      
  import { getSupabaseServer } from "@/lib/supabase/server";
                                                                                                                                                                                                                     
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";                                                                                                                                                                            
                  
  export async function GET() {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();                                                                                                                                                        
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                                                                                                                                                                                                                     
    const [current, latest] = await Promise.all([                                                                                                                                                                    
      getCurrent(user.id),
      getLatest(user.id),                                                                                                                                                                                            
    ]);           

    return NextResponse.json({                                                                                                                                                                                       
      current: current ?? null,
      latest: latest ?? null,                                                                                                                                                                                        
      now: new Date().toISOString(),
    });                                                                                                                                                                                                              
  }