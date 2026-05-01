"use client";
                                                                                                                                                                                                                     
import { useCallback, useEffect, useMemo, useRef, useState } from "react";                                                                                                                                         
 
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
  totals: { scraped: number; afterDedupe: number; scored: number; passed: number; saved: number };
  error?: string;                                                                                                                                                                                                  
};                                                                                                                                                                                                                 
                                                                                                                                                                                                                   
type StatusPayload = { current: RunRecord | null; latest: RunRecord | null; now: string };                                                                                                                         
                
type LogLine = { ts: string; level: "info" | "warn" | "error"; step?: StepRecord["name"]; message: string };                                                                                                       
                
type StepMeta = { name: StepRecord["name"]; index: number; title: string; hint: string };                                                                                                                          
                
const STEPS: StepMeta[] = [                                                                                                                                                                                        
  { name: "scrape",    index: 1, title: "Scrape",    hint: "Fetch from Naukri" },
  { name: "normalize", index: 2, title: "Dedupe",    hint: "Drop seen URLs" },                                                                                                                                     
  { name: "score",     index: 3, title: "Score",     hint: "OpenAI 0–100" },
  { name: "filter",    index: 4, title: "Filter",    hint: "≥ threshold" },                                                                                                                                        
  { name: "save",      index: 5, title: "Save",      hint: "Append xlsx" },                                                                                                                                        
];                                                                                                                                                                                                                 
                                                                                                                                                                                                                   
type Tone = "blue" | "indigo" | "violet" | "amber" | "emerald";                                                                                                                                                    
const METRICS: Array<{ key: keyof RunRecord["totals"]; label: string; tone: Tone }> = [
  { key: "scraped",     label: "Scraped",      tone: "blue"    },                                                                                                                                                  
  { key: "afterDedupe", label: "After dedupe", tone: "indigo"  },                                                                                                                                                  
  { key: "scored",      label: "Scored",       tone: "violet"  },                                                                                                                                                  
  { key: "passed",      label: "Passed",       tone: "amber"   },                                                                                                                                                  
  { key: "saved",       label: "Saved",        tone: "emerald" },
];                                                                                                                                                                                                                 
                
const TONE_BG: Record<Tone, string> = {                                                                                                                                                                            
  blue:    "from-blue-500/10 to-blue-500/0    border-blue-200    dark:border-blue-500/30",
  indigo:  "from-indigo-500/10 to-indigo-500/0 border-indigo-200 dark:border-indigo-500/30",                                                                                                                       
  violet:  "from-violet-500/10 to-violet-500/0 border-violet-200 dark:border-violet-500/30",
  amber:   "from-amber-500/10 to-amber-500/0  border-amber-200  dark:border-amber-500/30",                                                                                                                         
  emerald: "from-emerald-500/10 to-emerald-500/0 border-emerald-200 dark:border-emerald-500/30",                                                                                                                   
};                                                                                                                                                                                                                 
const TONE_TEXT: Record<Tone, string> = {                                                                                                                                                                          
  blue: "text-blue-700 dark:text-blue-400", indigo: "text-indigo-700 dark:text-indigo-400",                                                                                                                        
  violet: "text-violet-700 dark:text-violet-400", amber: "text-amber-700 dark:text-amber-400",                                                                                                                     
  emerald: "text-emerald-700 dark:text-emerald-400",                                                                                                                                                               
};                                                                                                                                                                                                                 
const TONE_DOT: Record<Tone, string> = {                                                                                                                                                                           
  blue: "bg-blue-500", indigo: "bg-indigo-500", violet: "bg-violet-500",                                                                                                                                           
  amber: "bg-amber-500", emerald: "bg-emerald-500",
};                                                                                                                                                                                                                 
                
function fmtRel(iso: string | null): string {                                                                                                                                                                      
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();                                                                                                                                                                 
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";                                                                                                                                                                                    
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);                                                                                                                                                                                    
  if (h < 24) return `${h}h ago`;                                                                                                                                                                                  
  return `${Math.floor(h / 24)}d ago`;
}                                                                                                                                                                                                                  
                
function fmtTime(iso: string): string {                                                                                                                                                                            
  return new Date(iso).toLocaleTimeString([], { hour12: false });
}                                                                                                                                                                                                                  
                
