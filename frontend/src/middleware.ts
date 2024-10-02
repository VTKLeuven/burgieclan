import {NextRequest, NextResponse} from "next/server";

/**
 * Fetches the list of public pages from the backend
 */
const getPublicAvailablePages = async () => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendBaseUrl) {
        throw new Error(`Missing environment variable for backend base URL`)
    }
    const url = backendBaseUrl + '/api/pages';
    const response = await fetch(url, {
        method: 'GET'
    })
    const data = await response.json();
    return data['hydra:member'];
}

/**
 * Check if the page with the given URL key is public
 */
const isPublicPage = async (urlKey: string) => {
    const pages = await getPublicAvailablePages();
    return pages.some((page: any) => page.urlKey === urlKey);
};

export default async function middleware(request: NextRequest) {
    const isAuthenticated = request.cookies.has('jwt');

    // Redirect to login if user is not authenticated and the page is not public
    // TODO: uncomment
    // if (!isAuthenticated) {
    //     const publicPage = await isPublicPage(request.nextUrl.pathname.slice(1));
    //     if (!publicPage) {
    //         return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(request.nextUrl.href)}`, request.url));
    //     }
    // }

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
         * - public/images (public images)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!login|oauth|_next/static|_next/image|images|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}