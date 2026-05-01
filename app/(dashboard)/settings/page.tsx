"use client";                                                                                                                                                                                                      
                  
import { useEffect, useMemo, useState } from "react";                                                                                                                                                              
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";                                                                                                                                                        
                
const SUGGESTED = [                                                                                                                                                                                                
  "React", "Node.js", "TypeScript", "Next.js", "Angular", "Vue",
  "Python", "Java", "Go", "Rust", "AWS", "GCP", "Azure",                                                                                                                                                           
  "Docker", "Kubernetes", "GraphQL", "PostgreSQL", "MongoDB", "Redis",                                                                                                                                             
];                                                                                                                                                                                                                 
                                                                                                                                                                                                                   
const SECTIONS = [                                                                                                                                                                                                 
  { key: "profile", label: "Profile",     hint: "Name, location, experience" },
  { key: "stacks",  label: "Tech stacks", hint: "Skills you target"          },                                                                                                                                    
  { key: "resume",  label: "Resume",      hint: "File + AI summary"          },                                                                                                                                    
  { key: "account", label: "Account",     hint: "Email & sign out"           },                                                                                                                                    
] as const;                                                                                                                                                                                                        
                                                                                                                                                                                                                   
type SectionKey = typeof SECTIONS[number]["key"];                                                                                                                                                                  
 