function statusOf(run: RunRecord | null, name: StepRecord["name"]): StepStatus {                                                                                                                                   
  if (!run) return "idle";
  return run.steps.find((s) => s.name === name)?.status ?? "idle";                                                                                                                                                 
}               
                                                                                                                                                                                                                   
function buildLogs(run: RunRecord | null): LogLine[] {                                                                                                                                                             
  if (!run) return [];
  const logs: LogLine[] = [{ ts: run.startedAt, level: "info", message: `Run ${run.id.slice(0, 8)} started` }];                                                                                                    
  for (const s of run.steps) {                                                                                                                                                                                     
    if (s.startedAt) logs.push({ ts: s.startedAt, level: "info", step: s.name, message: `${s.name}: started` });                                                                                                   
    if (s.finishedAt) {                                                                                                                                                                                            
      if (s.status === "error")                                                                                                                                                                                    
        logs.push({ ts: s.finishedAt, level: "error", step: s.name, message: `${s.name}: failed — ${s.message ?? "unknown"}` });                                                                                   
      else                                                                                                                                                                                                         
        logs.push({ ts: s.finishedAt, level: "info", step: s.name,                                                                                                                                                 
          message: `${s.name}: done · ${s.count} items · ${s.durationMs}ms${s.message ? ` · ${s.message}` : ""}` });                                                                                               
    }                                                                                                                                                                                                              
  }                                                                                                                                                                                                                
  if (run.finishedAt)                                                                                                                                                                                              
    logs.push({ ts: run.finishedAt, level: run.status === "error" ? "error" : "info",
      message: `Run finished: ${run.status}${run.error ? ` (${run.error})` : ""}` });                                                                                                                              
  return logs.sort((a, b) => a.ts.localeCompare(b.ts));                                                                                                                                                            
}                                                                                                                                                                                                                  
                                                                                                                                                                                                                   
