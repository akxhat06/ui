import { mkdir, readFile, writeFile } from "node:fs/promises";
  import { existsSync } from "node:fs";                                                                                                                                                                              
  import path from "node:path";
  import * as XLSX from "xlsx";                                                                                                                                                                                      
  import type { Job } from "./types";                                                                                                                                                                                
   
  const DATA_DIR = path.join(process.cwd(), "data");                                                                                                                                                                 
  const SHEET = "jobs";
                                                                                                                                                                                                                     
  export function xlsxPathFor(userId: string): string {
    return path.join(DATA_DIR, userId, "jobs.xlsx");                                                                                                                                                                 
  }                                                                                                                                                                                                                  
   
  const HEADERS = [                                                                                                                                                                                                  
    "scrapedAt", "score", "title", "company", "location",
    "experience", "postedOn", "salary", "url", "reason",                                                                                                                                                             
  ];                                                                                                                                                                                                                 
                                                                                                                                                                                                                     
  type Row = Record<string, string | number>;                                                                                                                                                                        
                  
  function jobToRow(j: Job): Row {                                                                                                                                                                                   
    return {
      scrapedAt: j.scrapedAt, score: j.score ?? 0,                                                                                                                                                                   
      title: j.title, company: j.company, location: j.location,
      experience: j.experience, postedOn: j.postedOn ?? "",                                                                                                                                                          
      salary: j.salary ?? "", url: j.url, reason: j.reason ?? "",
    };                                                                                                                                                                                                               
  }               
                                                                                                                                                                                                                     
  async function loadExisting(userId: string): Promise<{ rows: Row[]; urls: Set<string> }> {                                                                                                                         
    const p = xlsxPathFor(userId);
    if (!existsSync(p)) return { rows: [], urls: new Set() };                                                                                                                                                        
    const buf = await readFile(p);                                                                                                                                                                                   
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[SHEET] ?? wb.Sheets[wb.SheetNames[0]];                                                                                                                                                      
    if (!ws) return { rows: [], urls: new Set() };                                                                                                                                                                   
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });                                                                                                                                                  
    const urls = new Set<string>();                                                                                                                                                                                  
    for (const r of rows) {                                                                                                                                                                                          
      const u = String(r.url ?? "").trim();                                                                                                                                                                          
      if (u) urls.add(u);
    }                                                                                                                                                                                                                
    return { rows, urls };
  }                                                                                                                                                                                                                  
                  
  export async function loadSavedUrls(userId: string): Promise<Set<string>> {
    const { urls } = await loadExisting(userId);
    return urls;                                                                                                                                                                                                     
  }
                                                                                                                                                                                                                     
  export async function appendJobs(userId: string, jobs: Job[]): Promise<{ added: number; total: number }> {                                                                                                         
    await mkdir(path.dirname(xlsxPathFor(userId)), { recursive: true });
    const { rows, urls } = await loadExisting(userId);                                                                                                                                                               
                                                                                                                                                                                                                     
    let added = 0;
    for (const j of jobs) {                                                                                                                                                                                          
      if (urls.has(j.url)) continue;
      rows.push(jobToRow(j));                                                                                                                                                                                        
      urls.add(j.url);
      added += 1;                                                                                                                                                                                                    
    }             

    const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });                                                                                                                                                  
    ws["!cols"] = HEADERS.map((h) => {
      if (h === "url" || h === "reason") return { wch: 60 };                                                                                                                                                         
      if (h === "title" || h === "company") return { wch: 32 };                                                                                                                                                      
      return { wch: 16 };                                                                                                                                                                                            
    });                                                                                                                                                                                                              
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, SHEET);                                                                                                                                                                     
    const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    await writeFile(xlsxPathFor(userId), out);                                                                                                                                                                       
                  
    return { added, total: rows.length };                                                                                                                                                                            
  }               

  export async function readJobs(userId: string): Promise<Row[]> {                                                                                                                                                   
    const { rows } = await loadExisting(userId);
    return rows;                                                                                                                                                                                                     
  } 