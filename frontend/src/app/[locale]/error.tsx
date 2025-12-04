'use client' // Error boundaries must be Client Components

import ErrorPage from "@/components/error/ErrorPage";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Catches unexpected client-side errors in all lower-level components
 */
export default function Error({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error])

    return (
        <div className="h-full">
            <ErrorPage detail={error.message} />
        </div>
    )
}