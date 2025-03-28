'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storeOAuthTokens } from "@/actions/oauth";
import ErrorPage from "@/components/error/ErrorPage";
import type { ErrorResponse } from "@/types/error";

/**
 * Component allows for manually storing jwt as a http-only cookie. Can be used later to authenticate requests to the backend.
 */
export default function Page({ params: { jwt } }: { params: { jwt: string } }) {
    const router = useRouter();
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        (async () => {
            try {
                // Put JWT in Http-only cookie for session management
                await storeOAuthTokens(jwt);
                router.push('/');
            } catch (error) {
                setError(error);
            }
        })();
    }, [jwt, router]);

    const errorResponse: ErrorResponse = {
        status: 500,
        generalMessage: 'Unexpected Error.',
        detailedMessage: error?.message || '',
        stackTrace: error?.stack || '',
    };
    if (error) {
        return <ErrorPage error={errorResponse}/>;
    }
}