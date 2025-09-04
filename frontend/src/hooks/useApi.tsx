'use client'

import { ApiClient } from '@/actions/api';
import { ApiError } from '@/utils/error/apiError';
import { useCallback, useState } from 'react';

export function useApi() {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<ApiError | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

    const request = useCallback(async (
        method: string,
        endpoint: string,
        body?: any,
        customHeaders?: Headers
    ): Promise<any> => {
        setLoading(true);
        setError(null);
        setIsRedirecting(false);

        try {
            const result = await ApiClient(method, endpoint, body, customHeaders);

            // Check if the response contains an error
            if (result && 'error' in result) {
                console.error(result.error.detail ?? result.error.message ?? 'An unexpected error occurred');
                setError(new ApiError(result.error.detail ?? result.error.message ?? 'An unexpected error occurred', result.error.status));
                setData(null);
                return null;
            }

            // Success case
            setData(result);
            return result;
        } catch (err) {
            setIsRedirecting(true);
            console.error('Error during API request');
            console.error(err);
            // Let Next.js handle the redirect automatically
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, error, loading, isRedirecting, request };
}