'use client'

import { ApiClient } from '@/actions/api';
import { isErrorResponse } from '@/hooks/useApi';
import { captureException } from '@sentry/nextjs';
import { useEffect, useState } from 'react';

export type DocumentFileUrlResult =
    | { url: string }
    | { error: { message?: string; detail?: string; status?: number } };

/**
 * Ask the backend for a short-lived link to a document's file.
 *
 * The link carries its own authorisation (a pre-signed S3 URL, or a signed backend URL when
 * files are stored locally), so it is fetched *without* the login cookie. That is what lets
 * the PDF viewer load straight from the bucket: a cookie-carrying request would need the
 * bucket to allow credentials, which S3 implementations do not reliably do.
 *
 * Links expire after ten minutes, so ask for one right before it is used rather than
 * keeping it around; the request deliberately bypasses useApi's GET cache for that reason.
 *
 * Resolves to null when the session has expired: ApiClient is then already redirecting to
 * the login page.
 */
export async function fetchDocumentFileUrl(documentId: number, inline: boolean): Promise<DocumentFileUrlResult | null> {
    let result: unknown;
    try {
        result = await ApiClient('GET', `/api/documents/${documentId}/file-url${inline ? '?inline=1' : ''}`);
    } catch {
        // A redirect to the login page surfaces here; Next.js carries it out.
        return null;
    }

    if (isErrorResponse(result)) {
        return result;
    }

    const url = (result as { url?: unknown } | null)?.url;
    if (typeof url !== 'string') {
        captureException(new Error('Unexpected file-url response'), { extra: { documentId } });
        return { error: { message: 'Unexpected response', status: 500 } };
    }

    // Local storage answers with a path on the backend; S3 with an absolute bucket URL.
    return { url: new URL(url, process.env.NEXT_PUBLIC_BACKEND_URL).toString() };
}

/**
 * The link for a document while a component shows it. `url` is null until it arrives;
 * `failed` is set when the file cannot be opened (missing, no access, or a server error).
 */
export function useDocumentFileUrl(documentId: number, { inline }: { inline: boolean }) {
    const key = `${documentId}:${inline}`;
    const [result, setResult] = useState<{ key: string; url: string | null } | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetchDocumentFileUrl(documentId, inline).then((response) => {
            if (cancelled || response === null) return;
            setResult({ key, url: 'url' in response ? response.url : null });
        });

        return () => {
            cancelled = true;
        };
    }, [documentId, inline, key]);

    // A result for another document (the component was reused) counts as still loading.
    const current = result?.key === key ? result : null;

    return {
        url: current?.url ?? null,
        failed: current !== null && current.url === null,
    };
}
