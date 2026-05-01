import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";                                                                                                                                                                    
  import { updateSession } from "@/lib/supabase/middleware";
                                                                                                                                                                                                                     
  const PUBLIC_PATHS = ["/login", "/auth/callback"];
                                                                                                                                                                                                                     
  export async function middleware(req: NextRequest) {                                                                                                                                                               
    const { pathname } = req.nextUrl;
    const { response, user } = await updateSession(req);                                                                                                                                                             
                  
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));                                                                                                                       
  
    if (isPublic) {                                                                                                                                                                                                  
      if (pathname === "/login" && user) {
        return NextResponse.redirect(new URL("/overview", req.url));                                                                                                                                                 
      }           
      return response;
    }                                                                                                                                                                                                                
  
    if (!user) {                                                                                                                                                                                                     
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return response;
  }
                                                                                                                                                                                                                     
  export const config = {
    matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],                                                                                                                                                                 
  }; 