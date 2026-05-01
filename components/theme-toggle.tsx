"use client";
                                                                                                                                                                                                                     
import { useEffect, useState } from "react";

type Theme = "light" | "dark";                                                                                                                                                                                     

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {                                                                                                                                  
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);                                                                                                                                                                   

  useEffect(() => {                                                                                                                                                                                                
    setMounted(true);
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);                                                                                                                                                                                                          

  function toggle() {                                                                                                                                                                                              
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);                                                                                                                                                                                                
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("theme", next); } catch {}                                                                                                                                                          
  }             
                                                                                                                                                                                                                   
  if (!mounted) return <div className={compact ? "w-8 h-8" : "w-full h-9"} aria-hidden />;                                                                                                                         

  const isDark = theme === "dark";                                                                                                                                                                                 
                
  if (compact) {
    return (
      <button                                                                                                                                                                                                      
        onClick={toggle}
        aria-label="Toggle theme"                                                                                                                                                                                  
        className="w-8 h-8 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
      >                                                                                                                                                                                                            
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>                                                                                                                                                                                                    
    );          
  }                                                                                                                                                                                                                

  return (                                                                                                                                                                                                         
    <button     
      onClick={toggle}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
    >                                                                                                                                                                                                              
      <span className="flex items-center gap-2">
        {isDark ? <SunIcon /> : <MoonIcon />}                                                                                                                                                                      
        <span>{isDark ? "Light mode" : "Dark mode"}</span>
      </span>                                                                                                                                                                                                      
      <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-200 dark:bg-blue-600 transition-colors">
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? "translate-x-4" : "translate-x-0.5"}`} />                                                           
      </span>                                                                                                                                                                                                      
    </button>                                                                                                                                                                                                      
  );                                                                                                                                                                                                               
}               

function SunIcon() {                                                                                                                                                                                               
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">                                                                   
      <circle cx="12" cy="12" r="4" />                                                                                                                                                                             
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>                                                                                                                                                                                                         
  );            
}                                                                                                                                                                                                                  
                
function MoonIcon() {                                                                                                                                                                                              
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">                                                                   
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />                                                                                                                                                 
    </svg>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
}   