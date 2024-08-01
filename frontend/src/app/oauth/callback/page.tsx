'use client'

import { LitusOAuthCallback } from "@/components/login/LitusOAuthHelper";
import {Suspense} from "react";

export default function OAuthCallbackPage() {
    return (
        <Suspense>
            <LitusOAuthCallback />
        </Suspense>
    );
}