export default function SettingsPage() {                                                                                                                                                                           
  const router = useRouter();
  const supabase = getSupabaseBrowser();
                                                                                                                                                                                                                   
  const [section, setSection] = useState<SectionKey>("profile");
                                                                                                                                                                                                                   
  const [userId, setUserId] = useState<string | null>(null);                                                                                                                                                       
  const [email, setEmail] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);                                                                                                                                                                 
                                                                                                                                                                                                                   
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");                                                                                                                                                                    
  const [experience, setExperience] = useState<string>("");                                                                                                                                                        
  const [stacks, setStacks] = useState<string[]>([]);
  const [stackInput, setStackInput] = useState("");                                                                                                                                                                
  const [resumeFile, setResumeFile] = useState<File | null>(null);                                                                                                                                                 
  const [existingResume, setExistingResume] = useState<string | null>(null);
  const [resumeSummary, setResumeSummary] = useState("");                                                                                                                                                          
  const [initial, setInitial] = useState<string>("");
                                                                                                                                                                                                                   
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);                                                                                                                                                             
  const [error, setError] = useState<string | null>(null);                                                                                                                                                         
  const [toast, setToast] = useState<string | null>(null);
                                                                                                                                                                                                                   
  useEffect(() => {
    (async () => {                                                                                                                                                                                                 
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);                                                                                                                                                                                          
      setEmail(user.email ?? null);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();                                                                                                                     
      if (data) {                                                                                                                                                                                                  
        setFullName(data.full_name ?? "");
        setLocation(data.location ?? "");                                                                                                                                                                          
        setExperience(data.experience != null ? String(data.experience) : "");
        setStacks(data.tech_stacks ?? []);                                                                                                                                                                         
        setResumeSummary(data.resume_summary ?? "");                                                                                                                                                               
        setExistingResume(data.resume_filename ?? null);
        setInitial(snapshot(data.full_name, data.location, data.experience, data.tech_stacks, data.resume_summary));                                                                                               
      }                                                                                                                                                                                                            
      setHydrated(true);
    })();                                                                                                                                                                                                          
  }, [router, supabase]);

  const dirty = useMemo(() => {                                                                                                                                                                                    
    if (!hydrated) return false;
    return snapshot(fullName, location, experience, stacks, resumeSummary) !== initial || !!resumeFile;                                                                                                            
  }, [hydrated, fullName, location, experience, stacks, resumeSummary, resumeFile, initial]);                                                                                                                      

  const valid =                                                                                                                                                                                                    
    !!fullName.trim() && !!location.trim() && experience !== "" &&
    stacks.length > 0 && !!resumeSummary.trim();                                                                                                                                                                   
                
  function addStack(s: string) {                                                                                                                                                                                   
    const v = s.trim();
    if (!v || stacks.includes(v)) return;                                                                                                                                                                          
    setStacks([...stacks, v]); setStackInput("");
  }                                                                                                                                                                                                                
 
  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2800); }                                                                                                                           
                
  async function regenerate() {                                                                                                                                                                                    
    setError(null); setGenerating(true);
    try {                                                                                                                                                                                                          
      const fd = new FormData();
      if (resumeFile) fd.append("file", resumeFile);                                                                                                                                                               
      const r = await fetch("/api/profile/generate-summary", { method: "POST", body: fd });
      const data = await r.json();                                                                                                                                                                                 
      if (!r.ok) throw new Error(data.error ?? `error ${r.status}`);                                                                                                                                               
      setResumeSummary(data.summary as string);                                                                                                                                                                    
      flash("Summary regenerated");                                                                                                                                                                                
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));                                                                                                                                                        
    } finally { setGenerating(false); }
  }                                                                                                                                                                                                                
 
  async function save() {                                                                                                                                                                                          
    if (!userId) return;
    setError(null); setSaving(true);
    try {                                                                                                                                                                                                          
      let resumePath: string | undefined;
      let resumeFilename: string | undefined;                                                                                                                                                                      
      if (resumeFile) {
        const path = `${userId}/${Date.now()}-${resumeFile.name}`;                                                                                                                                                 
        const { error: upErr } = await supabase.storage.from("resumes")
          .upload(path, resumeFile, { upsert: true, contentType: resumeFile.type });                                                                                                                               
        if (upErr) throw upErr;
        resumePath = path; resumeFilename = resumeFile.name;                                                                                                                                                       
      }         
      const update: Record<string, unknown> = {                                                                                                                                                                    
        full_name: fullName.trim() || null,
        location: location.trim() || null,                                                                                                                                                                         
        experience: experience === "" ? null : Number(experience),
        tech_stacks: stacks,                                                                                                                                                                                       
        resume_summary: resumeSummary.trim(),                                                                                                                                                                      
        updated_at: new Date().toISOString(),
      };                                                                                                                                                                                                           
      if (resumePath) { update.resume_path = resumePath; update.resume_filename = resumeFilename; }
      const { error: dbErr } = await supabase.from("profiles").update(update).eq("id", userId);                                                                                                                    
      if (dbErr) throw dbErr;                                                                                                                                                                                      
      setInitial(snapshot(fullName, location, experience, stacks, resumeSummary));                                                                                                                                 
      if (resumeFilename) setExistingResume(resumeFilename);                                                                                                                                                       
      setResumeFile(null);                                                                                                                                                                                         
      flash("Saved — next pipeline run will use these settings");
    } catch (e) {                                                                                                                                                                                                  
      setError(e instanceof Error ? e.message : String(e));
    } finally { setSaving(false); }                                                                                                                                                                                
  }             
                                                                                                                                                                                                                   
  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login"); router.refresh();
  }                                                                                                                                                                                                                
 
  return (                                                                                                                                                                                                         
    <div className="lg:h-[calc(100vh-3rem)] lg:overflow-hidden flex flex-col max-w-6xl mx-auto">
      {/* ============ Header ============ */}                                                                                                                                                                     
      <header className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">                                                               
        <div>                                                                                                                                                                                                      
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Workspace</div>                                                                                          
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">Settings</h1>                                                                                                  
        </div>                                                                                                                                                                                                     
        <div className="flex items-center gap-2">                                                                                                                                                                  
          {dirty && (                                                                                                                                                                                              
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 ring-1 ring-amber-200 dark:ring-amber-500/30 px-2.5 py-1     
rounded-md">                                                                                                                                                                                                       
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />                                                                                                                                           
              Unsaved                                                                                                                                                                                              
            </span>                                                                                                                                                                                                
          )}
          <button                                                                                                                                                                                                  
            onClick={save}
            disabled={!dirty || !valid || saving}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm 
font-semibold px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-all"                                                                                                                                       
          >
            {saving && (                                                                                                                                                                                           
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />                                                                                                             
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />                                                                                                  
              </svg>                                                                                                                                                                                               
            )}                                                                                                                                                                                                     
            {saving ? "Saving…" : "Save changes"}                                                                                                                                                                  
          </button>                                                                                                                                                                                                
        </div>
      </header>                                                                                                                                                                                                    
                
      {!hydrated ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-12 text-center">Loading…</div>
      ) : (                                                                                                                                                                                                        
        <>
          {/* ============ Mobile pills ============ */}                                                                                                                                                           
          <div className="md:hidden flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 scrollbar-none">                                                             
            {SECTIONS.map((s) => {                                                                                                                                                                                 
              const active = section === s.key;                                                                                                                                                                    
              return (                                                                                                                                                                                             
                <button                                                                                                                                                                                            
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={`flex-none px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    active                                                                                                                                                                                         
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"                                                                                                                        
                  }`}                                                                                                                                                                                              
                >
                  {s.label}                                                                                                                                                                                        
                </button>
              );
            })}
          </div>

          {/* ============ Body ============ */}                                                                                                                                                                   
          <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Desktop sub-nav */}                                                                                                                                                                                
            <aside className="hidden md:block flex-none w-56">
              <nav className="space-y-0.5">                                                                                                                                                                        
                {SECTIONS.map((s) => {
                  const active = section === s.key;                                                                                                                                                                
                  return (
                    <button                                                                                                                                                                                        
                      key={s.key}
                      onClick={() => setSection(s.key)}
                      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                        active                                                                                                                                                                                     
                          ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"                                                                                                        
                      }`}                                                                                                                                                                                          
                    >                                                                                                                                                                                              
                      <div className={`text-sm font-medium ${active ? "" : ""}`}>{s.label}</div>                                                                                                                   
                      <div className={`text-[11px] mt-0.5 ${active ? "text-blue-600/70 dark:text-blue-400/70" : "text-slate-500 dark:text-slate-500"}`}>                                                           
                        {s.hint}                                                                                                                                                                                   
                      </div>                                                                                                                                                                                       
                    </button>                                                                                                                                                                                      
                  );                                                                                                                                                                                               
                })}
              </nav>
            </aside>

            {/* Section content */}
            <section className="flex-1 min-w-0 lg:overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 sm:p-6">
              {section === "profile" && (                                                                                                                                                                          
                <ProfileSection
                  fullName={fullName} setFullName={setFullName}                                                                                                                                                    
                  location={location} setLocation={setLocation}
                  experience={experience} setExperience={setExperience}                                                                                                                                            
                />
              )}                                                                                                                                                                                                   
 
              {section === "stacks" && (                                                                                                                                                                           
                <StacksSection
                  stacks={stacks} setStacks={setStacks}
                  stackInput={stackInput} setStackInput={setStackInput}
                  addStack={addStack}                                                                                                                                                                              
                />
              )}                                                                                                                                                                                                   
                
              {section === "resume" && (
                <ResumeSection
                  resumeFile={resumeFile} setResumeFile={setResumeFile}                                                                                                                                            
                  existingResume={existingResume}
                  resumeSummary={resumeSummary} setResumeSummary={setResumeSummary}                                                                                                                                
                  generating={generating} onRegenerate={regenerate}                                                                                                                                                
                />
              )}                                                                                                                                                                                                   
                                                                                                                                                                                                                   
              {section === "account" && (
                <AccountSection email={email} onSignOut={signOut} />                                                                                                                                               
              )}

              {error && (                                                                                                                                                                                          
                <div className="mt-4 rounded-md border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-400">
                  {error}                                                                                                                                                                                          
                </div>
              )}                                                                                                                                                                                                   
            </section>                                                                                                                                                                                             
          </div>
        </>                                                                                                                                                                                                        
      )}        

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 text-sm font-medium px-4 py-2.5 rounded-md shadow-2xl border border-slate-800 
dark:border-slate-200 animate-[fade-in_0.2s_ease-out]">                                                                                                                                                            
          {toast}
          <style>{`@keyframes fade-in { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }`}</style>                                                                    
        </div>                                                                                                                                                                                                     
      )}
    </div>                                                                                                                                                                                                         
  );            
}                                                                                                                                                                                                                  
                
/* ===================== Sections ===================== */

function ProfileSection({
  fullName, setFullName, location, setLocation, experience, setExperience,
}: {                                                                                                                                                                                                               
  fullName: string; setFullName: (v: string) => void;
  location: string; setLocation: (v: string) => void;                                                                                                                                                              
  experience: string; setExperience: (v: string) => void;                                                                                                                                                          
}) {
  return (                                                                                                                                                                                                         
    <div>       
      <SectionHeader title="Profile" hint="Used to target your scraper queries." />
      <div className="grid sm:grid-cols-2 gap-4 max-w-xl">                                                                                                                                                         
        <Field label="Full name">                                                                                                                                                                                  
          <Input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Akshat Rana" />                                                                                  
        </Field>                                                                                                                                                                                                   
        <Field label="Location">                                                                                                                                                                                   
          <Input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bengaluru" />                                                                                    
        </Field>                                                                                                                                                                                                   
        <Field label="Years of experience">
          <Input type="number" min={0} max={50} step="0.5" required value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="3" />                                                          
        </Field>                                                                                                                                                                                                   
      </div>
    </div>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}
                                                                                                                                                                                                                   
function StacksSection({
  stacks, setStacks, stackInput, setStackInput, addStack,
}: {
  stacks: string[]; setStacks: (s: string[]) => void;
  stackInput: string; setStackInput: (v: string) => void;                                                                                                                                                          
  addStack: (s: string) => void;
}) {                                                                                                                                                                                                               
  return (      
    <div>
      <SectionHeader title="Tech stacks" hint="Roles to search for. Press Enter to add custom skills." />
      <div className="max-w-xl">                                                                                                                                                                                   
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md p-3 mb-3 min-h-[64px]">
          <div className="flex flex-wrap gap-1.5">                                                                                                                                                                 
            {stacks.length === 0 ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 italic py-1">                                                                                                                            
                No skills yet — add at least one                                                                                                                                                                   
              </span>                                                                                                                                                                                              
            ) : (                                                                                                                                                                                                  
              stacks.map((s) => (                                                                                                                                                                                  
                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 ring-1 ring-blue-200 
dark:ring-blue-500/30">                                                                                                                                                                                            
                  {s}
                  <button type="button" onClick={() => setStacks(stacks.filter((x) => x !== s))}                                                                                                                   
                    className="ml-1 -mr-0.5 w-4 h-4 inline-flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-500/30"
                    aria-label={`Remove ${s}`}>×</button>                                                                                                                                                          
                </span>
              ))                                                                                                                                                                                                   
            )}  
          </div>                                                                                                                                                                                                   
        </div>
                                                                                                                                                                                                                   
        <Input  
          type="text" value={stackInput}
          onChange={(e) => setStackInput(e.target.value)}                                                                                                                                                          
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addStack(stackInput); } }}
          placeholder="Type a skill and press Enter…"                                                                                                                                                              
        />                                                                                                                                                                                                         
                                                                                                                                                                                                                   
        <div className="mt-3">                                                                                                                                                                                     
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Suggestions</div>
          <div className="flex flex-wrap gap-1.5">                                                                                                                                                                 
            {SUGGESTED.filter((s) => !stacks.includes(s)).map((s) => (
              <button key={s} type="button" onClick={() => addStack(s)}                                                                                                                                            
                className="px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-700                 
dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">                                                                                                 
                + {s}                                                                                                                                                                                              
              </button>                                                                                                                                                                                            
            ))}                                                                                                                                                                                                    
          </div>
        </div>                                                                                                                                                                                                     
      </div>    
    </div>
  );
}

function ResumeSection({
  resumeFile, setResumeFile, existingResume,
  resumeSummary, setResumeSummary,                                                                                                                                                                                 
  generating, onRegenerate,
}: {                                                                                                                                                                                                               
  resumeFile: File | null; setResumeFile: (f: File | null) => void;
  existingResume: string | null;
  resumeSummary: string; setResumeSummary: (v: string) => void;                                                                                                                                                    
  generating: boolean; onRegenerate: () => void;
}) {                                                                                                                                                                                                               
  return (      
    <div>                                                                                                                                                                                                          
      <SectionHeader title="Resume" hint="Used to score every job against your background." />
      <div className="grid lg:grid-cols-2 gap-5">                                                                                                                                                                  
        {/* File */}
        <Field label="Resume file">                                                                                                                                                                                
          <label className="group block cursor-pointer">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5             
transition-colors">                                                                                                                                                                                                
              <div className="flex items-center gap-3">                                                                                                                                                            
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-none">                                               
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">                                                                                                  
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />                                                                                    
                  </svg>                                                                                                                                                                                           
                </div>                                                                                                                                                                                             
                <div className="flex-1 min-w-0">                                                                                                                                                                   
                  {resumeFile ? (
                    <>                                                                                                                                                                                             
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{resumeFile.name}</div>
                      <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">New — save to apply</div>                                                                                                 
                    </>                                                                                                                                                                                            
                  ) : existingResume ? (                                                                                                                                                                           
                    <>                                                                                                                                                                                             
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{existingResume}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click to replace</div>                                                                                                    
                    </>                                                                                                                                                                                            
                  ) : (                                                                                                                                                                                            
                    <>                                                                                                                                                                                             
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-400">Click to upload</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">PDF / TXT · max 5 MB</div>                                                                                                
                    </>                                                                                                                                                                                            
                  )}                                                                                                                                                                                               
                </div>                                                                                                                                                                                             
              </div>
              <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"                                                                                                                                  
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
            </div>                                                                                                                                                                                                 
          </label>
        </Field>                                                                                                                                                                                                   
                
        {/* Summary */}
        <Field label="AI summary">
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">                                                                              
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-slate-700">                                                                                        
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wider">                                                          
                <SparkleIcon className="w-3 h-3" />                                                                                                                                                                
                AI generated                                                                                                                                                                                       
              </span>                                                                                                                                                                                              
              <button type="button" onClick={onRegenerate} disabled={generating || (!resumeFile && !existingResume)}                                                                                               
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed
 transition-colors">                                                                                                                                                                                               
                {generating ? (                                                                                                                                                                                    
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">                                                                                                                           
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />                                                                                                         
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>                                                                                                                                                                                           
                ) : <RefreshIcon />}
                {generating ? "Generating…" : "Regenerate"}                                                                                                                                                        
              </button>
            </div>                                                                                                                                                                                                 
            <textarea rows={6} value={resumeSummary} onChange={(e) => setResumeSummary(e.target.value)}
              placeholder="Click Regenerate to have OpenAI write this from your resume."                                                                                                                           
              className="w-full px-3 py-2.5 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none" />                                                
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-3 py-1.5 border-t border-slate-200 dark:border-slate-700">                                         
              <span>Editable</span>                                                                                                                                                                                
              <span className="tabular-nums">{resumeSummary.length} chars</span>                                                                                                                                   
            </div>                                                                                                                                                                                                 
          </div>
        </Field>                                                                                                                                                                                                   
      </div>
    </div>                                                                                                                                                                                                         
  );            
}

function AccountSection({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  return (
    <div>                                                                                                                                                                                                          
      <SectionHeader title="Account" hint="Your sign-in details." />
      <div className="max-w-xl space-y-4">                                                                                                                                                                         
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-md">                                                    
          <div className="min-w-0">                                                                                                                                                                                
            <div className="text-xs text-slate-500 dark:text-slate-400">Signed in as</div>                                                                                                                         
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{email ?? "—"}</div>                                                                                                  
          </div>                                                                                                                                                                                                   
          <button onClick={onSignOut}                                                                                                                                                                              
            className="text-sm font-medium px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">  
            Sign out                                                                                                                                                                                               
          </button>
        </div>                                                                                                                                                                                                     
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Password and email changes go through Supabase — coming soon.                                                                                                                                            
        </p>                                                                                                                                                                                                       
      </div>                                                                                                                                                                                                       
    </div>                                                                                                                                                                                                         
  );            
}

/* ===================== primitives ===================== */                                                                                                                                                       
 
function SectionHeader({ title, hint }: { title: string; hint: string }) {                                                                                                                                         
  return (      
    <div className="mb-4">                                                                                                                                                                                         
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>                                                                                                                                  
    </div>                                                                                                                                                                                                         
  );
}                                                                                                                                                                                                                  
                
function Field({ label, children }: { label: string; children: React.ReactNode }) {                                                                                                                                
  return (
    <div>                                                                                                                                                                                                          
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      {children}                                                                                                                                                                                                   
    </div>
  );                                                                                                                                                                                                               
}               

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input                                                                                                                                                                                                         
      {...props}
      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400                        
dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 transition"                                                                  
    />
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
                
function snapshot(name: string, loc: string, exp: string | number | null, stacks: string[] | null, summary: string): string {                                                                                      
  return JSON.stringify({
    name: (name ?? "").trim(),                                                                                                                                                                                     
    loc: (loc ?? "").trim(),
    exp: exp == null || exp === "" ? "" : String(exp),                                                                                                                                                             
    stacks: stacks ?? [],                                                                                                                                                                                          
    summary: (summary ?? "").trim(),                                                                                                                                                                               
  });                                                                                                                                                                                                              
}     