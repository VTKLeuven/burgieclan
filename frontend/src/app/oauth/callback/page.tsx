'use client'

import {LitusOAuthCallback} from "@/utils/oauth";
import {Suspense} from "react";
import LoadingPage from "@/components/common/LoadingPage";

export default function OAuthCallbackPage() {
    return (
        <>
            <LoadingPage />

            <Suspense>
                {/* Wrap useSearchParams() from LitusOAuthCallback in Suspense:
                https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout */}
                <LitusOAuthCallback />
            </Suspense>
        </>
    );
}