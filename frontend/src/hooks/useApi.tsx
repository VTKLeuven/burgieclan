'use client'

import { useState, useCallback } from 'react';
import { ApiClient } from '@/actions/api';

export function useApi<T = any>() {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

    const request = useCallback(async <R = T>(
        method: string,
        endpoint: string,
        body?: any,
        customHeaders?: Headers
    ): Promise<R | null> => {
        setLoading(true);
        setError(null);
        setIsRedirecting(false);

        try {
            const result = await ApiClient(method, endpoint, body, customHeaders);

            // Check if the response contains an error
            if (result && 'error' in result) {
                setError(result.error.message);
                setData(null);
                return null;
            }

            // Success case
            setData(result as T);
            return result as R;
        } catch (err) {
            console.log('API call resulted in redirection', err);
            setIsRedirecting(true);
            // Let Next.js handle the redirect automatically
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, error, loading, isRedirecting, request };
}