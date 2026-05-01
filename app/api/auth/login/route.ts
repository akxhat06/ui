import { NextResponse } from "next/server";

const USER = "akshat";                                                                                                                                                                  
const PASS = "aap";
                                                                                                                                                                                        
export async function POST(req: Request) {
  const { username, password } = await req.json();

  if (username === USER && password === PASS) {                                                                                                                                         
    const res = NextResponse.json({ ok: true });
    res.cookies.set("auth", "ok", {                                                                                                                                                     
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,                                                                                                                                                         
      path: "/",
    });                                                                                                                                                                                 
    return res; 
  }
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}