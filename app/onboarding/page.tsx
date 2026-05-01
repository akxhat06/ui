"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const SUGGESTED = [
  "React", "Node.js", "TypeScript", "Next.js", "Angular", "Vue",
  "Python", "Java", "Go", "Rust", "AWS", "GCP", "Azure",
  "Docker", "Kubernetes", "GraphQL", "PostgreSQL", "MongoDB", "Redis",
];

const STEPS = [
  { num: 1, title: "About you", hint: "Tell us who you are" },
  { num: 2, title: "Expertise", hint: "What roles should we target?" },
  { num: 3, title: "Resume", hint: "How the AI scores your matches" },
] as const;

type Step = 1 | 2 | 3;



export default function OnboardingPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Form state                       
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState<string>("");
  const [stacks, setStacks] = useState<string[]>([]);
  const [stackInput, setStackInput] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [existingResume, setExistingResume] = useState<string | null>(null);
  const [resumeSummary, setResumeSummary] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = getSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setFullName(data.full_name ?? "");
        setLocation(data.location ?? "");
        setExperience(data.experience != null ? String(data.experience) : "");
        setStacks(data.tech_stacks ?? []);
        setResumeSummary(data.resume_summary ?? "");
        setExistingResume(data.resume_filename ?? null);
      }
      setHydrated(true);
    })();
  }, [router]);

  const validity = useMemo(
    () => ({
      1: !!fullName.trim() && !!location.trim() && experience !== "",
      2: stacks.length > 0,
      3: !!resumeSummary.trim(),
    }),
    [fullName, location, experience, stacks, resumeSummary]
  );

  function addStack(s: string) {
    const v = s.trim();
    if (!v || stacks.includes(v)) return;
    setStacks([...stacks, v]);
    setStackInput("");
  }

  function next() {
    setError(null);
    if (!validity[step]) return;
    if (step < 3) setStep((step + 1) as Step);
    else save();
  }

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function generateSummary() {
    if (!resumeFile) return;
    setGenError(null); setGenerating(true);
    try {
      const fd = new FormData();
      fd.append("file", resumeFile);
      const r = await fetch("/api/profile/generate-summary", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `error ${r.status}`);
      setResumeSummary(data.summary as string);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!userId) return;
    setError(null);
    setSaving(true);
    try {
      const supabase = getSupabaseBrowser();
      let resumePath: string | undefined;
      let resumeFilename: string | undefined;

      if (resumeFile) {
        const path = `${userId}/${Date.now()}-${resumeFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("resumes")
          .upload(path, resumeFile, { upsert: true, contentType: resumeFile.type });
        if (upErr) throw upErr;
        resumePath = path;
        resumeFilename = resumeFile.name;
      }

      const update: Record<string, unknown> = {
        full_name: fullName.trim() || null,
        location: location.trim() || null,
        experience: experience === "" ? null : Number(experience),
        tech_stacks: stacks,
        resume_summary: resumeSummary.trim(),
        updated_at: new Date().toISOString(),
      };
      if (resumePath) {
        update.resume_path = resumePath;
        update.resume_filename = resumeFilename;
      }

      const { error: dbErr } = await supabase.from("profiles").update(update).eq("id", userId);
      if (dbErr) throw dbErr;

      router.push("/overview");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const pct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 lg:flex">
      {/* ============ LEFT — branding + step rail (desktop) ============ */}
      <aside className="hidden lg:flex flex-col w-2/5 max-w-md relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-10 xl:p-14">
        <span className="absolute -top-32 -left-24 w-80 h-80 rounded-full bg-blue-600 opacity-30 blur-[100px] animate-[blobA_18s_ease-in-out_infinite]" />
        <span className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-violet-600 opacity-30 blur-[100px] animate-[blobB_22s_ease-in-out_infinite]" />
        <span className="absolute -bottom-32 left-1/4 w-72 h-72 rounded-full bg-emerald-500 opacity-20 blur-[100px] animate-[blobC_20s_ease-in-out_infinite]" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="absolute inset-0 rounded-lg ring-2 ring-blue-400/40 animate-pulse" />
          </div>
          <div>
            <div className="font-semibold text-base tracking-tight">Job Hunter Pipeline</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-blue-300/70">Profile setup</div>
          </div>
        </div>

        {/* Heading */}
        <div className="relative z-10 mt-12">
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
            Let's tune the <span className="bg-gradient-to-r from-blue-300 to-emerald-300 bg-clip-text text-transparent">scorer</span> to you.
          </h1>
          <p className="mt-3 text-sm text-slate-300/80 leading-relaxed max-w-xs">
            Three quick steps. Everything you enter stays private to your account.
          </p>
        </div>

        {/* Step rail */}
        <ol className="relative z-10 mt-12 space-y-5">
          {STEPS.map((s) => {
            const state: "done" | "current" | "future" =
              s.num < step ? "done" : s.num === step ? "current" : "future";
            return (
              <li key={s.num} className="flex items-start gap-3">
                <div className={`flex-none w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${state === "current"
                    ? "bg-gradient-to-br from-blue-400 to-indigo-500 border-blue-300 text-white scale-110 shadow-lg shadow-blue-500/40"
                    : state === "done"
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white"
                      : "bg-white/5 border-white/20 text-white/40 backdrop-blur"
                  }`}>
                  {state === "done" ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M3 8.5L6.5 12L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : s.num}
                </div>
                <div className={state === "future" ? "opacity-50" : ""}>
                  <div className={`text-sm font-semibold ${state === "current" ? "text-white" : "text-white/80"}`}>
                    {s.title}
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">{s.hint}</div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Footer hint */}
        <div className="relative z-10 mt-auto pt-10 text-xs text-white/40">
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Encrypted &amp; private to your account
          </div>
        </div>

        <style jsx global>{`                                                                                                                                                                                       
          @keyframes blobA { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,80px) scale(1.1); } }
          @keyframes blobB { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-80px,40px) scale(0.9); } }                                                                                
          @keyframes blobC { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-60px) scale(1.05); } }                                                                               
        `}</style>
      </aside>

      {/* ============ RIGHT — form ============ */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header + progress */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Profile setup</span>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              Step {step} / {STEPS.length}
            </span>
          </div>
          <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${((step - (validity[step] ? 0 : 0.5)) / STEPS.length) * 100}%` }}
            />
          </div>
        </header>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-14 py-8 lg:py-12">
          <div className="max-w-xl mx-auto lg:mx-0">
            {/* Desktop step header */}
            <div className="hidden lg:block mb-8">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Step {step} of {STEPS.length}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {STEPS[step - 1].title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{STEPS[step - 1].hint}</p>
            </div>

            {!hydrated ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
            ) : (
              <>
                {step === 1 && (
                  <StepAbout
                    fullName={fullName} setFullName={setFullName}
                    location={location} setLocation={setLocation}
                    experience={experience} setExperience={setExperience}
                  />
                )}

                {step === 2 && (
                  <StepStacks
                    stacks={stacks} setStacks={setStacks}
                    stackInput={stackInput} setStackInput={setStackInput}
                    addStack={addStack}
                  />
                )}

                {step === 3 && (
                  <StepResume
                    resumeFile={resumeFile} setResumeFile={setResumeFile}
                    existingResume={existingResume}
                    resumeSummary={resumeSummary} setResumeSummary={setResumeSummary}
                    generating={generating} genError={genError}
                    onGenerate={generateSummary}
                  />
                )}
              </>
            )}

            {error && (
              <div className="mt-6 rounded-md border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer nav */}
        <footer className="sticky bottom-0 z-20 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-5 sm:px-8 lg:px-14 py-4">
          <div className="max-w-xl mx-auto lg:mx-0 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(((step - 1) || 1) as Step)}
              disabled={step === 1 || saving}
              className="text-sm font-medium px-4 py-2 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>

            <div className="hidden sm:flex items-center gap-1.5">
              {STEPS.map((s) => (
                <span
                  key={s.num}
                  className={`h-1.5 rounded-full transition-all ${s.num === step ? "w-6 bg-blue-600 dark:bg-blue-400"
                      : s.num < step ? "w-1.5 bg-emerald-500"
                        : "w-1.5 bg-slate-300 dark:bg-slate-700"
                    }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              disabled={!validity[step] || saving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm 
font-semibold px-5 py-2 rounded-md shadow-md hover:shadow-lg transition-all"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {saving ? "Saving…" : step === STEPS.length ? "Finish" : "Continue"}
              {!saving && <span>→</span>}
            </button>
          </div>
          {/* hide pct unused warning */}
          <span className="hidden">{pct}</span>
        </footer>
      </main>
    </div>
  );
}

/* ===================== Step components ===================== */

function StepAbout({
  fullName, setFullName, location, setLocation, experience, setExperience,
}: {
  fullName: string; setFullName: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  experience: string; setExperience: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Full name" hint="As it appears on your resume.">
        <Input
          icon={<UserIcon />}
          type="text" required value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Akshat Rana"
        />
      </Field>

      <Field label="Location" hint="City you're targeting roles in.">
        <Input
          icon={<MapIcon />}
          type="text" required value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Bengaluru"
        />
      </Field>

      <Field label="Years of experience" hint="Used to filter roles to your seniority.">
        <Input
          icon={<BriefcaseIcon />}
          type="number" min={0} max={50} step="0.5" required value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="3"
        />
      </Field>
    </div>
  );
}

function StepStacks({
  stacks, setStacks, stackInput, setStackInput, addStack,
}: {
  stacks: string[]; setStacks: (s: string[]) => void;
  stackInput: string; setStackInput: (v: string) => void;
  addStack: (s: string) => void;
}) {
  return (
    <div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
          {stacks.length === 0 ? (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
              No skills added yet — pick suggestions below or type your own
            </span>
          ) : (
            stacks.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-500/30"
              >
                {s}
                <button
                  type="button"
                  onClick={() => setStacks(stacks.filter((x) => x !== s))}
                  className="ml-1 -mr-0.5 w-4 h-4 inline-flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-500/30 hover:text-blue-900 dark:hover:text-blue-100"
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        <Input
          icon={<PlusIcon />}
          type="text" value={stackInput}
          onChange={(e) => setStackInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addStack(stackInput);
            }
          }}
          placeholder="Type a skill and press Enter…"
        />
      </div>

      <div className="mt-5">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Suggestions
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.filter((s) => !stacks.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addStack(s)}
              className="px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-700                   
dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepResume({                                                                                                                                                                                              
  resumeFile, setResumeFile, existingResume,
  resumeSummary, setResumeSummary,
  generating, genError, onGenerate,                                                                                                                                                                                
}: {
  resumeFile: File | null; setResumeFile: (f: File | null) => void;                                                                                                                                                
  existingResume: string | null;
  resumeSummary: string; setResumeSummary: (v: string) => void;                                                                                                                                                    
  generating: boolean; genError: string | null;
  onGenerate: () => void;                                                                                                                                                                                          
}) {                                                                                                                                                                                                               
  const hasFile = !!resumeFile;
  const hasSummary = !!resumeSummary.trim();                                                                                                                                                                       
                
  return (
    <div className="space-y-5">
      {/* File upload */}                                                                                                                                                                                          
      <Field label="Resume file" hint="PDF or TXT recommended for auto-summary. Max 5 MB.">
        <label className="group block cursor-pointer">                                                                                                                                                             
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5               
transition-colors">                                                                                                                                                                                                
            <div className="flex flex-col items-center text-center gap-2">                                                                                                                                         
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">                
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">                                                                                                    
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />                                                                                                                                           
                  <polyline points="17 8 12 3 7 8" />                                                                                                                                                              
                  <line x1="12" y1="3" x2="12" y2="15" />                                                                                                                                                          
                </svg>                                                                                                                                                                                             
              </div>                                                                                                                                                                                               
              <div className="text-sm">
                {resumeFile ? (                                                                                                                                                                                    
                  <span className="font-medium text-slate-900 dark:text-slate-100">{resumeFile.name}</span>
                ) : existingResume ? (                                                                                                                                                                             
                  <>
                    <span className="text-slate-600 dark:text-slate-400">Currently: </span>                                                                                                                        
                    <span className="font-medium text-slate-900 dark:text-slate-100">{existingResume}</span>                                                                                                       
                    <div className="text-xs text-slate-500 mt-0.5">Click to replace</div>                                                                                                                          
                  </>                                                                                                                                                                                              
                ) : (                                                                                                                                                                                              
                  <>                                                                                                                                                                                               
                    <span className="font-medium text-blue-700 dark:text-blue-400">Click to upload</span>
                    <span className="text-slate-500 dark:text-slate-400"> — or drag and drop</span>                                                                                                                
                  </>                                                                                                                                                                                              
                )}                                                                                                                                                                                                 
              </div>                                                                                                                                                                                               
              <span className="text-[11px] text-slate-400">PDF / DOC / DOCX / TXT · max 5 MB</span>
            </div>                                                                                                                                                                                                 
            <input
              type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"                                                                                                                                         
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}                                                                                                                                         
            />
          </div>                                                                                                                                                                                                   
        </label>
      </Field>

      {/* AI summary */}                                                                                                                                                                                           
      <Field
        label="Resume summary"                                                                                                                                                                                     
        hint="Generated from your file using OpenAI. Used to score every job against your background."
      >                                                                                                                                                                                                            
        {!hasSummary ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center">                                                                      
            <div className="mx-auto w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-3">                                        
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">                                                                                                      
                <path d="M12 2l1.9 5.8L20 9.5l-4.5 4.2L17 20l-5-3-5 3 1.5-6.3L4 9.5l6.1-1.7L12 2z" strokeLinejoin="round" strokeLinecap="round" />                                                                 
              </svg>                                                                                                                                                                                               
            </div>                                                                                                                                                                                                 
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">                                                                                                                               
              No summary yet                                                                                                                                                                                       
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">                                                                                                                       
              {hasFile                                                                                                                                                                                             
                ? "Click the button below — OpenAI will read your file and write a profile."
                : "Upload a resume above first, then we can generate one for you."}                                                                                                                                
            </p>                                                                                                                                                                                                   
            <button                                                                                                                                                                                                
              type="button"                                                                                                                                                                                        
              onClick={onGenerate}
              disabled={!hasFile || generating}
              className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-40 disabled:cursor-not-allowed text-white 
text-sm font-semibold px-4 py-2 rounded-md shadow-md hover:shadow-lg transition-all"                                                                                                                               
            >                                                                                                                                                                                                      
              {generating ? (                                                                                                                                                                                      
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />                                                                                              
                  </svg>                                                                                                                                                                                           
                  Generating…                                                                                                                                                                                      
                </>                                                                                                                                                                                                
              ) : (
                <>
                  <SparkleIcon /> Generate with AI
                </>                                                                                                                                                                                                
              )}
            </button>                                                                                                                                                                                              
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">                                                         
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wider">                                                          
                <SparkleIcon className="w-3 h-3" />                                                                                                                                                                
                AI generated                                                                                                                                                                                       
              </span>                                                                                                                                                                                              
              <button
                type="button"                                                                                                                                                                                      
                onClick={onGenerate}
                disabled={!hasFile || generating}                                                                                                                                                                  
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed
 transition-colors"                                                                                                                                                                                                
              >
                {generating ? (                                                                                                                                                                                    
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />                                                                                                         
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />                                                                                              
                  </svg>                                                                                                                                                                                           
                ) : <RefreshIcon />}                                                                                                                                                                               
                Regenerate                                                                                                                                                                                         
              </button>
            </div>
            <textarea
              rows={8} value={resumeSummary}                                                                                                                                                                       
              onChange={(e) => setResumeSummary(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-y"                                                      
            />                                                                                                                                                                                                     
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-3 py-1.5 border-t border-slate-200 dark:border-slate-800">                                         
              <span>Editable — tweak before saving if needed</span>                                                                                                                                                
              <span className="tabular-nums">{resumeSummary.length} chars</span>
            </div>                                                                                                                                                                                                 
          </div>
        )}                                                                                                                                                                                                         
                                                                                                                                                                                                                   
        {genError && (
          <div className="mt-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded px-2 py-1.5">                                              
            {genError}                                                                                                                                                                                             
          </div>
        )}                                                                                                                                                                                                         
      </Field>  
    </div>                                                                                                                                                                                                         
  );            
}

function SparkleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">                                                                                                              
      <path d="M12 2l1.9 5.8L20 9.5l-4.5 4.2L17 20l-5-3-5 3 1.5-6.3L4 9.5l6.1-1.7L12 2z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>                                                                                                                                                                                                         
  );            
}                                                                                                                                                                                                                  
                
function RefreshIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />                                                                                                                                                    
      <path d="M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />                                                                                                                                         
    </svg>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}   

/* ===================== Tiny primitives ===================== */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {label}
      </label>
      {hint && <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{hint}</div>}
      {children}
    </div>
  );
}

function Input({
  icon, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        {...props}
        className={`w-full ${icon ? "pl-9" : "pl-3"} pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100                    
placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 transition`}
      />
    </div>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}    