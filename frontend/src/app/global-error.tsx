"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import ErrorPage from "@/components/error/ErrorPage";
import type { ErrorResponse } from "@/types/error";

/**
 * Catches unexpected client-side errors in the root component
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    const errorResponse: ErrorResponse = {
        status: 500,
        generalMessage: 'Unexpected Error.',
        detailedMessage: error.message,
        stackTrace: error.stack || '',
    }
    return (
        <html>
            <body className="h-full">
                <ErrorPage error={errorResponse}/>
            </body>
        </html>
    );
}