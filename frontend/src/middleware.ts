import { NextRequest, NextResponse } from "next/server";
import { i18nRouter } from 'next-i18n-router';
import { i18nConfig } from '../i18nConfig';

const PUBLIC_FILE = /\.(.*)$/;

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
    // Skip middleware for static files and API routes
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('/api/') ||
        PUBLIC_FILE.test(request.nextUrl.pathname)
    ) {
        return;
    }

    const isAuthenticated = request.cookies.has('jwt');

    // Match and extract the locale from the URL path
    const localeMatch = request.nextUrl.pathname.match(/^\/([a-z]{2})(?:\/|$)/);
    const locale = localeMatch ? localeMatch[1] : '';
    const loginUrl = locale ? `/${locale}/login` : '/login';
    const homeUrl = locale ? `/${locale}` : '/';

    // Redirect to login if user is not authenticated and the page is not public
    if (!isAuthenticated && !request.nextUrl.pathname.startsWith(loginUrl) && request.nextUrl.pathname !== homeUrl) {
        const pathWithoutLocale = locale ? request.nextUrl.pathname.slice(3).replace(/^\/|\/$/g, '') : request.nextUrl.pathname.slice(1).replace(/^\/|\/$/g, '');
        const publicPage = await isPublicPage(pathWithoutLocale);
        if (!publicPage) {
            return NextResponse.redirect(new URL(`${loginUrl}?redirectTo=${encodeURIComponent(request.nextUrl.href)}`, request.url));
        }
    }

    // Allow access
    return i18nRouter(request, i18nConfig);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - oauth (OAuth callback)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - public/images (public images)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!oauth|_next/static|_next/image|images|documents|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}