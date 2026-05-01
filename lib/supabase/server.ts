import { cookies } from "next/headers";
  import { createServerClient } from "@supabase/ssr";                                                                                                                                                                
   
  export async function getSupabaseServer() {                                                                                                                                                                        
    const store = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,                                                                                                                                                                         
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {                                                                                                                                                                                                              
        cookies: {
          getAll() { return store.getAll(); },                                                                                                                                                                       
          setAll(toSet) {
            try { toSet.forEach(({ name, value, options }) => store.set(name, value, options)); }                                                                                                                    
            catch { /* called from a Server Component — safe to ignore */ }
          },                                                                                                                                                                                                         
        },        
      }                                                                                                                                                                                                              
    );            
  }