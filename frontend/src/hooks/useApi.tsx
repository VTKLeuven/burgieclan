'use client'

import { ApiClient } from '@/actions/api';
import { ApiError } from '@/utils/error/apiError';
import { captureException } from "@sentry/nextjs";
import { useCallback, useState } from 'react';

type ApiErrorBody = { message?: string; detail?: string; status?: number };

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
            const result = await ApiClient(method, endpoint, body, customHeaders);

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