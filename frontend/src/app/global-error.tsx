"use client";

import ErrorPage from "@/components/error/ErrorPage";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Catches unexpected client-side errors in the root component
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body className="h-full">
                <ErrorPage detail={error.message} />
            </body>
        </html>
    );
}