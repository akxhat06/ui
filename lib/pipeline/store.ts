import { mkdir, readFile, writeFile } from "node:fs/promises";
  import { existsSync } from "node:fs";                                                                                                                                                                              
  import path from "node:path";
  import type { RunRecord } from "./types";                                                                                                                                                                          
                                                                                                                                                                                                                     
  const DATA_DIR = path.join(process.cwd(), "data");
  const MAX_RUNS = 50;                                                                                                                                                                                               
  const STALE_RUN_MS = 10 * 60 * 1000;     // 10 minutes with no activity = dead                                                                                                                                     
  
  const memoryByUser = new Map<string, RunRecord[]>();                                                                                                                                                               
                  
  function pathFor(userId: string): string {                                                                                                                                                                         
    return path.join(DATA_DIR, userId, "runs.json");
  }                                                                                                                                                                                                                  
  
  async function load(userId: string): Promise<RunRecord[]> {                                                                                                                                                        
    if (memoryByUser.has(userId)) return memoryByUser.get(userId)!;
    const p = pathFor(userId);                                                                                                                                                                                       
    if (!existsSync(p)) { memoryByUser.set(userId, []); return []; }
    try {                                                                                                                                                                                                            
      const buf = await readFile(p, "utf8");
      const parsed = JSON.parse(buf) as RunRecord[];                                                                                                                                                                 
      memoryByUser.set(userId, parsed);
      return parsed;                                                                                                                                                                                                 
    } catch {     
      memoryByUser.set(userId, []);                                                                                                                                                                                  
      return [];
    }                                                                                                                                                                                                                
  }               

  async function persist(userId: string): Promise<void> {
    const p = pathFor(userId);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, JSON.stringify(memoryByUser.get(userId) ?? [], null, 2), "utf8");                                                                                                                             
  }                                                                                                                                                                                                                  
                                                                                                                                                                                                                     
  function lastActivityMs(run: RunRecord): number {                                                                                                                                                                  
    let max = new Date(run.startedAt).getTime();
    for (const s of run.steps) {                                                                                                                                                                                     
      if (s.startedAt)  max = Math.max(max, new Date(s.startedAt).getTime());
      if (s.finishedAt) max = Math.max(max, new Date(s.finishedAt).getTime());                                                                                                                                       
    }                                                                                                                                                                                                                
    return max;
  }                                                                                                                                                                                                                  
                  
  /** If a run has been "running" with no step activity for STALE_RUN_MS,                                                                                                                                            
   *  treat it as dead (the server crashed / hot-reloaded mid-run). */
  async function reapStaleRuns(userId: string, runs: RunRecord[]): Promise<boolean> {                                                                                                                                
    let dirty = false;                                                                                                                                                                                               
    for (const r of runs) {                                                                                                                                                                                          
      if (r.status === "running" && Date.now() - lastActivityMs(r) > STALE_RUN_MS) {                                                                                                                                 
        r.status = "error";                                                                                                                                                                                          
        r.error = "Run interrupted (no activity for 10 minutes — server may have restarted)";
        r.finishedAt = new Date().toISOString();                                                                                                                                                                     
        // Mark any still-running steps as error too, so the UI shows where it died.
        for (const s of r.steps) {                                                                                                                                                                                   
          if (s.status === "running") {
            s.status = "error";                                                                                                                                                                                      
            s.message = "interrupted";
            s.finishedAt = r.finishedAt;                                                                                                                                                                             
          }       
        }
        dirty = true;
      }                                                                                                                                                                                                              
    }
    if (dirty) {                                                                                                                                                                                                     
      memoryByUser.set(userId, runs);
      await persist(userId);
    }
    return dirty;                                                                                                                                                                                                    
  }
                                                                                                                                                                                                                     
  export async function listRuns(userId: string): Promise<RunRecord[]> {
    const runs = await load(userId);
    await reapStaleRuns(userId, runs);
    return [...runs].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));                                                                                                                                           
  }                                                                                                                                                                                                                  
                                                                                                                                                                                                                     
  export async function getRun(userId: string, id: string): Promise<RunRecord | undefined> {                                                                                                                         
    const runs = await load(userId);
    return runs.find((r) => r.id === id);
  }                                                                                                                                                                                                                  
  
  export async function getCurrent(userId: string): Promise<RunRecord | undefined> {                                                                                                                                 
    const runs = await load(userId);
    await reapStaleRuns(userId, runs);                                                                                                                                                                               
    return runs.find((r) => r.status === "running");
  }                                                                                                                                                                                                                  
                  
  export async function getLatest(userId: string): Promise<RunRecord | undefined> {                                                                                                                                  
    const runs = await listRuns(userId);
    return runs[0];                                                                                                                                                                                                  
  }               

  export async function upsertRun(userId: string, run: RunRecord): Promise<void> {                                                                                                                                   
    const runs = await load(userId);
    const idx = runs.findIndex((r) => r.id === run.id);                                                                                                                                                              
    if (idx >= 0) runs[idx] = run;
    else runs.unshift(run);                                                                                                                                                                                          
    if (runs.length > MAX_RUNS) runs.length = MAX_RUNS;
    memoryByUser.set(userId, runs);                                                                                                                                                                                  
    await persist(userId);                                                                                                                                                                                           
  }