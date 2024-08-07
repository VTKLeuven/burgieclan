'use client'

import {LitusOAuthCallback} from "@/utils/oauth";
import {Suspense} from "react";

export default function OAuthCallbackPage() {
    return (
        <Suspense>
            <LitusOAuthCallback />
        </Suspense>
    );
}