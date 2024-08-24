'use client'

import {LitusOAuthCallback} from "@/utils/oauth";
import React, {Suspense, useEffect, useRef, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import ErrorPage from "@/components/error/ErrorPage";

export default function OAuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasRun = useRef(false);
    const [error, setError] = useState<Error>(null);

    useEffect(() => {
        if (hasRun.current) return;  // Prevent running the effect multiple times
        hasRun.current = true;

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
        return <ErrorPage detail={error.message} />;
    }

    return (
        <Suspense>
        </Suspense>
    );
}