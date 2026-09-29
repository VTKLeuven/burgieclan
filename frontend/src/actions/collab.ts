'use server';

import { ApiClient } from '@/actions/api';

export type CollabMode = 'edit' | 'view';

export type CollabTokenResult =
    | { token: string; mode: CollabMode }
    | { error: { status: number; message: string } };

/**
 * Asks Symfony for a short-lived token to open a live document on the collab server.
 *
 * Goes through the server so the JWT stays in its HTTP-only cookie: the browser only ever sees
 * the collab token, which opens this one document and nothing else. The provider calls this on
 * every (re)connect, so an expired token is never reused.
 */
export async function getCollabToken(document: string): Promise<CollabTokenResult> {
    const result = await ApiClient('POST', '/api/collab/token', { document });

    if (result && typeof result === 'object' && 'token' in result && typeof result.token === 'string') {
        return { token: result.token, mode: result.mode === 'view' ? 'view' : 'edit' };
    }

    const error = result && typeof result === 'object' && 'error' in result
        ? (result.error as { status?: number; message?: string })
        : {};

    return { error: { status: error.status ?? 500, message: error.message ?? 'Unexpected error' } };
}