export default function OverviewPage() {                                                                                                                                                                           
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [running, setRunning] = useState(false);                                                                                                                                                                   
  const [error, setError] = useState<string | null>(null);                                                                                                                                                         
  const logsRef = useRef<HTMLDivElement>(null);
                                                                                                                                                                                                                   
  const refresh = useCallback(async () => {
    try {                                                                                                                                                                                                          
      const r = await fetch("/api/workflow/status", { cache: "no-store" });
      if (!r.ok) throw new Error(`status ${r.status}`);                                                                                                                                                            
      const data = (await r.json()) as StatusPayload;                                                                                                                                                              
      setStatus(data); setRunning(!!data.current);                                                                                                                                                                 
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }                                                                                                                                          
  }, []);                                                                                                                                                                                                          

  useEffect(() => { refresh(); const id = setInterval(refresh, 2000); return () => clearInterval(id); }, [refresh]);                                                                                               
                
  async function trigger() {                                                                                                                                                                                       
    setError(null); setRunning(true);
    try {                                                                                                                                                                                                          
      const r = await fetch("/api/workflow/run", { method: "POST" });
      if (!r.ok) throw new Error(`run ${r.status}`);                                                                                                                                                               
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setRunning(false); }                                                                                                                       
  }
                                                                                                                                                                                                                   
  const activeRun = status?.current ?? status?.latest ?? null;                                                                                                                                                     
  const totals = activeRun?.totals;
  const logs = useMemo(() => buildLogs(activeRun), [activeRun]);                                                                                                                                                   
                                                                                                                                                                                                                   
  useEffect(() => { if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight; }, [logs.length]);                                                                                              
                                                                                                                                                                                                                   
  return (                                                                                                                                                                                                         
    <div className="max-w-7xl mx-auto">
      <header className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">                                                                                                                               
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>                                                                                                                                                                                                    
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Workflow</div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">Job Hunter Pipeline</h1>                                                                                     
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">                                                                                                                                      
              {activeRun ? (                                                                                                                                                                                       
                <>                                                                                                                                                                                                 
                  Last run <span className="text-slate-700 dark:text-slate-300 font-medium">{fmtRel(activeRun.startedAt)}</span>                                                                                   
                  {" · "}                                                                                                                                                                                          
                  <span className={
                    activeRun.status === "running" ? "text-blue-700 dark:text-blue-400 font-medium"                                                                                                                
                    : activeRun.status === "done"  ? "text-emerald-700 dark:text-emerald-400 font-medium"                                                                                                          
                    : "text-red-700 dark:text-red-400 font-medium"                                                                                                                                                 
                  }>{activeRun.status}</span>                                                                                                                                                                      
                </>                                                                                                                                                                                                
              ) : "No runs yet"}
            </div>                                                                                                                                                                                                 
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={trigger} disabled={running}                                                                                                                                                           
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed 
transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">                                                                                                                                                  
              {running && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">                                                                                                                         
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />                                                                                                           
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />                                                                                                
                </svg>                                                                                                                                                                                             
              )}                                                                                                                                                                                                   
              {running ? "Running" : "Run now"}                                                                                                                                                                    
            </button>                                                                                                                                                                                              
            <a href="/api/workflow/download"
              className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-2   
rounded-md transition-all hover:shadow-sm hover:-translate-y-0.5">                                                                                                                                                 
              Download .xlsx
            </a>                                                                                                                                                                                                   
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5" style={{ perspective: "1200px" }}>                                                                                            
        {METRICS.map((m) => (
          <MetricCard key={m.key} meta={m} value={totals?.[m.key] ?? 0} running={running} />                                                                                                                       
        ))}                                                                                                                                                                                                        
      </section>
                                                                                                                                                                                                                   
      {error && (
        <div className="mb-5 rounded-md border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-400 break-words">
          {error}                                                                                                                                                                                                  
        </div>
      )}                                                                                                                                                                                                           
                
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm mb-5 overflow-hidden">                                                                     
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pipeline</h2>                                                                                                                   
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate ml-3 font-mono">
            {activeRun ? `Run ${activeRun.id.slice(0, 8)}` : "No runs yet"}                                                                                                                                        
          </span>                                                                                                                                                                                                  
        </div>                                                                                                                                                                                                     
                                                                                                                                                                                                                   
        <div className="hidden md:block px-6 py-8" style={{ perspective: "1400px" }}>                                                                                                                              
          <ol className="flex items-start" style={{ transformStyle: "preserve-3d" }}>
            {STEPS.map((meta, idx) => {                                                                                                                                                                            
              const st = statusOf(activeRun, meta.name);                                                                                                                                                           
              return (                                                                                                                                                                                             
                <li key={meta.name} className="flex-1 flex items-start min-w-0">                                                                                                                                   
                  <StepNode meta={meta} status={st} />                                                                                                                                                             
                  {idx < STEPS.length - 1 && <Connector status={st} />}                                                                                                                                            
                </li>                                                                                                                                                                                              
              );                                                                                                                                                                                                   
            })} 
          </ol>                                                                                                                                                                                                    
        </div>
                                                                                                                                                                                                                   
        <ol className="md:hidden px-4 py-4 space-y-1">                                                                                                                                                             
          {STEPS.map((meta, idx) => {
            const st = statusOf(activeRun, meta.name);                                                                                                                                                             
            const last = idx === STEPS.length - 1;
            return (                                                                                                                                                                                               
              <li key={meta.name} className="relative flex items-start gap-3 pb-4 last:pb-0">
                {!last && (                                                                                                                                                                                        
                  <span className={`absolute left-[18px] top-10 bottom-0 w-0.5 ${
                    st === "done" ? "bg-emerald-400"                                                                                                                                                               
                    : st === "running" ? "bg-blue-400"                                                                                                                                                             
                    : "bg-slate-200 dark:bg-slate-700"                                                                                                                                                             
                  }`} />                                                                                                                                                                                           
                )}
                <StepBadge meta={meta} status={st} />                                                                                                                                                              
                <div className="min-w-0 flex-1 pt-1.5">
                  <div className="flex items-center justify-between gap-2">                                                                                                                                        
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{meta.title}</div>
                    <StatusPill status={st} />                                                                                                                                                                     
                  </div>                                                                                                                                                                                           
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.hint}</div>                                                                                                             
                </div>                                                                                                                                                                                             
              </li>
            );                                                                                                                                                                                                     
          })}   
        </ol>
      </section>

      <section className="bg-slate-950 dark:bg-black text-slate-100 border border-slate-800 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden">                                                           
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2">                                                                                                                                                                
            <span className="flex gap-1.5">                                                                                                                                                                        
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />                                                                                                                                          
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />                                                                                                                                        
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </span>                                                                                                                                                                                                
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider ml-2">Logs</h2>
            {running && (                                                                                                                                                                                          
              <span className="ml-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-blue-400">                                                                                                       
                <span className="relative flex h-1.5 w-1.5">                                                                                                                                                       
                  <span className="animate-ping absolute inset-0 rounded-full bg-blue-400 opacity-75" />                                                                                                           
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />                                                                                                                   
                </span>                                                                                                                                                                                            
                LIVE                                                                                                                                                                                               
              </span>                                                                                                                                                                                              
            )}  
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {logs.length} line{logs.length === 1 ? "" : "s"}
          </span>                                                                                                                                                                                                  
        </div>
        <div ref={logsRef} className="h-72 sm:h-80 overflow-y-auto px-4 sm:px-5 py-3 font-mono text-xs leading-relaxed scroll-smooth">                                                                             
          {logs.length === 0 ? (                                                                                                                                                                                   
            <div className="text-slate-500 italic">No logs yet — hit "Run now" to start the pipeline.</div>
          ) : logs.map((l, i) => <LogRow key={i} line={l} />)}                                                                                                                                                     
        </div>                                                                                                                                                                                                     
      </section>                                                                                                                                                                                                   
    </div>                                                                                                                                                                                                         
  );            
}

