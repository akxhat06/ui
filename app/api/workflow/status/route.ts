import { NextResponse } from "next/server";
  import { getCurrent, getLatest } from "@/lib/pipeline/store";                                                                                                                                                      
                                                                                                                                                                                                                     
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";                                                                                                                                                                            
                                                                                                                                                                                                                     
  export async function GET() {
    const [current, latest] = await Promise.all([getCurrent(), getLatest()]);                                                                                                                                        
    return NextResponse.json({
      current: current ?? null,                                                                                                                                                                                      
      latest: latest ?? null,
      now: new Date().toISOString(),                                                                                                                                                                                 
    });           
  }