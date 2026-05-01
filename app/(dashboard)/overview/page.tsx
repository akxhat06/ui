"use client";   

import { useCallback, useEffect, useState } from "react";                                                                                                                                                          

type StepStatus = "idle" | "running" | "done" | "error" | "skipped";                                                                                                                                               
                
type StepRecord = {                                                                                                                                                                                                
  name: "scrape" | "normalize" | "score" | "filter" | "save";
  status: StepStatus;                                                                                                                                                                                              
  startedAt: string | null;
  finishedAt: string | null;                                                                                                                                                                                       
  durationMs: number;
  count: number;                                                                                                                                                                                                   
  message?: string;
};                                                                                                                                                                                                                 
                
type RunRecord = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "done" | "error";                                                                                                                                                                            
  steps: StepRecord[];
  totals: {                                                                                                                                                                                                        
    scraped: number;                                                                                                                                                                                               
    afterDedupe: number;
    scored: number;                                                                                                                                                                                                
    passed: number;
    saved: number;
  };                                                                                                                                                                                                               
  error?: string;
};                                                                                                                                                                                                                 
                
type StatusPayload = {
  current: RunRecord | null;
  latest: RunRecord | null;
  now: string;                                                                                                                                                                                                     
};
                                                                                                                                                                                                                   
type StepMeta = {
  name: StepRecord["name"];
  index: number;                                                                                                                                                                                                   
  title: string;
  hint: string;                                                                                                                                                                                                    
};              

const STEPS: StepMeta[] = [                                                                                                                                                                                        
  { name: "scrape",    index: 1, title: "Scrape",    hint: "Fetch from Naukri" },
  { name: "normalize", index: 2, title: "Dedupe",    hint: "Drop seen URLs" },                                                                                                                                     
  { name: "score",     index: 3, title: "Score",     hint: "OpenAI 0–100" },                                                                                                                                       
  { name: "filter",    index: 4, title: "Filter",    hint: "≥ threshold" },                                                                                                                                        
  { name: "save",      index: 5, title: "Save",      hint: "Append xlsx" },                                                                                                                                        
];                                                                                                                                                                                                                 
                
function fmtRel(iso: string | null): string {                                                                                                                                                                      
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();                                                                                                                                                                 
  const m = Math.floor(ms / 60000);                                                                                                                                                                                
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;                                                                                                                                                                                  
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;                                                                                                                                                                                  
  const d = Math.floor(h / 24);
  return `${d}d ago`;                                                                                                                                                                                              
}
                                                                                                                                                                                                                   
function statusOf(run: RunRecord | null, name: StepRecord["name"]): StepStatus {                                                                                                                                   
  if (!run) return "idle";
  return run.steps.find((s) => s.name === name)?.status ?? "idle";                                                                                                                                                 
}                                                                                                                                                                                                                  

function metricOf(run: RunRecord | null, name: StepRecord["name"]): number | null {                                                                                                                                
  if (!run) return null;
  const s = run.steps.find((st) => st.name === name);                                                                                                                                                              
  if (!s || s.status === "idle") return null;
  return s.count;                                                                                                                                                                                                  
}               
                                                                                                                                                                                                                   
