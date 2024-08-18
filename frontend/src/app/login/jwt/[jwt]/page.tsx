'use client'

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {SetJWTAsCookie} from "@/utils/oauth";

/**
 * Component allows for manually storing jwt as a http-only cookie. Can be used later to authenticate requests to the backend.
 */
export default function Page({ params }: { params: any }) {
    const router = useRouter();
    const { jwt } = params;

    useEffect(() => {
        (async () => {
            try {
                await SetJWTAsCookie(jwt);

                router.push('/');
            } catch (error) {
                console.error('Error during token exchange:', error);
            }
        })();
    })
}