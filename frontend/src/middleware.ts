import { NextRequest, NextResponse } from "next/server";
import { getJWTExpiration } from "@/utils/oauth";
import { i18nRouter } from 'next-i18n-router';
import { i18nConfig } from '../i18nConfig';
import type { Page } from "@/types/entities";
import { convertToPage } from "@/utils/convertToEntity";

/**
 * Fetches the list of public pages from the backend
 */
const getPublicAvailablePages = async (): Promise<Page[]> => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendBaseUrl) {
        throw new Error(`Missing environment variable for backend base URL`)
    }
    const url = backendBaseUrl + '/api/pages';
    const response = await fetch(url, {
        method: 'GET'
    });
    const data = await response.json();

    const pages: Page[] = data['hydra:member'].map(convertToPage);
    return pages;
}

const startsWithAllowedPath = (pathWithoutLocale: string): boolean => {
    const allowedPaths = [
        'login',
        'oauth',
    ];

    return allowedPaths.some((path) => pathWithoutLocale.startsWith(path));
}

/**
 * Check if the page with the given URL key is public
 */
const isPublicPage = async (urlKey: string) => {
    const pages = await getPublicAvailablePages();
    return pages.some((page: Page) => page.urlKey === urlKey);
};

export default async function middleware(request: NextRequest) {
    let jwt = request.cookies.get('jwt')?.value || null;
    let isAuthenticated = jwt && Date.now() <= getJWTExpiration(jwt) * 1000;

    // Match and extract the locale from the URL path
    const localeMatch = request.nextUrl.pathname.match(/^\/([a-z]{2})(?:\/|$)/);
    const locale = localeMatch ? localeMatch[1] : '';
    const pathWithoutLocale = locale ? request.nextUrl.pathname.slice(3).replace(/^\/|\/$/g, '') : request.nextUrl.pathname.slice(1).replace(/^\/|\/$/g, '');

    // Redirect to login if user is not authenticated and the page is not public
    if (!isAuthenticated && !startsWithAllowedPath(pathWithoutLocale)) {
        const publicPage = await isPublicPage(pathWithoutLocale);
        if (!publicPage) {
            const loginUrl = locale ? `/${locale}/login` : '/login';
            await new Promise(resolve => setTimeout(resolve, 10000));
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
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - public/images (public images)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!_next/static|_next/image|images|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}