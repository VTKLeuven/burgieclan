'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import * as Sentry from "@sentry/nextjs";
import ErrorPage from "@/components/error/ErrorPage";
import type { ErrorResponse } from '@/types/error';

/**
 * Catches unexpected client-side errors in all lower-level components
 */
export default function Error({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error])

    const errorResponse: ErrorResponse = {
        status: 500,
        generalMessage: 'Unexpected Error.',
        detailedMessage: error.message,
        stackTrace: error.stack || '',
    };

    return (
        <div className="h-full">
            <ErrorPage error={errorResponse}/>
        </div>
    )
}