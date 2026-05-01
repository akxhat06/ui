"use client";   
                                                                                                                                                                                                                     
import { useCallback, useEffect, useMemo, useState } from "react";                                                                                                                                                 
 
type Job = {                                                                                                                                                                                                       
  scrapedAt: string; score: number; title: string; company: string; location: string;
  experience: string; postedOn: string; salary: string; url: string; reason: string;                                                                                                                               
};                                                                                                                                                                                                                 
                                                                                                                                                                                                                   
type SortKey = "score" | "scrapedAt" | "company";                                                                                                                                                                  
type ScoreFilter = "all" | "90" | "80" | "70";
                                                                                                                                                                                                                   
const APPLIED_KEY = "ats:applied-urls";                                                                                                                                                                            
const PAGE_SIZE = 5;                                                                                                                                                                                               
                                                                                                                                                                                                                   
function loadApplied(): Set<string> {
  if (typeof window === "undefined") return new Set();                                                                                                                                                             
  try {                                                                                                                                                                                                            
    const raw = localStorage.getItem(APPLIED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);                                                                                                                                                      
  } catch { return new Set(); }                                                                                                                                                                                    
}
function saveApplied(s: Set<string>) { localStorage.setItem(APPLIED_KEY, JSON.stringify([...s])); }                                                                                                                
                                                                                                                                                                                                                   
function scoreTone(score: number) {
  if (score >= 90) return "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-500/30";                                                                 
  if (score >= 80) return "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-500/30";                                                                                   
  if (score >= 70) return "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-500/30";                                                                             
  return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-slate-700";                                                                                                   
}                                                                                                                                                                                                                  
                                                                                                                                                                                                                   
function fmtDate(s: string): string {                                                                                                                                                                              
  if (!s) return "—";
  const d = new Date(s);                                                                                                                                                                                           
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });                                                                                                                                             
}
                                                                                                                                                                                                                   
