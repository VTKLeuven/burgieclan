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

const DEFAULT_GET_CACHE_TTL_MS = 60_000;
const SESSION_CACHE_PREFIX = 'burgie_cache:';
const getCache = new Map<string, CachedGet>();
const pendingGets = new Map<string, Promise<unknown>>();

const getTtlForEndpoint = (endpoint: string): number => {
    if (
        endpoint.startsWith('/api/quick_links')
        || endpoint.startsWith('/api/document_categories')
        || endpoint.startsWith('/api/comment_categories')
        || endpoint.startsWith('/api/pages')
        || endpoint.startsWith('/api/faq_items')
        || endpoint.startsWith('/api/tags')
    ) {
        return 10 * 60_000; // 10 minutes for static metadata
    }
    if (endpoint.startsWith('/api/programs')) {
        return 5 * 60_000; // 5 minutes for program tree
    }
    if (endpoint.startsWith('/api/document_views')) {
        return 2 * 60_000; // 2 minutes for recent views
    }
    return DEFAULT_GET_CACHE_TTL_MS;
};

const readStorageCache = (endpoint: string): CachedGet | undefined => {
    if (typeof window === 'undefined') return undefined;
    try {
        const item = window.sessionStorage.getItem(SESSION_CACHE_PREFIX + endpoint);
        if (!item) return undefined;
        const parsed = JSON.parse(item) as CachedGet;
        if (parsed.expiresAt <= Date.now()) {
            window.sessionStorage.removeItem(SESSION_CACHE_PREFIX + endpoint);
            return undefined;
        }
        return parsed;
    } catch {
        return undefined;
    }
};

const writeStorageCache = (endpoint: string, cached: CachedGet): void => {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(SESSION_CACHE_PREFIX + endpoint, JSON.stringify(cached));
    } catch {
        // Ignore quota limits
    }
};

const clearStorageCache = (): void => {
    if (typeof window === 'undefined') return;
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            if (key?.startsWith(SESSION_CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
    } catch {
        // Ignore
    }
};

/**
 * Curriculum structure and document listings are read repeatedly by the page, breadcrumb and
 * sidebar. Keeping them briefly in the browser removes those duplicate round trips while still
 * letting edits become visible quickly. Mutations clear the cache immediately below.
 */
const isCacheableGet = (endpoint: string): boolean => (
    endpoint.startsWith('/api/programs')
    || /^\/api\/modules\/\d+(?:$|\?|\/path(?:$|\?))/.test(endpoint)
    || /^\/api\/courses(?:\/|\?|$)/.test(endpoint)
    || endpoint.startsWith('/api/document_categories')
    || endpoint.startsWith('/api/comment_categories')
    || endpoint.startsWith('/api/documents')
    || endpoint.startsWith('/api/document_comments')
    || endpoint.startsWith('/api/announcements')
    || endpoint.startsWith('/api/quick_links')
    || endpoint.startsWith('/api/faq_items')
    || endpoint.startsWith('/api/pages')
    || endpoint.startsWith('/api/tags')
    || endpoint.startsWith('/api/document_views')
    || /^\/api\/users\/\d+(?:$|\?|\/favorites)/.test(endpoint)
);

const freshCachedValue = (endpoint: string): unknown | undefined => {
    const memoryCached = getCache.get(endpoint);
    if (memoryCached) {
        if (memoryCached.expiresAt > Date.now()) {
            return memoryCached.value;
        }
        getCache.delete(endpoint);
    }

    const storageCached = readStorageCache(endpoint);
    if (storageCached) {
        getCache.set(endpoint, storageCached);
        return storageCached.value;
    }

    return undefined;
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
            const ttl = getTtlForEndpoint(endpoint);
            const cachedEntry: CachedGet = { value: result, expiresAt: Date.now() + ttl };
            getCache.set(endpoint, cachedEntry);
            writeStorageCache(endpoint, cachedEntry);
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
                clearStorageCache();
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
