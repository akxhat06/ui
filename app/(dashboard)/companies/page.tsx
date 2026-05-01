"use client";
                                                                                                                                                                                                                                                                               
import { useState } from "react";                                                                                                                                                                                                                                            

type Status = "applied" | "not_applied" | "rejected" | "interview";                                                                                                                                                                                                          
                
type Company = {
  id: string;
  name: string;                                                                                                                                                                                                                                                              
  role: string;
  location: string;                                                                                                                                                                                                                                                          
  appliedOn: string | null;
  status: Status;
};

const initial: Company[] = [                                                                                                                                                                                                                                                 
  { id: "1", name: "Wells Fargo",   role: "Lead Software Engineer",   location: "Bengaluru", appliedOn: "2026-04-25", status: "applied" },
  { id: "2", name: "Resolve Tech",  role: "Lead Backend Developer",   location: "Bengaluru", appliedOn: null,         status: "not_applied" },                                                                                                                               
  { id: "3", name: "Otter",         role: "Fullstack Developer",      location: "Bengaluru", appliedOn: "2026-04-22", status: "interview" },                                                                                                                                 
  { id: "4", name: "Amoga",         role: "Software Engineer",        location: "Bengaluru", appliedOn: null,         status: "not_applied" },                                                                                                                               
  { id: "5", name: "Persistent",    role: "Node.js Lead",             location: "Bengaluru", appliedOn: "2026-04-20", status: "rejected" },                                                                                                                                  
];                                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                                             
const labels: Record<Status, string> = {                                                                                                                                                                                                                                     
  applied:     "Applied",                                                                                                                                                                                                                                                    
  not_applied: "Not applied",
  rejected:    "Rejected",                                                                                                                                                                                                                                                   
  interview:   "Interview",
};                                                                                                                                                                                                                                                                           
                
const pill: Record<Status, string> = {                                                                                                                                                                                                                                       
  applied:     "bg-blue-50 text-blue-700",
  not_applied: "bg-slate-100 text-slate-600",                                                                                                                                                                                                                                
  rejected:    "bg-red-50 text-red-700",
  interview:   "bg-emerald-50 text-emerald-700",                                                                                                                                                                                                                             
};
                                                                                                                                                                                                                                                                             
