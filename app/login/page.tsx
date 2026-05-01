"use client";

import { useRouter } from "next/navigation";                                                                                                                                                                                                                                 
import { useState } from "react";
                                                                                                                                                                                                                                                                             
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);                                                                                                                                                                                                                   
  const [loading, setLoading] = useState(false);
                                                                                                                                                                                                                                                                             
  async function onSubmit(e: React.FormEvent) {                                                                                                                                                                                                                              
    e.preventDefault();
    setError(null);                                                                                                                                                                                                                                                          
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",                                                                                                                                                                                                                                                      
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),                                                                                                                                                                                                                        
      });       
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));                                                                                                                                                                                                                       
        throw new Error(data.error ?? `Login failed (${r.status})`);
      }                                                                                                                                                                                                                                                                      
      router.push("/overview");
      router.refresh();                                                                                                                                                                                                                                                      
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {                                                                                                                                                                                                                                                              
      setLoading(false);
    }                                                                                                                                                                                                                                                                        
  }             

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-md p-6 shadow-sm">                                                                                                                                                                            
        <div className="mb-6 text-center">                                                                                                                                                                                                                                   
          <div className="text-base font-semibold text-slate-900">ATS Tracker</div>                                                                                                                                                                                          
          <div className="text-sm text-slate-500 mt-1">Sign in to continue</div>                                                                                                                                                                                             
        </div>  
                                                                                                                                                                                                                                                                             
        <form onSubmit={onSubmit} className="space-y-4">                                                                                                                                                                                                                     
          <div>
            <label htmlFor="u" className="block text-xs font-medium text-slate-700 mb-1">                                                                                                                                                                                    
              Username                                                                                                                                                                                                                                                       
            </label>
            <input                                                                                                                                                                                                                                                           
              id="u"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required                                                                                                                                                                                                                                                       
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            />                                                                                                                                                                                                                                                               
          </div>
                                                                                                                                                                                                                                                                             
          <div> 
            <label htmlFor="p" className="block text-xs font-medium text-slate-700 mb-1">
              Password                                                                                                                                                                                                                                                       
            </label>
            <input                                                                                                                                                                                                                                                           
              id="p"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required                                                                                                                                                                                                                                                       
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            />                                                                                                                                                                                                                                                               
          </div>
                                                                                                                                                                                                                                                                             
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}                                                                                                                                                                                                                                                        
            </div>
          )}                                                                                                                                                                                                                                                                 
                
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >                                                                                                                                                                                                                                                                  
            {loading ? "Signing in…" : "Sign in"}
          </button>                                                                                                                                                                                                                                                          
        </form> 
      </div>
    </div>
  );
}