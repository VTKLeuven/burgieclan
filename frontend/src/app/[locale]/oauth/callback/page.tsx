'use client'

import { LitusOAuthCallback } from "@/utils/oauth";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ErrorPage from "@/components/error/ErrorPage";
import Loading from "@/app/[locale]/loading";
import type { ErrorResponse } from "@/types/error";

export default function OAuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        (async () => {
            try {
                if (!searchParams.has('code')) {
                    throw new Error('Code is missing in search params');
                }
                if (!searchParams.has('state')) {
                    throw new Error('State is missing in search params');
                }

                await LitusOAuthCallback(router, searchParams);
            } catch (err: any) {
                setError(err);
            }
        })();
    }, [router, searchParams]);

    if (error) {
        const errorResponse: ErrorResponse = {
            status: 500,
            generalMessage: 'Unexpected Error.',
            detailedMessage: error.message,
            stackTrace: error.stack || '',
        };
        return <ErrorPage error={errorResponse} />;
    }

    return (
        <Loading />
    );
}