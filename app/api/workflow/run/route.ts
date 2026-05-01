import { NextResponse, after } from "next/server";
  import { runWorkflow } from "@/lib/pipeline/orchestrator";                                                                                                                                                         
  import { getCurrent } from "@/lib/pipeline/store";
  import { getSupabaseServer } from "@/lib/supabase/server";                                                                                                                                                         
                  
  export const runtime = "nodejs";                                                                                                                                                                                   
  export const dynamic = "force-dynamic";

  export async function POST() {                                                                                                                                                                                     
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();                                                                                                                                                        
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                                                                                                                                                                                                                     
    const { data: profile, error } = await supabase
      .from("profiles")                                                                                                                                                                                              
      .select("resume_summary, tech_stacks, experience, location")
      .eq("id", user.id)                                                                                                                                                                                             
      .single();
                                                                                                                                                                                                                     
    if (          
      error ||
      !profile?.resume_summary ||
      !Array.isArray(profile.tech_stacks) || profile.tech_stacks.length === 0 ||
      !profile.location?.trim()                                                                                                                                                                                      
    ) {
      return NextResponse.json({ error: "Complete your profile first." }, { status: 400 });                                                                                                                          
    }                                                                                                                                                                                                                
  
    const existing = await getCurrent(user.id);                                                                                                                                                                      
    if (existing) {
      return NextResponse.json({ ok: true, runId: existing.id, alreadyRunning: true });
    }                                                                                                                                                                                                                
  
    const ctx = {                                                                                                                                                                                                    
      userId: user.id,
      resumeSummary: profile.resume_summary,
      techStacks: profile.tech_stacks,
      experience: Number(profile.experience ?? 0),
      location: profile.location.trim(),                                                                                                                                                                             
    };
                                                                                                                                                                                                                     
    // after() schedules work to run AFTER the HTTP response is sent.                                                                                                                                                
    // Next.js's runtime guarantees the callback completes, even though the request is done.
    // This is the same pattern Vercel/Next recommends for background jobs.                                                                                                                                          
    after(async () => {                                                                                                                                                                                              
      try {                                                                                                                                                                                                          
        await runWorkflow(ctx);                                                                                                                                                                                      
      } catch (e) {
        console.error("[run] workflow failed", e);                                                                                                                                                                   
      }
    });                                                                                                                                                                                                              
                  
    return NextResponse.json({ ok: true, started: true });
  }