export default function ApplyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);                                                                                                                                                                    
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");                                                                                                                                                                          
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [showApplied, setShowApplied] = useState<"all" | "pending" | "applied">("all");                                                                                                                            
  const [sortKey, setSortKey] = useState<SortKey>("score");                                                                                                                                                        
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");                                                                                                                                                  
  const [applied, setApplied] = useState<Set<string>>(new Set());                                                                                                                                                  
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<Job | null>(null);                                                                                                                                                        
  const [refactorToast, setRefactorToast] = useState<string | null>(null);
                                                                                                                                                                                                                   
  useEffect(() => { setApplied(loadApplied()); }, []);
                                                                                                                                                                                                                   
  const refresh = useCallback(async () => {                                                                                                                                                                        
    setLoading(true); setError(null);
    try {                                                                                                                                                                                                          
      const r = await fetch("/api/workflow/jobs", { cache: "no-store" });
      if (!r.ok) throw new Error(`fetch ${r.status}`);                                                                                                                                                             
      const data = await r.json();                                                                                                                                                                                 
      setJobs((data.jobs as Record<string, string | number>[]).map((row) => ({                                                                                                                                     
        scrapedAt: String(row.scrapedAt ?? ""),    score: Number(row.score ?? 0),                                                                                                                                  
        title: String(row.title ?? ""),            company: String(row.company ?? ""),                                                                                                                             
        location: String(row.location ?? ""),      experience: String(row.experience ?? ""),                                                                                                                       
        postedOn: String(row.postedOn ?? ""),      salary: String(row.salary ?? ""),                                                                                                                               
        url: String(row.url ?? ""),                reason: String(row.reason ?? ""),                                                                                                                               
      })));                                                                                                                                                                                                        
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }                                                                                                                                          
    finally { setLoading(false); }                                                                                                                                                                                 
  }, []);
                                                                                                                                                                                                                   
  useEffect(() => { refresh(); }, [refresh]);                                                                                                                                                                      
 
  function toggleApplied(url: string) {                                                                                                                                                                            
    setApplied((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      saveApplied(next); return next;                                                                                                                                                                              
    });
  }                                                                                                                                                                                                                
                
  function setSort(k: SortKey) {                                                                                                                                                                                   
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "company" ? "asc" : "desc"); }                                                                                                                                          
  }                                                                                                                                                                                                                
 
  function handleRefactor(j: Job) {                                                                                                                                                                                
    setRefactorToast(`Resume tailoring queued for "${j.title}" — implementation coming soon`);
    setTimeout(() => setRefactorToast(null), 3500);                                                                                                                                                                
  }                                                                                                                                                                                                                
                                                                                                                                                                                                                   
  const filtered = useMemo(() => {                                                                                                                                                                                 
    const q = query.trim().toLowerCase();
    const min = scoreFilter === "all" ? 0 : Number(scoreFilter);                                                                                                                                                   
    return jobs
      .filter((j) => (q ? (j.title + " " + j.company + " " + j.location).toLowerCase().includes(q) : true))                                                                                                        
      .filter((j) => j.score >= min)                                                                                                                                                                               
      .filter((j) => showApplied === "all" ? true : showApplied === "applied" ? applied.has(j.url) : !applied.has(j.url))                                                                                          
      .sort((a, b) => {                                                                                                                                                                                            
        const dir = sortDir === "asc" ? 1 : -1;                                                                                                                                                                    
        if (sortKey === "score") return (a.score - b.score) * dir;                                                                                                                                                 
        if (sortKey === "company") return a.company.localeCompare(b.company) * dir;
        return a.scrapedAt.localeCompare(b.scrapedAt) * dir;                                                                                                                                                       
      });       
  }, [jobs, query, scoreFilter, showApplied, sortKey, sortDir, applied]);                                                                                                                                          
                
  // Reset page on filter changes                                                                                                                                                                                  
  useEffect(() => { setPage(1); }, [query, scoreFilter, showApplied, sortKey, sortDir]);
                                                                                                                                                                                                                   
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));                                                                                                                                          
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;                                                                                                                                                                    
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);                                                                                                                                              
                                                                                                                                                                                                                   
  const stats = useMemo(() => {                                                                                                                                                                                    
    const total = jobs.length;                                                                                                                                                                                     
    const appliedCount = jobs.filter((j) => applied.has(j.url)).length;
    const avg = total ? Math.round(jobs.reduce((a, j) => a + j.score, 0) / total) : 0;                                                                                                                             
    return { total, applied: appliedCount, pending: total - appliedCount, avg };                                                                                                                                   
  }, [jobs, applied]);                                                                                                                                                                                             
                                                                                                                                                                                                                   
  return (      
    <div className="max-w-7xl mx-auto">                                                                                                                                                                            
      <header className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">                                                                                                                       
          <div>                                                                                                                                                                                                    
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Workspace</div>                                                                                        
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">Apply jobs</h1>                                                                                              
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">                                                                                                                                      
              Read from <code className="font-mono">data/jobs.xlsx</code>                                                                                                                                          
            </div>                                                                                                                                                                                                 
          </div>                                                                                                                                                                                                   
          <div className="flex flex-wrap items-center gap-2">                                                                                                                                                      
            <button onClick={refresh}                                                                                                                                                                              
              className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-2 
rounded-md transition-all hover:shadow-sm">                                                                                                                                                                        
              <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />                                                                                                                                          
                <path d="M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />                                                                                                                               
              </svg>                                                                                                                                                                                               
              Refresh                                                                                                                                                                                              
            </button>                                                                                                                                                                                              
            <a href="/api/workflow/download"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-md transition-all hover:shadow-md">                                         
              Download .xlsx                                                                                                                                                                                       
            </a>                                                                                                                                                                                                   
          </div>                                                                                                                                                                                                   
        </div>                                                                                                                                                                                                     
      </header> 

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">                                                                                                                                             
        <StatCard label="Total"     value={stats.total}   tone="slate" />
        <StatCard label="Applied"   value={stats.applied} tone="blue" />                                                                                                                                           
        <StatCard label="Pending"   value={stats.pending} tone="amber" />
        <StatCard label="Avg score" value={stats.avg}     tone="emerald" suffix="/100" />                                                                                                                          
      </section>                                                                                                                                                                                                   
                                                                                                                                                                                                                   
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 mb-4 flex flex-wrap items-center gap-2">                                                             
        <input  
          type="search" value={query} onChange={(e) => setQuery(e.target.value)}                                                                                                                                   
          placeholder="Search title, company, location…"
          className="flex-1 min-w-[180px] px-3 py-1.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400    
dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"                                                                             
        />                                                                                                                                                                                                         
        <PillGroup value={scoreFilter} onChange={(v) => setScoreFilter(v as ScoreFilter)}                                                                                                                          
          options={[                                                                                                                                                                                               
            { v: "all", label: "All scores" },
            { v: "70",  label: "≥ 70" },                                                                                                                                                                           
            { v: "80",  label: "≥ 80" },                                                                                                                                                                           
            { v: "90",  label: "≥ 90" },
          ]} />                                                                                                                                                                                                    
        <PillGroup value={showApplied} onChange={(v) => setShowApplied(v as typeof showApplied)}
          options={[                                                                                                                                                                                               
            { v: "all",     label: `All (${jobs.length})` },
            { v: "pending", label: `Pending (${stats.pending})` },                                                                                                                                                 
            { v: "applied", label: `Applied (${stats.applied})` },                                                                                                                                                 
          ]} />                                                                                                                                                                                                    
      </div>                                                                                                                                                                                                       
                
      {error && (
        <div className="mb-4 rounded-md border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-400">{error}</div>
      )}                                                                                                                                                                                                           

      {loading && jobs.length === 0 ? (                                                                                                                                                                            
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-12 text-center text-sm text-slate-500 dark:text-slate-400">
          Loading jobs from sheet…                                                                                                                                                                                 
        </div>
      ) : jobs.length === 0 ? (                                                                                                                                                                                    
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-12 text-center">                                                                                     
          <div className="text-base font-medium text-slate-900 dark:text-slate-100">No jobs in the sheet yet</div>                                                                                                 
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">                                                                                                                                        
            Go to Overview and hit "Run now" to populate the pipeline.                                                                                                                                             
          </div>                                                                                                                                                                                                   
        </div>                                                                                                                                                                                                     
      ) : (                                                                                                                                                                                                        
        <>                                                                                                                                                                                                         
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
            <div className="overflow-x-auto">                                                                                                                                                                      
              <table className="w-full text-sm min-w-[920px]">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">                                                                                               
                  <tr>                                                                                                                                                                                             
                    <Th onClick={() => setSort("score")} sorted={sortKey === "score" ? sortDir : undefined}>Score</Th>                                                                                             
                    <Th>Role</Th>                                                                                                                                                                                  
                    <Th onClick={() => setSort("company")} sorted={sortKey === "company" ? sortDir : undefined}>Company</Th>
                    <Th>Location</Th>                                                                                                                                                                              
                    <Th onClick={() => setSort("scrapedAt")} sorted={sortKey === "scrapedAt" ? sortDir : undefined}>Scraped</Th>                                                                                   
                    <Th align="right">Actions</Th>                                                                                                                                                                 
                  </tr>                                                                                                                                                                                            
                </thead>                                                                                                                                                                                           
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((j) => {                                                                                                                                                                          
                    const isApplied = applied.has(j.url);
                    return (                                                                                                                                                                                       
                      <tr key={j.url} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isApplied ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3">                                                                                                                                                                 
                          <span className={`inline-flex items-center justify-center w-11 h-7 rounded-md font-bold tabular-nums ring-1 ${scoreTone(j.score)}`}>
                            {j.score}                                                                                                                                                                              
                          </span>
                        </td>                                                                                                                                                                                      
                        <td className="px-4 py-3 max-w-[260px]">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate" title={j.title}>{j.title}</div>                                                                                 
                          {j.experience && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{j.experience}</div>}                                                                       
                        </td>                                                                                                                                                                                      
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={j.company}>{j.company}</td>                                                                     
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{j.location || "—"}</td>                                                                                              
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-mono whitespace-nowrap">{fmtDate(j.scrapedAt)}</td>                                                               
                        <td className="px-4 py-3">                                                                                                                                                                 
                          <RowActions                                                                                                                                                                              
                            applied={isApplied}                                                                                                                                                                    
                            onToggle={() => toggleApplied(j.url)}
                            onView={() => setDetails(j)}                                                                                                                                                           
                            onRefactor={() => handleRefactor(j)}
                            url={j.url}                                                                                                                                                                            
                          />                                                                                                                                                                                       
                        </td>
                      </tr>                                                                                                                                                                                        
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No jobs match the current filters.</td></tr>
                  )}                                                                                                                                                                                               
                </tbody>
              </table>                                                                                                                                                                                             
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paginated.map((j) => {
              const isApplied = applied.has(j.url);                                                                                                                                                                
              return (
                <div key={j.url}                                                                                                                                                                                   
                  className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 transition-opacity ${isApplied ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">                                                                                                                                         
                    <div className="min-w-0">                                                                                                                                                                      
                      <div className="font-medium text-slate-900 dark:text-slate-100 leading-snug">{j.title}</div>                                                                                                 
                      <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{j.company}</div>                                                                                                         
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">                                                                                                                          
                        {j.location || "—"}{j.experience ? ` · ${j.experience}` : ""}                                                                                                                              
                      </div>                                                                                                                                                                                       
                    </div>
                    <span className={`flex-none inline-flex items-center justify-center w-12 h-8 rounded-md font-bold tabular-nums ring-1 text-sm ${scoreTone(j.score)}`}>                                         
                      {j.score}                                                                                                                                                                                    
                    </span>                                                                                                                                                                                        
                  </div>                                                                                                                                                                                           
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">                                                                              
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{fmtDate(j.scrapedAt)}</span>                                                                                       
                    <RowActions                                                                                                                                                                                    
                      applied={isApplied}                                                                                                                                                                          
                      onToggle={() => toggleApplied(j.url)}                                                                                                                                                        
                      onView={() => setDetails(j)}                                                                                                                                                                 
                      onRefactor={() => handleRefactor(j)}
                      url={j.url}                                                                                                                                                                                  
                    />
                  </div>
                </div>
              );                                                                                                                                                                                                   
            })}
            {paginated.length === 0 && (                                                                                                                                                                           
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No jobs match the current filters.                                                                                                                                                                 
              </div>
            )}                                                                                                                                                                                                     
          </div>
                                                                                                                                                                                                                   
          {/* Pagination */}
          <Pagination                                                                                                                                                                                              
            page={safePage} totalPages={totalPages}
            pageStart={pageStart} pageEnd={Math.min(pageStart + PAGE_SIZE, filtered.length)} total={filtered.length}                                                                                               
            onPage={setPage}                                                                                                                                                                                       
          />                                                                                                                                                                                                       
        </>                                                                                                                                                                                                        
      )}        

      {/* Details modal */}
      {details && <DetailsModal job={details} applied={applied.has(details.url)} onClose={() => setDetails(null)} onToggle={() => toggleApplied(details.url)} />}
                                                                                                                                                                                                                   
      {/* Refactor toast */}
      {refactorToast && (                                                                                                                                                                                          
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 text-sm font-medium px-4 py-2.5 rounded-md shadow-2xl border border-slate-800 
dark:border-slate-200 animate-[fade-in_0.2s_ease-out]">                                                                                                                                                            
          {refactorToast}
          <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>                                                                  
        </div>                                                                                                                                                                                                     
      )}
    </div>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}
                                                                                                                                                                                                                   
function RowActions({ applied, onToggle, onView, onRefactor, url }: {
  applied: boolean; onToggle: () => void; onView: () => void; onRefactor: () => void; url: string;
}) {                                                                                                                                                                                                               
  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">                                                                                                                                              
      <IconButton title="View details" onClick={onView}>                                                                                                                                                           
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
      </IconButton>                                                                                                                                                                                                
      <IconButton title="Refactor resume" onClick={onRefactor}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8"
 /><path d="M9 13l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>                                                                                                                                   
      </IconButton>                                                                                                                                                                                                
      <button onClick={onToggle}                                                                                                                                                                                   
        className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
          applied                                                                                                                                                                                                  
            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 ring-1 ring-emerald-200 dark:ring-emerald-500/30"
            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"                                                                                       
        }`}>                                                                                                                                                                                                       
        {applied ? "✓ Applied" : "Mark applied"}                                                                                                                                                                   
      </button>                                                                                                                                                                                                    
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors">                                                                                         
        Apply →                                                                                                                                                                                                    
      </a>                                                                                                                                                                                                         
    </div>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}               

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {                                                                                             
  return (
    <button onClick={onClick} title={title} aria-label={title}                                                                                                                                                     
      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 
transition-colors">                                                                                                                                                                                                
      {children}
    </button>                                                                                                                                                                                                      
  );            
}

function Pagination({ page, totalPages, pageStart, pageEnd, total, onPage }: {                                                                                                                                     
  page: number; totalPages: number; pageStart: number; pageEnd: number; total: number; onPage: (n: number) => void;
}) {                                                                                                                                                                                                               
  const numbers = pageNumbers(page, totalPages);
  return (                                                                                                                                                                                                         
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">                                                                                                              
      <div className="text-slate-500 dark:text-slate-400">                                                                                                                                                         
        Showing <span className="font-medium text-slate-700 dark:text-slate-200">{total === 0 ? 0 : pageStart + 1}–{pageEnd}</span> of <span className="font-medium text-slate-700                                 
dark:text-slate-200">{total}</span>                                                                                                                                                                                
      </div>    
      <div className="flex items-center gap-1">                                                                                                                                                                    
        <PageBtn disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</PageBtn>                                                                                                                            
        {numbers.map((n, i) =>                                                                                                                                                                                     
          n === "…" ? (                                                                                                                                                                                            
            <span key={`e${i}`} className="px-2 text-slate-400">…</span>                                                                                                                                           
          ) : (                                                                                                                                                                                                    
            <PageBtn key={n} active={n === page} onClick={() => onPage(n)}>{n}</PageBtn>
          )                                                                                                                                                                                                        
        )}      
        <PageBtn disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next →</PageBtn>                                                                                                                   
      </div>                                                                                                                                                                                                       
    </div>
  );                                                                                                                                                                                                               
}               

function PageBtn({ children, onClick, active, disabled }: { children: React.ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean }) {                                                             
  return (
    <button onClick={onClick} disabled={disabled}                                                                                                                                                                  
      className={`min-w-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${                                                                                                                     
        active                                                                                                                                                                                                     
          ? "bg-blue-600 text-white"                                                                                                                                                                               
          : disabled                                                                                                                                                                                               
          ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
          : "text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"                                                
      }`}>                                                                                                                                                                                                         
      {children}                                                                                                                                                                                                   
    </button>                                                                                                                                                                                                      
  );            
}

function pageNumbers(page: number, total: number): (number | "…")[] {                                                                                                                                              
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];                                                                                                                                                                               
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);                                                                                                                                                                       
  if (start > 2) out.push("…");                                                                                                                                                                                    
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");                                                                                                                                                                              
  out.push(total);
  return out;                                                                                                                                                                                                      
}               

function DetailsModal({ job, applied, onClose, onToggle }: { job: Job; applied: boolean; onClose: () => void; onToggle: () => void }) {                                                                            
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };                                                                                                                                    
    window.addEventListener("keydown", onKey);                                                                                                                                                                     
    return () => window.removeEventListener("keydown", onKey);                                                                                                                                                     
  }, [onClose]);                                                                                                                                                                                                   
                                                                                                                                                                                                                   
  return (      
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />                                                                                                                      
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-lg sm:rounded-lg shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">     
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">                                                                                         
          <div className="min-w-0">                                                                                                                                                                                
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Job details</div>                                                                                      
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{job.title}</h2>                                                                                                       
            <div className="text-sm text-slate-700 dark:text-slate-300">{job.company}</div>                                                                                                                        
          </div>                                                                                                                                                                                                   
          <span className={`flex-none inline-flex items-center justify-center w-14 h-9 rounded-md font-bold tabular-nums ring-1 text-base ${scoreTone(job.score)}`}>                                               
            {job.score}                                                                                                                                                                                            
          </span>
          <button onClick={onClose} aria-label="Close"                                                                                                                                                             
            className="flex-none w-8 h-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>                                           
          </button>                                                                                                                                                                                                
        </div>                                                                                                                                                                                                     
                                                                                                                                                                                                                   
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">                                                                                                                                               
          <Definition label="Location"   value={job.location || "—"} />
          <Definition label="Experience" value={job.experience || "—"} />                                                                                                                                          
          <Definition label="Salary"     value={job.salary || "—"} />
          <Definition label="Posted"     value={job.postedOn || "—"} />                                                                                                                                            
          <Definition label="Scraped"    value={job.scrapedAt || "—"} mono />
          <Definition label="URL"        value={job.url} mono link />                                                                                                                                              
          <div>                                                                                                                                                                                                    
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Why this matched</div>                                                                            
            <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md p-3">                             
              {job.reason || <span className="text-slate-500 italic">No reason recorded.</span>}                                                                                                                   
            </div>                                                                                                                                                                                                 
          </div>                                                                                                                                                                                                   
        </div>                                                                                                                                                                                                     
                
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2 bg-slate-50 dark:bg-slate-900/50">                                                 
          <button onClick={onToggle}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${                                                                                                                            
              applied
                ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"                                                                                                                              
            }`}>
            {applied ? "✓ Applied" : "Mark applied"}                                                                                                                                                               
          </button>                                                                                                                                                                                                
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white">                                                                                                       
            Open posting →                                                                                                                                                                                         
          </a>                                                                                                                                                                                                     
        </div>                                                                                                                                                                                                     
      </div>                                                                                                                                                                                                       
    </div>      
  );
}