export default function OverviewPage() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);                                                                                                                                                         

  const refresh = useCallback(async () => {                                                                                                                                                                        
    try {       
      const r = await fetch("/api/workflow/status", { cache: "no-store" });                                                                                                                                        
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = (await r.json()) as StatusPayload;                                                                                                                                                              
      setStatus(data);
      setRunning(!!data.current);                                                                                                                                                                                  
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));                                                                                                                                                        
    }
  }, []);                                                                                                                                                                                                          
                
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);                                                                                                                                                                                
  }, [refresh]);
                                                                                                                                                                                                                   
  async function trigger() {
    setError(null);
    setRunning(true);                                                                                                                                                                                              
    try {
      const r = await fetch("/api/workflow/run", { method: "POST" });                                                                                                                                              
      if (!r.ok) throw new Error(`run ${r.status}`);
      await refresh();                                                                                                                                                                                             
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));                                                                                                                                                        
      setRunning(false);
    }                                                                                                                                                                                                              
  }
                                                                                                                                                                                                                   
  const activeRun = status?.current ?? status?.latest ?? null;
  const totals = activeRun?.totals;
                                                                                                                                                                                                                   
  return (
    <div className="max-w-7xl mx-auto">                                                                                                                                                                            
      {/* Header */}
      <header className="border-b border-slate-200 pb-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">                                                                                                                       
          <div>                                                                                                                                                                                                    
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">                                                                                                                           
              Workflow                                                                                                                                                                                             
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">                                                                                                                                 
              Job Hunter Pipeline                                                                                                                                                                                  
            </h1>
          </div>                                                                                                                                                                                                   
          <div className="flex flex-wrap items-center gap-2">
            <button                                                                                                                                                                                                
              onClick={trigger}
              disabled={running}                                                                                                                                                                                   
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >                                                                                                                                                                                                      
              {running && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">                                                                                                                         
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />                                                                                                           
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />                                                                                                
                </svg>                                                                                                                                                                                             
              )}                                                                                                                                                                                                   
              {running ? "Running" : "Run now"}                                                                                                                                                                    
            </button>
            <a
              href="/api/workflow/download"
              className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >                                                                                                                                                                                                      
              Download .xlsx                                                                                                                                                                                       
            </a>                                                                                                                                                                                                   
          </div>                                                                                                                                                                                                   
        </div>  
      </header>

      {/* Top stat strip — only Last run + State */}                                                                                                                                                               
      <section className="grid grid-cols-2 gap-2.5 mb-5">
        <StatCard label="Last run" value={fmtRel(activeRun?.startedAt ?? null)} />                                                                                                                                 
        <StatCard                                                                                                                                                                                                  
          label="State"                                                                                                                                                                                            
          value={activeRun ? activeRun.status : "idle"}                                                                                                                                                            
          tone={                                                                                                                                                                                                   
            activeRun?.status === "running" ? "blue"
              : activeRun?.status === "done" ? "green"                                                                                                                                                             
              : activeRun?.status === "error" ? "red"                                                                                                                                                              
              : "slate"
          }                                                                                                                                                                                                        
        />      
      </section>

      {error && (                                                                                                                                                                                                  
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 break-words">
          {error}                                                                                                                                                                                                  
        </div>  
      )}                                                                                                                                                                                                           
                
      {/* Pipeline */}
      <section className="bg-white border border-slate-200 rounded-md">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200">                                                                                                            
          <h2 className="text-sm font-semibold text-slate-900">Pipeline</h2>                                                                                                                                       
          <span className="text-xs text-slate-500 truncate ml-3">                                                                                                                                                  
            {activeRun ? `Run ${activeRun.id.slice(0, 8)}` : "No runs yet"}                                                                                                                                        
          </span>                                                                                                                                                                                                  
        </div>                                                                                                                                                                                                     
                                                                                                                                                                                                                   
        {/* Horizontal stepper (md+) */}                                                                                                                                                                           
        <div className="hidden md:block px-5 py-6">
          <ol className="flex items-start">                                                                                                                                                                        
            {STEPS.map((meta, idx) => {
              const st = statusOf(activeRun, meta.name);                                                                                                                                                           
              const count = metricOf(activeRun, meta.name);
              return (                                                                                                                                                                                             
                <li key={meta.name} className="flex-1 flex items-start min-w-0">
                  <StepNode meta={meta} status={st} count={count} />                                                                                                                                               
                  {idx < STEPS.length - 1 && <Connector status={st} />}                                                                                                                                            
                </li>                                                                                                                                                                                              
              );                                                                                                                                                                                                   
            })} 
          </ol>                                                                                                                                                                                                    
        </div>
                                                                                                                                                                                                                   
        {/* Vertical stepper (mobile) */}
        <ol className="md:hidden px-4 py-3 divide-y divide-slate-100">
          {STEPS.map((meta) => {                                                                                                                                                                                   
            const st = statusOf(activeRun, meta.name);
            const count = metricOf(activeRun, meta.name);                                                                                                                                                          
            return (
              <li key={meta.name} className="flex items-center gap-3 py-3">                                                                                                                                        
                <StepBadge meta={meta} status={st} />                                                                                                                                                              
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 truncate">{meta.title}</div>                                                                                                                  
                  <div className="text-xs text-slate-500 truncate">{meta.hint}</div>
                </div>                                                                                                                                                                                             
                <div className="flex flex-col items-end flex-none">
                  <StatusPill status={st} />                                                                                                                                                                       
                  {count !== null && (                                                                                                                                                                             
                    <div className="text-sm font-semibold text-slate-900 tabular-nums mt-1">{count}</div>
                  )}                                                                                                                                                                                               
                </div>
              </li>                                                                                                                                                                                                
            );  
          })}                                                                                                                                                                                                      
        </ol>
                                                                                                                                                                                                                   
        {/* Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 border-t border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <Metric label="Scraped"      value={totals?.scraped ?? 0} />                                                                                                                                             
          <Metric label="After dedupe" value={totals?.afterDedupe ?? 0} />                                                                                                                                         
          <Metric label="Scored"       value={totals?.scored ?? 0} />                                                                                                                                              
          <Metric label="Passed"       value={totals?.passed ?? 0} />                                                                                                                                              
          <Metric label="Saved"        value={totals?.saved ?? 0} highlight />
        </div>                                                                                                                                                                                                     
      </section>
    </div>                                                                                                                                                                                                         
  );            
}

function StepNode({
  meta,
  status,
  count,
}: {
  meta: StepMeta;                                                                                                                                                                                                  
  status: StepStatus;
  count: number | null;                                                                                                                                                                                            
}) {            
  return (
    <div className="flex flex-col items-center px-1 min-w-0 flex-none">
      <StepBadge meta={meta} status={status} />                                                                                                                                                                    
      <div className="mt-3 text-center min-w-0 max-w-[140px]">                                                                                                                                                     
        <div className="text-sm font-medium text-slate-900 truncate">{meta.title}</div>                                                                                                                            
        <div className="text-xs text-slate-500 mt-0.5 truncate">{meta.hint}</div>                                                                                                                                  
        <div className="mt-2"><StatusPill status={status} /></div>                                                                                                                                                 
        {count !== null && (                                                                                                                                                                                       
          <div className="mt-2 text-lg font-semibold text-slate-900 tabular-nums">{count}</div>                                                                                                                    
        )}      
      </div>                                                                                                                                                                                                       
    </div>      
  );                                                                                                                                                                                                               
}
                                                                                                                                                                                                                   
function StepBadge({ meta, status }: { meta: StepMeta; status: StepStatus }) {
  const ring =
    status === "running" ? "bg-blue-600 text-white border-blue-600"                                                                                                                                                
    : status === "done"  ? "bg-emerald-600 text-white border-emerald-600"
    : status === "error" ? "bg-red-600 text-white border-red-600"                                                                                                                                                  
    : "bg-white text-slate-500 border-slate-300";                                                                                                                                                                  
  return (                                                                                                                                                                                                         
    <div className={`relative w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-semibold flex-none ${ring}`}>                                                                            
      {status === "done" ? (                                                                                                                                                                                       
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 8.5L6.5 12L13 4.5" strokeLinecap="round" strokeLinejoin="round" />                                                                                                                           
        </svg>                                                                                                                                                                                                     
      ) : status === "error" ? (                                                                                                                                                                                   
        "!"                                                                                                                                                                                                        
      ) : (     
        meta.index                                                                                                                                                                                                 
      )}
      {status === "running" && (                                                                                                                                                                                   
        <span className="absolute inset-0 rounded-full border-2 border-blue-600 animate-ping opacity-50" />
      )}                                                                                                                                                                                                           
    </div>
  );                                                                                                                                                                                                               
}               

function Connector({ status }: { status: StepStatus }) {                                                                                                                                                           
  const color =
    status === "done" ? "bg-emerald-500"                                                                                                                                                                           
    : status === "running" ? "bg-blue-500"
    : status === "error" ? "bg-red-400"                                                                                                                                                                            
    : "bg-slate-200";
  return (                                                                                                                                                                                                         
    <div className="flex-1 mt-[18px] mx-1 min-w-0">
      <div className={`h-0.5 ${color}`} />                                                                                                                                                                         
    </div>
  );                                                                                                                                                                                                               
}               

function StatusPill({ status }: { status: StepStatus }) {                                                                                                                                                          
  const map: Record<StepStatus, { label: string; cls: string }> = {
    idle:    { label: "Idle",    cls: "bg-slate-100 text-slate-600" },                                                                                                                                             
    running: { label: "Running", cls: "bg-blue-50 text-blue-700" },
    done:    { label: "Done",    cls: "bg-emerald-50 text-emerald-700" },                                                                                                                                          
    error:   { label: "Error",   cls: "bg-red-50 text-red-700" },
    skipped: { label: "Skipped", cls: "bg-slate-100 text-slate-500" },                                                                                                                                             
  };            
  const v = map[status];                                                                                                                                                                                           
  return (                                                                                                                                                                                                         
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${v.cls}`}>
      {v.label}                                                                                                                                                                                                    
    </span>     
  );                                                                                                                                                                                                               
}               

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;                                                                                                                                                                                                   
  value: string;
  tone?: "slate" | "blue" | "green" | "red";                                                                                                                                                                       
}) {            
  const toneCls =
    tone === "blue"  ? "text-blue-700"                                                                                                                                                                             
    : tone === "green" ? "text-emerald-700"
    : tone === "red"   ? "text-red-700"                                                                                                                                                                            
    : "text-slate-900";                                                                                                                                                                                            
  return (
    <div className="bg-white border border-slate-200 rounded-md px-3 py-2.5 min-w-0">                                                                                                                              
      <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide truncate">                                                                                                         
        {label}                                                                                                                                                                                                    
      </div>                                                                                                                                                                                                       
      <div className={`mt-1 text-sm sm:text-base font-semibold ${toneCls} capitalize truncate`}>                                                                                                                   
        {value}                                                                                                                                                                                                    
      </div>
    </div>                                                                                                                                                                                                         
  );            
}

function Metric({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {                                                                                                              
  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4 min-w-0">                                                                                                                                                            
      <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide truncate">                                                                                                         
        {label}                                                                                                                                                                                                    
      </div>                                                                                                                                                                                                       
      <div className={`mt-1 text-xl sm:text-2xl font-semibold tabular-nums ${highlight ? "text-blue-700" : "text-slate-900"}`}>                                                                                    
        {value}                                                                                                                                                                                                    
      </div>
    </div>                                                                                                                                                                                                         
  );            
}