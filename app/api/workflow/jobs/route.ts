import { NextResponse } from "next/server";
import { readJobs } from "@/lib/pipeline/xlsx-writer";                                                                                                                                                             
import { getSupabaseServer } from "@/lib/supabase/server";
                                                                                                                                                                                                                   
export const runtime = "nodejs";
export const dynamic = "force-dynamic";                                                                                                                                                                            
                
export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();                                                                                                                                                        
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                                                                                                                                                                                                                   
  const rows = await readJobs(user.id);
  return NextResponse.json({ jobs: rows, total: rows.length });                                                                                                                                                    
} 