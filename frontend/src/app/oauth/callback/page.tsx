'use client'

import {LitusOAuthCallback} from "@/utils/oauth";
import {Suspense} from "react";
import Loading from "@/app/loading";

export default function OAuthCallbackPage() {
    // Wrap useSearchParams() from LitusOAuthCallback in Suspense:
    // https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
    return (
        <Suspense fallback={ <Loading /> }>
            <LitusOAuthCallback />
        </Suspense>
    );
}