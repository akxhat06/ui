import type { Job, ScoreConfig } from "./types";
                                                                                                                                                                                                                     
  const SYSTEM_PROMPT = `You are a recruiter assistant. You will be given a candidate                                                                                                                                
  profile and a job posting. Score the fit on a 0-100 scale and give one short                                                                                                                                       
  reason. Reply ONLY with strict JSON: {"score": <int>, "reason": "<text>"}.                                                                                                                                         
  Higher = better fit. Penalize obvious mismatches (wrong tech, wrong seniority,                                                                                                                                     
  location far from candidate's preference).`;                                                                                                                                                                       
                                                                                                                                                                                                                     
  type OpenAIResponse = { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };                                                                                                       
                                                                                                                                                                                                                     
  function parseScore(content: string): { score: number; reason: string } {                                                                                                                                          
    const cleaned = content.replace(/```json\s*|```\s*/g, "").trim();
    try {                                                                                                                                                                                                            
      const obj = JSON.parse(cleaned);
      return {                                                                                                                                                                                                       
        score: Math.max(0, Math.min(100, Number(obj.score) || 0)),
        reason: String(obj.reason ?? "").slice(0, 240),                                                                                                                                                              
      };
    } catch {                                                                                                                                                                                                        
      const m = cleaned.match(/(\d{1,3})/);                                                                                                                                                                          
      return { score: m ? Math.min(100, Number(m[1])) : 0, reason: cleaned.slice(0, 240) };
    }                                                                                                                                                                                                                
  }                                                                                                                                                                                                                  
                                                                                                                                                                                                                     
  async function scoreOne(job: Job, cfg: ScoreConfig, apiKey: string, resumeText: string): Promise<Job> {                                                                                                            
    const userPrompt = `CANDIDATE:\n${resumeText}\n\nJOB:\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nExperience: ${job.experience}\nDescription: ${job.description.slice(0, 1800)}`;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {                                                                                                                                         
      method: "POST",                                                                                                                                                                                                
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },                                                                                                                            
      body: JSON.stringify({                                                                                                                                                                                         
        model: cfg.model,
        temperature: 0,                                                                                                                                                                                              
        response_format: { type: "json_object" },
        messages: [                                                                                                                                                                                                  
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },                                                                                                                                                                     
        ],        
      }),
    });
    const data = (await resp.json()) as OpenAIResponse;                                                                                                                                                              
    if (!resp.ok) throw new Error(data.error?.message ?? `OpenAI ${resp.status}`);
    const { score, reason } = parseScore(data.choices?.[0]?.message?.content ?? "");                                                                                                                                 
    return { ...job, score, reason };                                                                                                                                                                                
  }                                                                                                                                                                                                                  
                                                                                                                                                                                                                     
  export async function scoreJobs(jobs: Job[], cfg: ScoreConfig, resumeText: string): Promise<Job[]> {                                                                                                               
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");                                                                                                                                                       
    if (!resumeText.trim()) throw new Error("Resume summary is empty — complete your profile.");                                                                                                                     
                                                                                                                                                                                                                     
    const out: Job[] = [];                                                                                                                                                                                           
    const concurrency = 4;                                                                                                                                                                                           
    let cursor = 0;                                                                                                                                                                                                  
    async function worker() {
      while (cursor < jobs.length) {                                                                                                                                                                                 
        const idx = cursor++;                                                                                                                                                                                        
        try { out[idx] = await scoreOne(jobs[idx], cfg, apiKey!, resumeText); }
        catch (e) {                                                                                                                                                                                                  
          const msg = e instanceof Error ? e.message : String(e);
          out[idx] = { ...jobs[idx], score: 0, reason: `score_error: ${msg}` };                                                                                                                                      
        }                                                                                                                                                                                                            
      }
    }                                                                                                                                                                                                                
    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
    return out.filter(Boolean);                                                                                                                                                                                      
  }
