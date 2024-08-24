'use client'

import {LitusOAuthCallback} from "@/utils/oauth";
import {Suspense, useEffect, useRef} from "react";
import {useRouter, useSearchParams} from "next/navigation";

export default function OAuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;
        LitusOAuthCallback(router, searchParams);
    });

    return (
        <Suspense>
        </Suspense>
    );
}