function Definition({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: boolean }) {                                                                                              
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 text-sm">                                                                                                                                                     
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>                                                                                                                                              
      <dd className={`${mono ? "font-mono text-xs" : ""} text-slate-900 dark:text-slate-100 break-all min-w-0`}>
        {link ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-400 hover:underline">{value}</a> : value}                                                        
      </dd>                                                                                                                                                                                                        
    </div>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}               

function StatCard({ label, value, tone, suffix }: {                                                                                                                                                                
  label: string; value: number; tone: "slate" | "blue" | "amber" | "emerald"; suffix?: string;
}) {                                                                                                                                                                                                               
  const text = tone === "blue" ? "text-blue-700 dark:text-blue-400"
    : tone === "amber" ? "text-amber-700 dark:text-amber-400"                                                                                                                                                      
    : tone === "emerald" ? "text-emerald-700 dark:text-emerald-400"
    : "text-slate-900 dark:text-slate-100";                                                                                                                                                                        
  const dot = tone === "blue" ? "bg-blue-500" : tone === "amber" ? "bg-amber-500" : tone === "emerald" ? "bg-emerald-500" : "bg-slate-400";
  return (                                                                                                                                                                                                         
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-4 py-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5">                                                                                                                                                                  
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />                                                                                                                                                     
        <span className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</span>                                                                          
      </div>                                                                                                                                                                                                       
      <div className={`mt-1 text-xl sm:text-2xl font-bold tabular-nums ${text}`}>
        {value.toLocaleString()}                                                                                                                                                                                   
        {suffix && <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-0.5">{suffix}</span>}                                                                                                
      </div>                                                                                                                                                                                                       
    </div>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}               

function PillGroup<T extends string>({ value, onChange, options }: {                                                                                                                                               
  value: T; onChange: (v: T) => void; options: Array<{ v: T; label: string }>;
}) {                                                                                                                                                                                                               
  return (      
    <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">                                                                                                                                  
      {options.map((o) => {                                                                                                                                                                                        
        const active = value === o.v;
        return (                                                                                                                                                                                                   
          <button key={o.v} onClick={() => onChange(o.v)}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${                                                                                                                               
              active
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"                                                                                                                        
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"                                                                                                              
            }`}>                                                                                                                                                                                                   
            {o.label}                                                                                                                                                                                              
          </button>                                                                                                                                                                                                
        );      
      })}
    </div>
  );
}

function Th({ children, onClick, sorted, align = "left" }: {                                                                                                                                                       
  children: React.ReactNode; onClick?: () => void; sorted?: "asc" | "desc"; align?: "left" | "right";
}) {                                                                                                                                                                                                               
  const sortable = !!onClick;
  return (                                                                                                                                                                                                         
    <th onClick={onClick}
      className={`px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide select-none ${                                                                                      
        align === "right" ? "text-right" : "text-left"                                                                                                                                                             
      } ${sortable ? "cursor-pointer hover:text-slate-900 dark:hover:text-slate-200" : ""}`}>
      <span className="inline-flex items-center gap-1">                                                                                                                                                            
        {children}                                                                                                                                                                                                 
        {sortable && (                                                                                                                                                                                             
          <span className={`text-[9px] ${sorted ? "text-blue-600 dark:text-blue-400" : "text-slate-300 dark:text-slate-600"}`}>                                                                                    
            {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}                                                                                                                                               
          </span>                                                                                                                                                                                                  
        )}                                                                                                                                                                                                         
      </span>                                                                                                                                                                                                      
    </th>       
  );
}
