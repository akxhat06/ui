"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./theme-toggle";
import { getSupabaseBrowser } from "@/lib/supabase/client";


const navItems = [
  { href: "/overview",   label: "Overview"   },                                                                                                                                                                    
  { href: "/apply-jobs", label: "Apply jobs" },
  { href: "/settings",   label: "Settings"   },                                                                                                                                                                    
];

export default function Sidebar({ email, name }: { email: string | null; name: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = getSupabaseBrowser();


  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // async function logout() {
  //   await fetch("/api/auth/logout", { method: "POST" });
  //   router.push("/login");                                                                                                                                                                                         
  //   router.refresh();
  // }      

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-14">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 -ml-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Job Hunter Pipeline</div>
        <ThemeToggle compact />
      </header>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-200
md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
          } md:transform-none`}
      >
        {/* Brand */}
        <div className="px-5 h-14 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Job Hunter Pipeline</div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="md:hidden p-1.5 -mr-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 pt-5 pb-2 text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wide">
          Workspace
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 text-sm rounded-md transition-colors ${active
                  ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="px-3 pb-2 hidden md:block">
          <ThemeToggle />
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-sm font-semibold">
              A
            </div>
            <div className="flex-1 min-w-0">
              {/* <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">akshat</div> */}
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight truncate">
                {name ?? email ?? "User"}
              </div>
              <button
                onClick={logout}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors mt-0.5"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}  