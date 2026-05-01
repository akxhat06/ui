import type { Job, ScrapeConfig } from "./types";                                                                                                                                                                  
                                                                                                                                                                                                                     
  function normalizeUrl(u: string | undefined): string {
    if (!u) return "";                                                                                                                                                                                               
    try { const url = new URL(u); url.hash = ""; return url.toString(); }                                                                                                                                            
    catch { return u; }
  }                                                                                                                                                                                                                  
                  
  function pickString(obj: Record<string, unknown>, keys: string[]): string {                                                                                                                                        
    for (const k of keys) {
      const v = obj[k];                                                                                                                                                                                              
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);                                                                                                                                                                   
    }                                                                                                                                                                                                                
    return "";
  }                                                                                                                                                                                                                  
                  
  function toJob(raw: unknown, source: string): Job | null {                                                                                                                                                         
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;                                                                                                                                                                        
    const url = normalizeUrl(pickString(o, ["url", "jobUrl", "job_url", "link", "applyUrl"]));                                                                                                                       
    const title = pickString(o, ["title", "jobTitle", "name"]);                                                                                                                                                      
    if (!url || !title) return null;                                                                                                                                                                                 
    return {                                                                                                                                                                                                         
      id: url, url, title,                                                                                                                                                                                           
      company:    pickString(o, ["company", "companyName", "employer"]),
      location:   pickString(o, ["location", "loc", "city", "place"]),                                                                                                                                               
      experience: pickString(o, ["experience", "exp", "experienceText"]),                                                                                                                                            
      postedOn:   pickString(o, ["postedOn", "posted", "postedDate", "date"]) || null,                                                                                                                               
      description: pickString(o, ["description", "jd", "summary", "snippet", "shortDesc"]),                                                                                                                          
      salary:     pickString(o, ["salary", "ctc", "package"]) || undefined,                                                                                                                                          
      source, scrapedAt: new Date().toISOString(),                                                                                                                                                                   
    };                                                                                                                                                                                                               
  }                                                                                                                                                                                                                  
                                                                                                                                                                                                                     
  function extractList(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") {                                                                                                                                                                    
      const o = payload as Record<string, unknown>;
      for (const k of ["jobs", "data", "results", "items", "postings"]) {                                                                                                                                            
        const v = o[k];                                                                                                                                                                                              
        if (Array.isArray(v)) return v;
      }                                                                                                                                                                                                              
    }             
    return [];                                                                                                                                                                                                       
  }               

  async function scrapeOne(
    endpoint: string,
    keywords: string,
    location: string,                                                                                                                                                                                                
    experience: string,
    pages: string                                                                                                                                                                                                    
  ): Promise<Job[]> {
    const base = endpoint.startsWith("http") ? endpoint : `https://${endpoint}`;
    const url = new URL(base);                   
    url.searchParams.set("keywords", keywords);
    url.searchParams.set("location", location);                                                                                                                                                                      
    url.searchParams.set("experience", experience);
    url.searchParams.set("pages", pages);  
    url.searchParams.set("with_applicants", 'true');                                                                                                                                                                          
                  
    console.log(`endpoint url → ${url}`);                                                                                                                                                                           
    const resp = await fetch(url.toString(), {
      headers: { Accept: "application/json" },                                                                                                                                                                       
      cache: "no-store",                                                                                                                                                                                             
    });
    const raw = await resp.text();
    const preview = raw.length > 600 ? `${raw.slice(0, 600)}...<truncated>` : raw;
    console.log(`[scrape] response ${resp.status} ${resp.statusText} for "${location}"`);
    if (!resp.ok) throw new Error(`Scraper ${resp.status} for "${location}" :: ${preview || "<empty>"}`);

    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : [];
    } catch {
      throw new Error(`Scraper returned non-JSON payload for "${location}"`);
    }
    const list = extractList(payload);                                                                                                                                                                               
    const jobs: Job[] = [];
    for (const raw of list) {                                                                                                                                                                                        
      const job = toJob(raw, "naukri");
      if (job) jobs.push(job);                                                                                                                                                                                       
    }                                                                                                                                                                                                                
    console.log(`[scrape] ← ${location}: ${jobs.length} jobs`);
    return jobs;                                                                                                                                                                                                     
  }                                                                                                                                                                                                                  
  
  export async function scrapeJobs(cfg: ScrapeConfig): Promise<Job[]> {                                                                                                                                              
    // Split location by comma so user can target multiple cities — the scraper
    // API only accepts one location per call, so we fan out and merge.                                                                                                                                              
    const locations = cfg.location                                                                                                                                                                                   
      .split(",")                                                                                                                                                                                                    
      .map((s) => s.trim())                                                                                                                                                                                          
      .filter(Boolean);

    if (locations.length === 0) locations.push(""); // fall back to whatever's set                                                                                                                                   
  
    console.log(`[scrape] fanning out across ${locations.length} location(s): ${locations.join(", ")}`);                                                                                                             
                  
    // Run all locations in parallel. Don't let one bad city kill the whole run.                                                                                                                                     
    const results = await Promise.allSettled(
      locations.map((loc) =>                                                                                                                                                                                         
        scrapeOne(cfg.endpoint, cfg.keywords, loc, cfg.experience, cfg.pages)
      )                                                                                                                                                                                                              
    );
                                                                                                                                                                                                                     
    const seen = new Set<string>();
    const merged: Job[] = [];
    let failed = 0;                                                                                                                                                                                                  
  
    for (let i = 0; i < results.length; i++) {                                                                                                                                                                       
      const r = results[i];
      if (r.status === "fulfilled") {
        for (const job of r.value) {
          if (!seen.has(job.url)) {                                                                                                                                                                                  
            seen.add(job.url);
            merged.push(job);                                                                                                                                                                                        
          }       
        }
      } else {
        failed += 1;
        console.error(`[scrape] location "${locations[i]}" failed:`, r.reason);                                                                                                                                      
      }
    }                                                                                                                                                                                                                
                  
    console.log(`[scrape] merged ${merged.length} unique jobs · ${failed} location(s) failed`);                                                                                                                      
  
    if (failed === locations.length) {                                                                                                                                                                               
      throw new Error(`All ${failed} location(s) failed to scrape`);
    }                                                                                                                                                                                                                

  if (merged.length === 0) {
    throw new Error("No jobs found for your current tech skills. Please update tech skills and try again.");
  }
  
    return merged;                                                                                                                                                                                                   
  } 