import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/login", "/api/auth/login"];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const authed = req.cookies.get("auth")?.value === "ok";

    if (PUBLIC.some((p) => pathname.startsWith(p))) {
        if (pathname === "/login" && authed) {
            return NextResponse.redirect(new URL("/overview", req.url));
        }
        return NextResponse.next();
    }

    if (!authed) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};   