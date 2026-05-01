"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";

const STEPS = ["Scrape", "Dedupe", "Score", "Filter", "Save"] as const;
type Mode = "signin" | "signup";

function Notice({ tone, variant, children }: { tone: "error" | "info"; variant: "solid" | "glass"; children: React.ReactNode }) {
  const isErr = tone === "error";
  if (variant === "glass") return <div className={`text-sm rounded-md px-3 py-2 ${isErr ? "text-red-200 bg-red-500/15 border border-red-400/30" : "text-blue-200 bg-blue-500/15 border border-blue-400/30"}`}>{children}</div>;
  return <div className={`text-sm rounded-md px-3 py-2 ${isErr ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30" : "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30"}`}>{children}</div>;
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveStep((s) => (s + 1) % (STEPS.length + 1)), 1100);
    return () => clearInterval(id);
  }, []);

    function Brand() {
      return (
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="absolute inset-0 rounded-lg ring-2 ring-blue-400/40 animate-pulse" />
          </div>
          <div>
            <div className="font-semibold text-base tracking-tight">Job Hunter Pipeline</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-blue-300/70">Pipeline workspace</div>
          </div>
        </div>
      );
    }

    function SystemFooter() {
      return (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span>System operational</span>
          </div>
          <span className="font-mono text-[10px] tracking-wider">v 0.1</span>
        </div>
      );
    }
    async function onSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null); setInfo(null); setLoading(true);
      try {
      const supabase = getSupabaseBrowser();
        if (mode === "signin") {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          router.push("/overview");
          router.refresh();
        } else {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          if (!data.session) {
            setInfo("Check your email to confirm, then sign in.");
            setMode("signin");
          } else {
            router.push("/onboarding");
            router.refresh();
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }

    return (
      <>
        {/* ===================== DESKTOP ===================== */}
        <div className="hidden lg:flex min-h-screen bg-slate-50 dark:bg-slate-950">
          <div className="absolute top-4 right-4 z-50"><ThemeToggle compact /></div>

          {/* LEFT panel */}
          <div className="relative w-1/2 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
            <span className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-600 opacity-30 blur-[120px] animate-[blobA_18s_ease-in-out_infinite]" />
            <span className="absolute top-1/3 -right-40 w-[460px] h-[460px] rounded-full bg-violet-600 opacity-30 blur-[120px] animate-[blobB_22s_ease-in-out_infinite]" />
            <span className="absolute -bottom-40 left-1/4 w-[420px] h-[420px] rounded-full bg-emerald-500 opacity-20 blur-[120px] animate-[blobC_20s_ease-in-out_infinite]" />
            <span className="absolute inset-0 opacity-[0.07]" style={{
              backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }} />
            <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
              <Brand />
              <div>
                <h2 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
                  Land your <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">next role</span><br />on autopilot.
                </h2>
                <p className="mt-4 text-slate-300/80 text-base max-w-md leading-relaxed">
                  Scrape Naukri, score every posting against your resume with OpenAI, and surface only the matches worth your time.
                </p>
                <div className="mt-10"><PipelineViz active={activeStep} /></div>
              </div>
              <SystemFooter />
            </div>
          </div>

          {/* RIGHT — form */}
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-sm">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                {mode === "signin" ? "Sign in to your workspace." : "Set up your workspace in seconds."}
              </p>
              <FormBody variant="solid" mode={mode}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                showPw={showPw} setShowPw={setShowPw}
                error={error} info={info} loading={loading} onSubmit={onSubmit} />
              <ModeSwitcher mode={mode} setMode={setMode} variant="solid" />
              <div className="mt-8 text-center text-[11px] text-slate-400 dark:text-slate-600">
                © {new Date().getFullYear()} Job Hunter Pipeline
              </div>
            </div>
          </div>
        </div>

        {/* ===================== MOBILE ===================== */}
        <div className="lg:hidden relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col px-5">
          <span className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-blue-600 opacity-30 blur-[80px] animate-[blobA_18s_ease-in-out_infinite]" />
          <span className="absolute top-1/3 -right-20 w-72 h-72 rounded-full bg-violet-600 opacity-30 blur-[80px] animate-[blobB_22s_ease-in-out_infinite]" />
          <span className="absolute -bottom-24 left-1/4 w-64 h-64 rounded-full bg-emerald-500 opacity-25 blur-[80px] animate-[blobC_20s_ease-in-out_infinite]" />
          <div className="relative z-10 flex flex-col items-center pt-10 pb-2">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/40">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="absolute inset-0 rounded-2xl ring-2 ring-blue-400/40 animate-pulse" />
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight">Job Hunter Pipeline</h1>
            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-blue-200/70">Pipeline workspace</p>
          </div>
          <div className="relative z-10 mt-5 mx-auto w-full max-w-xs"><PipelineViz active={activeStep} compact /></div>
          <div className="relative z-10 flex-1 flex items-start justify-center pt-7 pb-6">
            <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white">{mode === "signin" ? "Welcome back" : "Create account"}</h2>
                <p className="text-xs text-white/60 mt-1">{mode === "signin" ? "Sign in to continue" : "Set up your workspace"}</p>
              </div>
              <FormBody variant="glass" mode={mode}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                showPw={showPw} setShowPw={setShowPw}
                error={error} info={info} loading={loading} onSubmit={onSubmit} />
              <ModeSwitcher mode={mode} setMode={setMode} variant="glass" />
            </div>
          </div>
        </div>

        <style jsx global>{`                                                                                                                                                                                         
          @keyframes blobA { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,80px) scale(1.1); } }
          @keyframes blobB { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-80px,40px) scale(0.9); } }                                                                                  
          @keyframes blobC { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-60px) scale(1.05); } }                                                                                 
        `}</style>
      </>
    );

  }

  function PipelineViz({ active, compact = false }: { active: number; compact?: boolean }) {
    const size = compact ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
    const labelSize = compact ? "text-[9px] mt-2" : "text-[11px] mt-2.5";
    const trackTop = compact ? "top-[14px]" : "top-[18px]";
    const checkSize = compact ? "w-3 h-3" : "w-4 h-4";
    return (
      <div className="relative w-full">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => {
            const state = i < active ? "done" : i === active ? "running" : "idle";
            return (
              <div key={label} className="flex flex-col items-center w-1/5 min-w-0">
                <div className="relative">
                  <div className={`${size} rounded-full border-2 flex items-center justify-center font-bold transition-all duration-500 ${state === "running" ? "bg-gradient-to-br from-blue-400 to-indigo-500 border-blue-300 text-white scale-110 shadow-lg shadow-blue-500/40"
                    : state === "done" ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white"
                      : "bg-white/5 border-white/20 text-white/40 backdrop-blur"
                    }`}>
                    {state === "done" ? (
                      <svg className={checkSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M3 8.5L6.5 12L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : i + 1}
                  </div>
                  {state === "running" && <span className="absolute inset-0 rounded-full border-2 border-blue-300 animate-ping opacity-75" />}
                </div>
                <span className={`${labelSize} font-medium tracking-wide truncate ${state === "running" ? "text-blue-200" : state === "done" ? "text-emerald-300" : "text-white/40"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className={`absolute left-[10%] right-[10%] ${trackTop} -z-10 h-0.5 bg-white/10 rounded-full overflow-hidden`}>
          <div className="h-full bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-400 transition-all duration-700 ease-out"
            style={{ width: `${(Math.min(active, STEPS.length) / (STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>
    );
  }

  function ModeSwitcher({ mode, setMode, variant }: { mode: Mode; setMode: (m: Mode) => void; variant: "solid" | "glass" }) {
    const cls = variant === "glass" ? "text-white/70" : "text-slate-500 dark:text-slate-400";
    const link = variant === "glass" ? "text-blue-300 hover:text-blue-200" : "text-blue-700 dark:text-blue-400 hover:underline";
    return (
      <div className={`mt-4 text-center text-xs ${cls}`}>
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className={`font-semibold ${link}`}>
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </div>
    );
  }

  function FormBody({
    variant, mode, email, setEmail, password, setPassword, showPw, setShowPw, error, info, loading, onSubmit,
  }: {
    variant: "solid" | "glass"; mode: Mode;
    email: string; setEmail: (v: string) => void;
    password: string; setPassword: (v: string) => void;
    showPw: boolean; setShowPw: (v: boolean) => void;
    error: string | null; info: string | null; loading: boolean;
    onSubmit: (e: React.FormEvent) => void;
  }) {
    const inputCls = variant === "glass" ? "w-full pl-9 pr-3 py-2.5 text-sm bg-white/5 border border-white/20 rounded-md text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 focus:bg-white/10 transition" : "w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 transition";
    const labelCls = variant === "glass"
      ? "block text-xs font-medium text-white/80 mb-1.5"
      : "block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5";
    const iconCls = variant === "glass" ? "text-white/40" : "text-slate-400";

    return (
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="e" className={labelCls}>Email</label>
          <div className="relative">
            <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${iconCls}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline
                points="22,6 12,13 2,6" /></svg>
            </span>
            <input id="e" type="email" autoComplete="email" required placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="p" className={variant === "glass" ? "text-xs font-medium text-white/80" : "text-xs font-medium text-slate-700 dark:text-slate-300"}>
              Password
            </label>
            <button type="button" onClick={() => setShowPw(!showPw)}
              className={variant === "glass" ? "text-[11px] font-medium text-blue-300 hover:text-blue-200" : "text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline"}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          <div className="relative">
            <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${iconCls}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </span>
            <input id="p" type={showPw ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required minLength={6} placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </div>
        </div>

        {error && <Notice tone="error" variant={variant}>{error}</Notice>}
        {info && <Notice tone="info" variant={variant}>{info}</Notice>}

        <button type="submit" disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed       
  text-white text-sm font-semibold px-4 py-2.5 rounded-md transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5">
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    );
  }