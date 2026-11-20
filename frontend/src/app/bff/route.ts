import { COOKIE_NAMES } from '@/utils/cookieNames';
import { getServerJWT } from '@/lib/auth.server';
import { readBackend } from '@/lib/backendApi.server';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Reads for the browser, run side by side.
 *
 * Everything used to go through the ApiClient server action, and Next dispatches server actions
 * one at a time per tab: a course page asking for six things waited for six round trips in a
 * row, and its sections arrived one after another, each shoving the page down. A route handler
 * has no such queue. It is a thin pass-through with the session token attached, answering in
 * exactly the shape ApiClient returns, so callers cannot tell the two apart.
 *
 * Anything it should not decide on its own it answers with 401, and the caller retries through
 * ApiClient: an expired token (refreshing is the action's job, and parallel reads must not all
 * spend the same single-use refresh token) and a 401 from the backend (the action logs out and
 * sends the reader to the login page).
 *
 * `GET /bff?endpoint=/api/...` — the same endpoint string ApiClient takes.
 */
export async function GET(request: NextRequest) {
    const endpoint = request.nextUrl.searchParams.get('endpoint') ?? '';

    const jwt = await getServerJWT();
    if (!jwt && (await cookies()).get(COOKIE_NAMES.REFRESH_TOKEN)) {
        return respond(null, 401);
    }

    try {
        const result = await readBackend(endpoint, { jwt });
        if (result.ok) return respond(result.value);
        if (result.status === 401) return respond(null, 401);
        return respond(result.error);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected API Error.';
        return respond({ error: { message, status: 500 } });
    }
}

const respond = (body: unknown, status = 200) => NextResponse.json(body, {
    status,
    // Per-user data: never stored by a proxy or the browser's HTTP cache.
    headers: { 'Cache-Control': 'private, no-store' },
});
