import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth";

export async function middleware(req: NextRequest) {
    const session = await auth();
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
    const isApiRoute = req.nextUrl.pathname.startsWith("/api");

    // Allow API routes to pass through
    if (isApiRoute) {
        return NextResponse.next();
    }

    // Redirect to dashboard if the user is already authenticated and trying to access auth pages
    if (session && isAuthPage) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Redirect to login if the user is not authenticated and trying to access protected routes
    if (!session && !isAuthPage) {
        return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Protected routes
        "/dashboard/:path*",
        "/profile/:path*",
        // Auth routes
        "/auth/:path*",
    ],
};
