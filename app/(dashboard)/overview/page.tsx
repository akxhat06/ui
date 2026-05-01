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
type LogLevel = "info" | "warn" | "error";
type LogLine = { ts: string; level: LogLevel; step?: StepRecord["name"]; message: string };

type StepMeta = {
  name: StepRecord["name"];
  index: number;
  title: string;
  hint: string;
  tone: "blue" | "indigo" | "violet" | "amber" | "emerald";
  icon: React.ReactNode;
};

const STEPS: StepMeta[] = [
  { name: "scrape", index: 1, title: "Scrape", hint: "Naukri", tone: "blue", icon: <ScrapeIcon /> },
  { name: "normalize", index: 2, title: "Dedupe", hint: "URL filter", tone: "indigo", icon: <DedupeIcon /> },
  { name: "score", index: 3, title: "Score", hint: "OpenAI 0–100", tone: "violet", icon: <ScoreIcon /> },
  { name: "filter", index: 4, title: "Filter", hint: "≥ threshold", tone: "amber", icon: <FilterIcon /> },
  { name: "save", index: 5, title: "Save", hint: "Append xlsx", tone: "emerald", icon: <SaveIcon /> },
];

/* ===================== Page ===================== */

export default function OverviewPage() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [logFilter, setLogFilter] = useState<"all" | LogLevel>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const logsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => { refresh(); const id = setInterval(refresh, 2000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  async function trigger() {
    setError(null); setRunning(true);
    try {
      const r = await fetch("/api/workflow/run", { method: "POST" });
      if (!r.ok) throw new Error(`run ${r.status}`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setRunning(false); }
  }

  async function stopWorkflow() {
    setError(null);
    try {
      const r = await fetch("/api/workflow/stop", { method: "POST" });
      if (!r.ok) throw new Error(`stop ${r.status}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const activeRun = status?.current ?? status?.latest ?? null;
  const logs = useMemo(() => buildLogs(activeRun), [activeRun]);
  const filteredLogs = useMemo(
    () => logFilter === "all" ? logs : logs.filter((l) => l.level === logFilter),
    [logs, logFilter]
  );
  const logCounts = useMemo(() => ({
    all: logs.length,
    info: logs.filter((l) => l.level === "info").length,
    warn: logs.filter((l) => l.level === "warn").length,
    error: logs.filter((l) => l.level === "error").length,
  }), [logs]);

  useEffect(() => {
    if (autoScroll && logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [filteredLogs.length, autoScroll]);

  function copyLogs() {
    const text = filteredLogs
      .map((l) => `${fmtTime(l.ts)} ${l.level.toUpperCase()} ${l.step ? `[${l.step}] ` : ""}${l.message}`)
      .join("\n");
    navigator.clipboard?.writeText(text);
  }

  const totalDuration =
    activeRun?.startedAt
      ? (activeRun.finishedAt ? new Date(activeRun.finishedAt).getTime() : now) -
      new Date(activeRun.startedAt).getTime()
      : 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* ============ Header ============ */}
      <header className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Workflow</div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">Job Hunter Pipeline</h1>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
            {activeRun ? (
              <>
                <span>Last run <strong className="text-slate-700 dark:text-slate-300">{fmtRel(activeRun.startedAt)}</strong></span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className={
                  activeRun.status === "running" ? "text-blue-700 dark:text-blue-400 font-medium"
                    : activeRun.status === "done" ? "text-emerald-700 dark:text-emerald-400 font-medium"
                      : "text-red-700 dark:text-red-400 font-medium"
                }>{activeRun.status}</span>
                {totalDuration > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums">{fmtDuration(totalDuration)}</span>
                  </>
                )}
              </>
            ) : "No runs yet"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={trigger} disabled={running}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed         
transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
            {running && <Spinner />}
            {running ? "Running" : "Run now"}
          </button>
          <button
            onClick={stopWorkflow}
            disabled={!running}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            Stop
          </button>
          <a href="/api/workflow/download"
            className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-2     
rounded-md transition-all">
            Download .xlsx
          </a>
        </div>
      </header>

      {/* ============ Top step cards (5) ============ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
        {STEPS.map((meta) => {
          const stepRec = activeRun?.steps.find((s) => s.name === meta.name);
          const st = stepRec?.status ?? "idle";
          const dur = stepDurationMs(stepRec, now);
          const count = stepRec && stepRec.status !== "idle" ? stepRec.count : null;
          return <StepCard key={meta.name} meta={meta} status={st} duration={dur} count={count} />;
        })}
      </section>

      {error && (
        <div className="mb-5 rounded-md border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-400 break-words">
          {error}
        </div>
      )}

      {/* ============ Pipeline stepper ============ */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pipeline</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {activeRun ? `Run ${activeRun.id.slice(0, 8)}` : "—"}
          </span>
        </div>
        <div className="px-4 sm:px-5 py-6 overflow-x-auto sm:overflow-visible">
          <div className="flex items-center w-full px-1 sm:px-1.5 pb-2 sm:pb-0 min-w-[26rem] sm:min-w-0">
            {STEPS.map((meta, idx) => {
              const stepRec = activeRun?.steps.find((s) => s.name === meta.name);
              const st = stepRec?.status ?? "idle";
              return (
                <div key={meta.name} className="flex items-center min-w-0 flex-none sm:flex-1">
                  <StepBadge meta={meta} status={st} />
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 min-w-4 sm:min-w-6 px-2 sm:px-2.5">
                      <Connector status={st} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ Logs ============ */}
      <section className="bg-slate-950 text-slate-100 border border-slate-800 rounded-lg shadow-lg overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </span>
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Logs</h2>
            {running && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/30 rounded px-1.5 py-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <FilterPill active={logFilter === "all"} onClick={() => setLogFilter("all")} label="All" count={logCounts.all} />
            <FilterPill active={logFilter === "info"} onClick={() => setLogFilter("info")} label="Info" count={logCounts.info} tone="slate" />
            <FilterPill active={logFilter === "warn"} onClick={() => setLogFilter("warn")} label="Warn" count={logCounts.warn} tone="amber" />
            <FilterPill active={logFilter === "error"} onClick={() => setLogFilter("error")} label="Error" count={logCounts.error} tone="red" />
          </div>
          <div className="flex items-center gap-1">
            <IconBtn title={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"} onClick={() => setAutoScroll((v) => !v)}>
              {autoScroll ? <PauseIcon /> : <PlayIcon />}
            </IconBtn>
            <IconBtn title="Copy logs" onClick={copyLogs}><CopyIcon /></IconBtn>
          </div>
        </div>

        {/* Log body */}
        <div ref={logsRef}
          className="h-72 sm:h-96 overflow-y-auto px-3 sm:px-4 py-3 font-mono text-xs leading-relaxed scroll-smooth bg-[radial-gradient(ellipse_at_top,_rgba(30,41,59,0.8),_rgb(2,6,23))]">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 italic">
              {logs.length === 0 ? 'No logs yet — hit "Run now" to start.' : `No ${logFilter} logs.`}
            </div>
          ) : (
            filteredLogs.map((l, i) => <LogRow key={i} line={l} />)
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 border-t border-slate-800 bg-slate-900/60 text-[10px] text-slate-500 font-mono">
          <span>{filteredLogs.length} / {logs.length} lines</span>
          <span>{autoScroll ? "auto-scroll on" : "auto-scroll paused"}</span>
        </div>
      </section>
    </div>
  );
}

/* ===================== Step card (top row) ===================== */

const TONE_BAR: Record<StepMeta["tone"], string> = {
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
};
const TONE_ICON: Record<StepMeta["tone"], string> = {
  blue: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400",
  indigo: "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  violet: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400",
  amber: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
  emerald: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

function StepCard({
  meta, status, duration, count,
}: {
  meta: StepMeta; status: StepStatus; duration: number; count: number | null;
}) {
  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <div className={`relative bg-white dark:bg-slate-900 border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md ${isRunning ? "border-blue-300 dark:border-blue-500/40 shadow-md shadow-blue-500/5"
        : isError ? "border-red-300 dark:border-red-500/40"
          : "border-slate-200 dark:border-slate-800"
      }`}>
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isRunning ? `${TONE_BAR[meta.tone]} animate-pulse`
          : isDone ? TONE_BAR[meta.tone]
            : isError ? "bg-red-500"
              : "bg-slate-200 dark:bg-slate-800"
        }`} />

      <div className="p-2.5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${TONE_ICON[meta.tone]}`}>
            {meta.icon}
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">{meta.index.toString().padStart(2, "0")}</span>
        </div>

        {/* Label */}
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {meta.title}
        </div>

        {/* Big count */}
        <div className={`mt-0.5 text-xl sm:text-2xl font-bold tabular-nums ${isError ? "text-red-700 dark:text-red-400"
            : count === null ? "text-slate-300 dark:text-slate-700"
              : "text-slate-900 dark:text-slate-100"
          }`}>
          {count === null ? "—" : count.toLocaleString()}
        </div>

        {/* Bottom row: duration + status */}
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className={`text-xs font-mono tabular-nums ${isRunning ? "text-blue-700 dark:text-blue-400 font-semibold"
              : isError ? "text-red-700 dark:text-red-400"
                : duration > 0 ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-400 dark:text-slate-600"
            }`}>
            {duration > 0 ? fmtDuration(duration) : "—"}
          </span>
          <StatusPill status={status} compact />
        </div>
      </div>
    </div>
  );
}

/* ===================== Pipeline stepper components ===================== */

function StepBadge({ meta, status }: { meta: StepMeta; status: StepStatus }) {
  const ring = status === "running" ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-500"
    : status === "done" ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-500"
      : status === "error" ? "bg-gradient-to-br from-red-500 to-red-700 text-white border-red-500"
        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700";
  return (
    <div className={`relative w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-none shadow-md transition-all ${ring}`}>
      {status === "done" ? (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 8.5L6.5 12L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : status === "error" ? "!" : meta.index}
      {status === "running" && (
        <span className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-60" />
      )}
    </div>
  );
}

function Connector({ status }: { status: StepStatus }) {
  const flowing = status === "done" || status === "running";
  const baseColor = status === "done" ? "bg-emerald-400" : status === "running" ? "bg-blue-400" : status === "error" ? "bg-red-300" : "bg-slate-200 dark:bg-slate-700";
  const fillWidth = status === "done" ? "w-full" : status === "running" ? "w-1/2" : "w-0";
  return (
    <div className="relative h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
      <div className={`absolute inset-y-0 left-0 ${fillWidth} ${baseColor} transition-all duration-700 ease-out`} />
      {flowing && <div className="absolute inset-y-0 w-8 bg-white/40 blur-sm" style={{ animation: "flow 1.6s linear infinite" }} />}
      <style>{`@keyframes flow { 0% { left: -10%; } 100% { left: 110%; } }`}</style>
    </div>
  );
}

/* ===================== Status pill ===================== */

function StatusPill({ status, compact = false }: { status: StepStatus; compact?: boolean }) {
  const map: Record<StepStatus, { label: string; cls: string }> = {
    idle: { label: "Idle", cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" },
    running: { label: "Run", cls: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30" },
    done: { label: "Done", cls: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/30" },
    error: { label: "Error", cls: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-500/30" },
    skipped: { label: "Skip", cls: "bg-slate-100 dark:bg-slate-800 text-slate-500" },
  };
  const v = map[status];
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${v.cls} ${compact ? "" : "px-2 py-0.5 text-[10px]"}`}>
      {v.label}
    </span>
  );
}

/* ===================== Logs UI ===================== */

function LogRow({ line }: { line: LogLine }) {
  const tone = line.level === "error" ? "text-red-300"
    : line.level === "warn" ? "text-amber-300"
      : "text-slate-300";
  const badge = line.level === "error" ? "bg-red-500/15 text-red-400 ring-red-500/40"
    : line.level === "warn" ? "bg-amber-500/15 text-amber-400 ring-amber-500/40"
      : "bg-slate-700/50 text-slate-400 ring-slate-600/40";
  return (
    <div className="flex items-start gap-2 sm:gap-3 py-0.5 hover:bg-slate-800/40 -mx-1 px-1 rounded group">
      <span className="text-slate-500 flex-none tabular-nums">{fmtTime(line.ts)}</span>
      <span className={`flex-none px-1.5 rounded text-[10px] font-bold uppercase ring-1 ${badge}`}>{line.level}</span>
      {line.step && (
        <span className="flex-none text-cyan-400/90 font-semibold">[{line.step}]</span>
      )}
      <span className={`min-w-0 break-words ${tone}`}>{line.message}</span>
    </div>
  );
}

function FilterPill({
  active, onClick, label, count, tone = "slate",
}: {
  active: boolean; onClick: () => void; label: string; count: number;
  tone?: "slate" | "amber" | "red";
}) {
  const activeCls = tone === "amber" ? "bg-amber-500/20 text-amber-300 ring-amber-500/40"
    : tone === "red" ? "bg-red-500/20 text-red-300 ring-red-500/40"
      : "bg-slate-700 text-slate-100 ring-slate-600";
  return (
    <button onClick={onClick}
      className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ring-1 transition-colors ${active ? activeCls : "bg-transparent text-slate-500 ring-slate-700 hover:text-slate-300 hover:bg-slate-800"
        }`}>
      {label}
      <span className="ml-1 font-mono opacity-70">{count}</span>
    </button>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} aria-label={title} onClick={onClick}
      className="w-7 h-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">
      {children}
    </button>
  );
}

/* ===================== Helpers ===================== */

function fmtRel(iso: string | null): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtTime(iso: string): string { return new Date(iso).toLocaleTimeString([], { hour12: false }); }
function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}
function stepDurationMs(step: StepRecord | undefined, now: number): number {
  if (!step || !step.startedAt) return 0;
  if (step.status === "running") return now - new Date(step.startedAt).getTime();
  return step.durationMs ?? 0;
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
        logs.push({
          ts: s.finishedAt, level: "info", step: s.name,
          message: `${s.name}: done · ${s.count} items · ${s.durationMs}ms${s.message ? ` · ${s.message}` : ""}`
        });
    }
  }
  if (run.finishedAt)
    logs.push({
      ts: run.finishedAt, level: run.status === "error" ? "error" : "info",
      message: `Run finished: ${run.status}${run.error ? ` (${run.error})` : ""}`
    });
  return logs.sort((a, b) => a.ts.localeCompare(b.ts));
}

/* ===================== Inline icons ===================== */

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function ScrapeIcon() {
  return (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" /><path d="M3 12h18M12 3a15 15 0 
0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>);
}
function DedupeIcon() {
  return (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="13" height="13" rx="2" /><rect x="8" y="8" width="13"
    height="13" rx="2" /></svg>);
}
function ScoreIcon() {
  return (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l1.9 5.8L20 9.5l-4.5 4.2L17 20l-5-3-5 3 1.5-6.3L4 9.5l6.1-1.7L12 
2z" strokeLinejoin="round" /></svg>);
}
function FilterIcon() { return (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18l-7 9v6l-4 2v-8L3 4z" strokeLinejoin="round" /></svg>); }
function SaveIcon() {
  return (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
  /><polyline points="17 21 17 13 7 13 7 21" /></svg>);
}
function PauseIcon() { return (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>); }
function PlayIcon() { return (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7V5z" /></svg>); }
function CopyIcon() {
  return (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M5 15V5a2 2 0 0 1    
2-2h10" /></svg>);
}