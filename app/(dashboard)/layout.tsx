import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";                                                                                                                                                                        
import { getSupabaseServer } from "@/lib/supabase/server";                                                                                                                                                         
 
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {                                                                                                                       
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();                                                                                                                                                        
  if (!user) redirect("/login");
                                                                                                                                                                                                                   
  const { data: profile } = await supabase
    .from("profiles")                                                                                                                                                                                                
    .select("resume_summary, tech_stacks, full_name, location")                                                                                                                                                      
    .eq("id", user.id)
    .single(); 
                                                                                                                                                                                                                   
    const complete =                                                                                                                                                                                                   
    !!profile?.resume_summary?.trim() &&
    !!profile?.full_name?.trim() &&                                                                                                                                                                                  
    !!profile?.location?.trim() &&
    Array.isArray(profile?.tech_stacks) && profile.tech_stacks.length > 0;                                                                                                                                           
                                                                                                                                                                                                                   
  if (!complete) redirect("/onboarding");
                                                                                                                                                                                                                   
  return (      
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:flex">
      <Sidebar email={user.email ?? null} name={profile?.full_name ?? null} />                                                                                                                                     
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>                                                                                                                                 
    </div>                                                                                                                                                                                                         
  );                                                                                                                                                                                                               
} 