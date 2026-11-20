import { getServerJWT } from '@/lib/auth.server';

// Server-only plumbing shared by the ApiClient server action, the /bff read route and the pages
// that fetch their data while rendering. Deliberately not `'use server'`: none of this should be
// callable from the browser on its own.

export type ApiErrorResult = {
    error: { message: string; detail?: string; status: number; reason?: string };
};

const hasControlChars = (value: string): boolean => {
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code <= 0x1f || code === 0x7f) {
            return true;
        }
    }
    return false;
};

/**
 * The backend URL for an endpoint, or null when it is not one this app may call: anything outside
 * `/api/` on the configured backend, or anything that could be bent into another origin.
 */
export const backendUrl = (endpoint: unknown): string | null => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendBaseUrl) return null;

    if (
        typeof endpoint !== 'string'
        || !endpoint.startsWith('/api/')
        || endpoint.startsWith('//')
        || endpoint.includes('\\')
        || hasControlChars(endpoint)
    ) {
        return null;
    }

    const baseUrl = new URL(backendBaseUrl);
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(endpoint, baseUrl);
    } catch {
        return null;
    }

    if (parsedUrl.origin !== baseUrl.origin || !parsedUrl.pathname.startsWith('/api/')) {
        return null;
    }

    return parsedUrl.toString();
};

/**
 * Encodes an API error response from the backend server into a structured serializable format for the frontend.
 */
export const handleError = async (response: Response): Promise<ApiErrorResult> => {
    // Not every error reaches us as JSON: nginx serves an HTML page for 413/502, and PHP
    // emits a plain-text warning when a request body exceeds post_max_size. Parsing those
    // as JSON throws, which used to collapse the real status into a generic 500 and hide
    // the cause from the user entirely.
    // `reason` is a short machine-readable cause some endpoints add, for a translated message
    // (e.g. POST /api/exams/{id}/images).
    let errorData: { message?: string; title?: string; detail?: string; reason?: string } = {};
    try {
        errorData = await response.json();
    } catch {
        errorData = { detail: `${response.status} ${response.statusText}`.trim() };
    }

    switch (response.status) {
        case 401:
            return { error: { message: errorData.message || errorData.title || 'Unauthorized. Please log in again.', detail: errorData.detail, status: 401 } };
        case 404:
            return { error: { message: errorData.message || errorData.title || 'Resource not found.', detail: errorData.detail, status: 404 } };
        case 500:
            return { error: { message: errorData.message || errorData.title || 'Internal Server Error. Please try again later.', detail: errorData.detail, status: 500 } };
        default:
            return { error: { message: errorData.message || errorData.title || 'Unexpected Error.', detail: errorData.detail, status: response.status || 500, reason: errorData.reason } };
    }
};

type SharedAnnouncementCacheEntry = {
    value: unknown;
    expiresAt: number;
};

// Announcements are identical for every authenticated reader. Keep one response per locale/time
// bucket in the Next server process, so different users do not all repeat the same backend query.
const SHARED_ANNOUNCEMENT_TTL_MS = 5 * 60_000;
const sharedAnnouncementCache = new Map<string, SharedAnnouncementCacheEntry>();

export const usesSharedAnnouncementCache = (method: string, endpoint: string, jwt: string | null): boolean => (
    method.toUpperCase() === 'GET' && endpoint.startsWith('/api/announcements') && Boolean(jwt)
);

export const readSharedAnnouncement = (endpoint: string): unknown | undefined => {
    const now = Date.now();
    const cached = sharedAnnouncementCache.get(endpoint);

    if (cached && cached.expiresAt > now) return cached.value;

    sharedAnnouncementCache.delete(endpoint);
    return undefined;
};

export const writeSharedAnnouncement = (endpoint: string, value: unknown): void => {
    sharedAnnouncementCache.set(endpoint, { value, expiresAt: Date.now() + SHARED_ANNOUNCEMENT_TTL_MS });
};

/** What a read came back as: the body, a structured error, or no answer worth keeping. */
export type BackendRead =
    | { ok: true; value: unknown }
    | { ok: false; status: number; error: ApiErrorResult };

/**
 * A GET against the backend with the session's current token, if it has a valid one. Never
 * refreshes the token: a page render cannot set cookies, and parallel reads must not all spend
 * the same single-use refresh token. Whoever calls this decides what a 401 means.
 */
export const readBackend = async (endpoint: string, init?: { signal?: AbortSignal; jwt?: string | null }): Promise<BackendRead> => {
    const url = backendUrl(endpoint);
    if (!url) {
        return { ok: false, status: 400, error: { error: { message: 'Invalid API endpoint.', status: 400 } } };
    }

    const jwt = init?.jwt !== undefined ? init.jwt : await getServerJWT();
    const shared = usesSharedAnnouncementCache('GET', endpoint, jwt);
    if (shared) {
        const cached = readSharedAnnouncement(endpoint);
        if (cached !== undefined) return { ok: true, value: cached };
    }

    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (jwt) headers.set('Authorization', `Bearer ${jwt}`);

    const response = await fetch(url, { method: 'GET', headers, cache: 'no-store', signal: init?.signal });
    if (response.ok) {
        const value = response.status === 204 ? null : await response.json();
        if (shared) writeSharedAnnouncement(endpoint, value);
        return { ok: true, value };
    }

    return { ok: false, status: response.status, error: await handleError(response) };
};
