'use client'

import { ApiClient } from '@/actions/api';
import { ApiError } from '@/utils/error/apiError';
import { captureException } from "@sentry/nextjs";
import { useCallback, useState } from 'react';

type ApiErrorBody = { message?: string; detail?: string; status?: number };

type CachedGet = {
    value: unknown;
    expiresAt: number;
};

const GET_CACHE_TTL_MS = 30_000;
const getCache = new Map<string, CachedGet>();
const pendingGets = new Map<string, Promise<unknown>>();

/**
 * Curriculum structure and document listings are read repeatedly by the page, breadcrumb and
 * sidebar. Keeping them briefly in the browser removes those duplicate round trips while still
 * letting edits become visible quickly. Mutations clear the cache immediately below.
 */
const isCacheableGet = (endpoint: string): boolean => (
    endpoint.startsWith('/api/programs')
    || /^\/api\/modules\/\d+(?:$|\?|\/path(?:$|\?))/.test(endpoint)
    || /^\/api\/courses\/\d+(?:$|\?|\/paths(?:$|\?))/.test(endpoint)
    || endpoint.startsWith('/api/document_categories')
    || endpoint.startsWith('/api/documents?')
    || /^\/api\/documents\/\d+(?:$|\?)/.test(endpoint)
);

const freshCachedValue = (endpoint: string): unknown | undefined => {
    const cached = getCache.get(endpoint);
    if (!cached) return undefined;

    if (cached.expiresAt <= Date.now()) {
        getCache.delete(endpoint);
        return undefined;
    }

    return cached.value;
};

const getWithDedupe = async (endpoint: string): Promise<unknown> => {
    if (isCacheableGet(endpoint)) {
        const cached = freshCachedValue(endpoint);
        if (cached !== undefined) return cached;
    }

    const pending = pendingGets.get(endpoint);
    if (pending) return pending;

    const request = ApiClient('GET', endpoint);
    pendingGets.set(endpoint, request);

    try {
        const result = await request;
        if (isCacheableGet(endpoint) && result !== null && !isErrorResponse(result)) {
            getCache.set(endpoint, { value: result, expiresAt: Date.now() + GET_CACHE_TTL_MS });
        }
        return result;
    } finally {
        pendingGets.delete(endpoint);
    }
};

/** Start a cacheable API request before the reader clicks. */
export const preloadApi = (endpoint: string): void => {
    if (!isCacheableGet(endpoint)) return;
    void getWithDedupe(endpoint).catch(() => { });
};

/** Lets a destination render cached data on its very first frame instead of flashing a spinner. */
export const readPreloadedApi = (endpoint: string): unknown | undefined => freshCachedValue(endpoint);

export type HydraCollection<T> = {
    'hydra:member': T[];
    'hydra:totalItems': number;
    error?: ApiErrorBody;
};

export const isErrorResponse = (value: unknown): value is { error: ApiErrorBody } => {
    if (!value || typeof value !== 'object') return false;
    if (!('error' in value)) return false;
    const error = (value as { error: unknown }).error;
    return typeof error === 'object' && error !== null;
};

export function useApi<T = unknown>() {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<ApiError | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

    const request = useCallback(async (
        method: string,
        endpoint: string,
        body?: unknown,
        customHeaders?: Headers
    ): Promise<T | null> => {
        setLoading(true);
        setError(null);
        setIsRedirecting(false);

        try {
            const isPlainGet = method.toUpperCase() === 'GET' && body === undefined && customHeaders === undefined;
            const result = isPlainGet
                ? await getWithDedupe(endpoint)
                : await ApiClient(method, endpoint, body, customHeaders);

            // Check if the response contains an error
            if (isErrorResponse(result)) {
                captureException(
                    new Error(result.error.detail ?? result.error.message ?? 'An unexpected error occurred'),
                    {
                        extra: {
                            context: "API error response",
                            status: result.error.status ?? 500,
                        },
                    }
                );
                setError(new ApiError(result.error.detail ?? result.error.message ?? 'An unexpected error occurred', result.error.status ?? 500));
                setData(null);
                return null;
            }

            if (result === null) {
                setData(null);
                return null;
            }

            if (!isPlainGet) {
                getCache.clear();
            }

            // Success case
            setData(result as T);
            return result as T;
        } catch (err: unknown) {
            setIsRedirecting(true);
            captureException(
                err instanceof Error ? err : new Error(String(err)),
                {
                    extra: { context: "Error during API request" },
                }
            );
            // Let Next.js handle the redirect automatically
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, error, loading, isRedirecting, request };
}
