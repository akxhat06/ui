import { NextResponse } from "next/server";
  import { getSupabaseServer } from "@/lib/supabase/server";                                                                                                                                                         
                                                                                                                                                                                                                     
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";                                                                                                                                                                            
  export const maxDuration = 60;

  const SYSTEM_PROMPT = `You generate a concise candidate profile used to match jobs.                                                                                                                                
  
  Return 4–8 short sentences as a single paragraph (no bullet points, no headings,                                                                                                                                   
  no markdown). Cover, in this order:                                                                                                                                                                                
  1. Years of total experience and current/most recent role.                                                                                                                                                         
  2. Top technical skills (frameworks, languages, infra).                                                                                                                                                            
  3. Notable companies, products, or scale.                                                                                                                                                                          
  4. Type of role the candidate is targeting (seniority, function).                                                                                                                                                  
  5. Location / work-mode preference if you can infer it.                                                                                                                                                            
                                                                                                                                                                                                                     
  Use third person ("Candidate is…"). Keep under 800 characters. Be factual, no hype.`;                                                                                                                              
                                                                                                                                                                                                                     
  export async function POST(req: Request) {                                                                                                                                                                         
    const supabase = await getSupabaseServer();                                                                                                                                                                      
    const { data: { user } } = await supabase.auth.getUser();                                                                                                                                                        
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                                                                                                                                                                                                                     
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });                                                                                                                  
                                                                                                                                                                                                                     
    // Decide source: uploaded file in FormData, OR previously-uploaded one in storage.                                                                                                                              
    let buf: Buffer;                                                                                                                                                                                                 
    let filename: string;                                                                                                                                                                                            
    let mime: string;
                                                                                                                                                                                                                     
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
                                                                                                                                                                                                                     
    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {                                                                                                                                                                             
        return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
      }                                                                                                                                                                                                              
      buf = Buffer.from(await file.arrayBuffer());
      filename = file.name;                                                                                                                                                                                          
      mime = file.type;
    } else {                                                                                                                                                                                                         
      const { data: profile } = await supabase
        .from("profiles")
        .select("resume_path, resume_filename")
        .eq("id", user.id)
        .single();                                                                                                                                                                                                   
   
      if (!profile?.resume_path) {                                                                                                                                                                                   
        return NextResponse.json(
          { error: "No resume on file — upload one first." },
          { status: 400 }                                                                                                                                                                                            
        );
      }                                                                                                                                                                                                              
                  
      const { data: blob, error: dlErr } = await supabase.storage
        .from("resumes")
        .download(profile.resume_path);                                                                                                                                                                              
      if (dlErr || !blob) {
        return NextResponse.json(                                                                                                                                                                                    
          { error: dlErr?.message ?? "Could not read your stored resume" },
          { status: 500 }                                                                                                                                                                                            
        );
      }                                                                                                                                                                                                              
      buf = Buffer.from(await blob.arrayBuffer());
      filename = profile.resume_filename ?? "resume.pdf";                                                                                                                                                            
      mime = blob.type || "application/pdf";
    }                                                                                                                                                                                                                
                  
    const isPdf = mime === "application/pdf" || filename.toLowerCase().endsWith(".pdf");                                                                                                                             
    const isText = mime.startsWith("text/") || filename.toLowerCase().endsWith(".txt");
                                                                                                                                                                                                                     
    let userContent: unknown;                                                                                                                                                                                        
    if (isPdf) {                                                                                                                                                                                                     
      userContent = [                                                                                                                                                                                                
        { type: "text", text: "Generate the summary from this resume." },
        {                                                                                                                                                                                                            
          type: "file",
          file: {                                                                                                                                                                                                    
            filename,
            file_data: `data:application/pdf;base64,${buf.toString("base64")}`,
          },                                                                                                                                                                                                         
        },
      ];                                                                                                                                                                                                             
    } else if (isText) {
      userContent = `Resume text:\n\n${buf.toString("utf-8").slice(0, 12000)}`;                                                                                                                                      
    } else {                                                                                                                                                                                                         
      return NextResponse.json(                                                                                                                                                                                      
        { error: `Unsupported file type. Upload a PDF or TXT file.` },                                                                                                                                               
        { status: 400 }
      );                                                                                                                                                                                                             
    }
                                                                                                                                                                                                                     
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({                                                                                                                                                                                         
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,                                                                                                                                                                                            
        messages: [
          { role: "system", content: SYSTEM_PROMPT },                                                                                                                                                                
          { role: "user", content: userContent },
        ],                                                                                                                                                                                                           
      }),
    });                                                                                                                                                                                                              
                  
    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `OpenAI ${resp.status}` },                                                                                                                                                   
        { status: 500 }
      );                                                                                                                                                                                                             
    }             

    const summary = (data.choices?.[0]?.message?.content ?? "").trim();                                                                                                                                              
    return NextResponse.json({ summary });
  }