function MetricCard({ meta, value, running }: {                                                                                                                                                                    
  meta: { key: keyof RunRecord["totals"]; label: string; tone: Tone };
  value: number; running: boolean;                                                                                                                                                                                 
}) {            
  return (                                                                                                                                                                                                         
    <div
      className={`group relative bg-gradient-to-br ${TONE_BG[meta.tone]} bg-white dark:bg-slate-900 border rounded-lg px-4 py-3.5 shadow-sm transition-all duration-300 hover:shadow-lg cursor-default             
overflow-hidden`}                                                                                                                                                                                                  
      style={{ transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {                                                                                                                                                                                        
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();                                                                                                                                                                 
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;                                                                                                                                                      
        card.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(4px)`;                                                                                                                       
      }}                                                                                                                                                                                                           
      onMouseLeave={(e) => { e.currentTarget.style.transform = "rotateY(0) rotateX(0) translateZ(0)"; }}                                                                                                           
    >                                                                                                                                                                                                              
      <span className={`pointer-events-none absolute -top-6 -right-6 w-16 h-16 rounded-full ${TONE_DOT[meta.tone]} opacity-10 dark:opacity-20 blur-xl`} />
      <div className="flex items-center gap-1.5">                                                                                                                                                                  
        <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[meta.tone]}`} />                                                                                                                                     
        <span className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">{meta.label}</span>                                                            
      </div>                                                                                                                                                                                                       
      <div className={`mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums ${TONE_TEXT[meta.tone]}`}>{value.toLocaleString()}</div>                                                                                 
      {running && (                                                                                                                                                                                                
        <div className="mt-1 h-0.5 w-full bg-slate-200 dark:bg-slate-800 overflow-hidden rounded">
          <div className={`h-full w-1/3 ${TONE_DOT[meta.tone]} animate-[slide_1.4s_ease-in-out_infinite]`} />                                                                                                      
        </div>                                                                                                                                                                                                     
      )}                                                                                                                                                                                                           
      <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>                                                                                           
    </div>                                                                                                                                                                                                         
  );
}                                                                                                                                                                                                                  
                
function StepNode({ meta, status }: { meta: StepMeta; status: StepStatus }) {
  const lift = status === "running" ? "translateZ(28px) rotateX(-6deg)" : status === "done" ? "translateZ(10px)" : "translateZ(0)";
  const glow = status === "running" ? "drop-shadow(0 12px 18px rgba(37, 99, 235, 0.35))" : status === "done" ? "drop-shadow(0 6px 10px rgba(16, 185, 129, 0.20))" : "none";                                        
  return (                                                                                                                                                                                                         
    <div className="flex flex-col items-center px-1 min-w-0 flex-none">                                                                                                                                            
      <div className="transition-all duration-500 ease-out will-change-transform"                                                                                                                                  
        style={{ transform: lift, filter: glow, transformStyle: "preserve-3d" }}>                                                                                                                                  
        <StepBadge meta={meta} status={status} />                                                                                                                                                                  
      </div>                                                                                                                                                                                                       
      <div className="mt-3 text-center min-w-0 max-w-[140px]">                                                                                                                                                     
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{meta.title}</div>                                                                                                      
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{meta.hint}</div>                                                                                                              
        <div className="mt-2"><StatusPill status={status} /></div>                                                                                                                                                 
      </div>                                                                                                                                                                                                       
    </div>                                                                                                                                                                                                         
  );            
}                                                                                                                                                                                                                  
                
function StepBadge({ meta, status }: { meta: StepMeta; status: StepStatus }) {
  const ring = status === "running" ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-500"
    : status === "done"  ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-500"                                                                                                       
    : status === "error" ? "bg-gradient-to-br from-red-500 to-red-700 text-white border-red-500"                                                                                                                   
    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600";                                                                                                      
  return (                                                                                                                                                                                                         
    <div className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-none shadow-md transition-all ${ring}`}>
      {status === "done" ? (                                                                                                                                                                                       
        <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">                                                                                                          
          <path d="M3 8.5L6.5 12L13 4.5" strokeLinecap="round" strokeLinejoin="round" />                                                                                                                           
        </svg>                                                                                                                                                                                                     
      ) : status === "error" ? "!" : meta.index}                                                                                                                                                                   
      {status === "running" && (                                                                                                                                                                                   
        <>      
          <span className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-60" />                                                                                                      
          <span className="absolute -inset-1 rounded-full border border-blue-300 animate-pulse opacity-50" />
        </>                                                                                                                                                                                                        
      )}        
    </div>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}
                                                                                                                                                                                                                   
function Connector({ status }: { status: StepStatus }) {
  const flowing = status === "done" || status === "running";
  const baseColor = status === "done" ? "bg-emerald-400" : status === "running" ? "bg-blue-400" : status === "error" ? "bg-red-300" : "bg-slate-200 dark:bg-slate-700";
  const fillWidth = status === "done" ? "w-full" : status === "running" ? "w-1/2" : "w-0";                                                                                                                         
  return (                                                                                                                                                                                                         
    <div className="flex-1 mt-[18px] mx-1 min-w-0">                                                                                                                                                                
      <div className="relative h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">                                                                                                                   
        <div className={`absolute inset-y-0 left-0 ${fillWidth} ${baseColor} transition-all duration-700 ease-out`} />                                                                                             
        {flowing && <div className="absolute inset-y-0 w-8 bg-white/40 blur-sm" style={{ animation: "flow 1.6s linear infinite" }} />}                                                                             
        <style>{`@keyframes flow { 0% { left: -10%; } 100% { left: 110%; } }`}</style>                                                                                                                             
      </div>                                                                                                                                                                                                       
    </div>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}               

function StatusPill({ status }: { status: StepStatus }) {
  const map: Record<StepStatus, { label: string; cls: string }> = {
    idle:    { label: "Idle",    cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" },                                                                                                       
    running: { label: "Running", cls: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30" },                                                              
    done:    { label: "Done",    cls: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/30" },                                            
    error:   { label: "Error",   cls: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-500/30" },                                                                    
    skipped: { label: "Skipped", cls: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500" },                                                                                                       
  };                                                                                                                                                                                                               
  const v = map[status];                                                                                                                                                                                           
  return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${v.cls}`}>{v.label}</span>;                                                                        
}                                                                                                                                                                                                                  

function LogRow({ line }: { line: LogLine }) {                                                                                                                                                                     
  const tone = line.level === "error" ? "text-red-400" : line.level === "warn" ? "text-amber-400" : "text-slate-300";
  const badge = line.level === "error" ? "bg-red-500/10 text-red-400 ring-red-500/30"                                                                                                                              
    : line.level === "warn" ? "bg-amber-500/10 text-amber-400 ring-amber-500/30"                                                                                                                                   
    : "bg-slate-700/50 text-slate-400 ring-slate-600/40";                                                                                                                                                          
  return (                                                                                                                                                                                                         
    <div className="flex items-start gap-2 sm:gap-3 py-0.5 hover:bg-slate-900/60 -mx-2 px-2 rounded">
      <span className="text-slate-500 flex-none">{fmtTime(line.ts)}</span>                                                                                                                                         
      <span className={`flex-none px-1.5 rounded text-[10px] font-bold uppercase ring-1 ${badge}`}>{line.level}</span>                                                                                             
      {line.step && <span className="flex-none text-blue-400/80 font-semibold">[{line.step}]</span>}                                                                                                               
      <span className={`min-w-0 break-words ${tone}`}>{line.message}</span>                                                                                                                                        
    </div>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}    