export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>(initial);
  const [filter, setFilter] = useState<"all" | Status>("all");                                                                                                                                                                                                               
  const [query, setQuery] = useState("");
                                                                                                                                                                                                                                                                             
  const filtered = companies
    .filter((c) => filter === "all" || c.status === filter)                                                                                                                                                                                                                  
    .filter((c) =>
      query.trim() === ""
        ? true                                                                                                                                                                                                                                                               
        : (c.name + " " + c.role).toLowerCase().includes(query.toLowerCase())
    );                                                                                                                                                                                                                                                                       
                
  function updateStatus(id: string, status: Status) {                                                                                                                                                                                                                        
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === id                                                                                                                                                                                                                                                          
          ? {
              ...c,                                                                                                                                                                                                                                                          
              status,
              appliedOn:
                status === "applied" && !c.appliedOn
                  ? new Date().toISOString().slice(0, 10)                                                                                                                                                                                                                    
                  : c.appliedOn,
            }                                                                                                                                                                                                                                                                
          : c   
      )
    );
  }                                                                                                                                                                                                                                                                          

  const counts = {                                                                                                                                                                                                                                                           
    all:         companies.length,
    not_applied: companies.filter((c) => c.status === "not_applied").length,
    applied:     companies.filter((c) => c.status === "applied").length,                                                                                                                                                                                                     
    interview:   companies.filter((c) => c.status === "interview").length,
    rejected:    companies.filter((c) => c.status === "rejected").length,                                                                                                                                                                                                    
  };                                                                                                                                                                                                                                                                         

  return (                                                                                                                                                                                                                                                                   
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5 mb-6">                                                                                                                                                                
        <div>                                                                                                                                                                                                                                                                
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">                                                                                                                                                                                       
            Workspace                                                                                                                                                                                                                                                        
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">Applications</h1>                                                                                                                                                                                       
        </div>  
        <div className="text-sm text-slate-500">                                                                                                                                                                                                                             
          <span className="text-slate-900 font-semibold">{companies.length}</span> tracked
        </div>                                                                                                                                                                                                                                                               
      </header> 
                                                                                                                                                                                                                                                                             
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">                                                                                                                                                                                                                             
          {(["all", "not_applied", "applied", "interview", "rejected"] as const).map((f) => {
            const active = filter === f;                                                                                                                                                                                                                                     
            return (
              <button                                                                                                                                                                                                                                                        
                key={f}
                onClick={() => setFilter(f)}                                                                                                                                                                                                                                 
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  active                                                                                                                                                                                                                                                     
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"                                                                                                                                                                                           
                }`}                                                                                                                                                                                                                                                          
              >
                {f === "all" ? "All" : labels[f]}                                                                                                                                                                                                                            
                <span className={`ml-1.5 ${active ? "text-slate-300" : "text-slate-400"}`}>
                  {counts[f]}                                                                                                                                                                                                                                                
                </span>
              </button>                                                                                                                                                                                                                                                      
            );  
          })}                                                                                                                                                                                                                                                                
        </div>  
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company or role…"                                                                                                                                                                                                                              
          className="ml-auto w-full sm:w-64 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
        />                                                                                                                                                                                                                                                                   
      </div>    
                                                                                                                                                                                                                                                                             
      {/* Table (md+) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">                                                                                                                                                                                                                                   
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>                                                                                                                                                                                                                                                             
              <Th>Company</Th>
              <Th>Role</Th>                                                                                                                                                                                                                                                  
              <Th>Location</Th>
              <Th>Status</Th>
              <Th align="right">Applied on</Th>                                                                                                                                                                                                                              
            </tr>
          </thead>                                                                                                                                                                                                                                                           
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">                                                                                                                                                                                                                  
                <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-700">{c.role}</td>                                                                                                                                                                                                       
                <td className="px-4 py-3 text-slate-500">{c.location}</td>
                <td className="px-4 py-3">                                                                                                                                                                                                                                   
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${pill[c.status]} mr-2`}>
                    {labels[c.status]}                                                                                                                                                                                                                                       
                  </span>
                  <select                                                                                                                                                                                                                                                    
                    value={c.status}                                                                                                                                                                                                                                         
                    onChange={(e) => updateStatus(c.id, e.target.value as Status)}
                    className="text-xs text-slate-600 bg-transparent border border-slate-200 rounded px-1.5 py-0.5 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-300"                                                                               
                  >                                                                                                                                                                                                                                                          
                    {Object.entries(labels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>                                                                                                                                                                                                                 
                    ))}
                  </select>                                                                                                                                                                                                                                                  
                </td>
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums font-mono text-xs">
                  {c.appliedOn || "—"}                                                                                                                                                                                                                                       
                </td>
              </tr>                                                                                                                                                                                                                                                          
            ))} 
            {filtered.length === 0 && (                                                                                                                                                                                                                                      
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                  No matches.                                                                                                                                                                                                                                                
                </td>
              </tr>                                                                                                                                                                                                                                                          
            )}  
          </tbody>
        </table>
      </div>
                                                                                                                                                                                                                                                                             
      {/* Card list (mobile) */}
      <div className="md:hidden space-y-3">                                                                                                                                                                                                                                  
        {filtered.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-md p-4">
            <div className="flex items-start justify-between gap-3">                                                                                                                                                                                                         
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">{c.name}</div>                                                                                                                                                                                          
                <div className="text-sm text-slate-600 truncate">{c.role}</div>
                <div className="text-xs text-slate-500 mt-0.5">{c.location}</div>                                                                                                                                                                                            
              </div>
              <span className={`flex-none px-2 py-0.5 rounded text-[11px] font-medium ${pill[c.status]}`}>                                                                                                                                                                   
                {labels[c.status]}                                                                                                                                                                                                                                           
              </span>
            </div>                                                                                                                                                                                                                                                           
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">                                                                                                                                                                  
              <select
                value={c.status}                                                                                                                                                                                                                                             
                onChange={(e) => updateStatus(c.id, e.target.value as Status)}
                className="text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"                                                                                                                            
              >                                                                                                                                                                                                                                                              
                {Object.entries(labels).map(([k, v]) => (                                                                                                                                                                                                                    
                  <option key={k} value={k}>{v}</option>                                                                                                                                                                                                                     
                ))}                                                                                                                                                                                                                                                          
              </select>
              <span className="text-slate-500 font-mono">{c.appliedOn || "—"}</span>                                                                                                                                                                                         
            </div>
          </div>                                                                                                                                                                                                                                                             
        ))}
        {filtered.length === 0 && (                                                                                                                                                                                                                                          
          <div className="text-center text-sm text-slate-500 py-12">No matches.</div>
        )}                                                                                                                                                                                                                                                                   
      </div>
    </div>                                                                                                                                                                                                                                                                   
  );            
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {                                                                                                                                                                         
  return (
    <th                                                                                                                                                                                                                                                                      
      className={`px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide ${
        align === "right" ? "text-right" : "text-left"                                                                                                                                                                                                                       
      }`}
    >                                                                                                                                                                                                                                                                        
      {children}
    </th>
  );
}