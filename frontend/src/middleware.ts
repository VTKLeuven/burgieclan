import {NextRequest, NextResponse} from "next/server";
import {redirect} from "next/navigation";

export function middleware(request: NextRequest) {

    const isAuthenticated = request.cookies.has('jwt');
    if (!isAuthenticated) {
        console.log(request.nextUrl.href);
        return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(request.nextUrl.href)}`, request.url));
        // redirect(`/login?redirectTo=${encodeURIComponent(request.headers?.get('host') || "/")}`);
    }

    // Allow access
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - login (login page)
         * - oauth (OAuth callback)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!login|oauth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}