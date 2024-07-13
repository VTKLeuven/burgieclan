'use client';

import {useEffect, useRef} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import {NextResponse} from "next/server";

const Callback = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        // const state = searchParams.get('state');
        // const storedState = localStorage.getItem('oauth_state');
        //
        // if (state !== storedState) {
        //     console.error('State mismatch: potential CSRF attack.');
        //     return;
        // }

        const code = searchParams.get('code');
        const codeVerifier = localStorage.getItem('code_verifier');
        if (!codeVerifier) {
            console.error('Code verifier is missing.');
            return;
        }

        const exchangeTokenUrl = '/api/oauth/exchange-access-token';
        if (!exchangeTokenUrl) {
            throw new Error("Missing environment variables for OAuth flow");
        }

        if (code && codeVerifier) {

            axios.post(exchangeTokenUrl, {
                grant_type: 'authorization_code',
                code: code,
                client_id: process.env.NEXT_PUBLIC_LITUS_API_KEY,
                redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URL,
                code_verifier: codeVerifier,
            })
                .then(async (response) => {
                    const {access_token} = response.data;

                    return await axios.post(process.env.NEXT_PUBLIC_BACKEND_AUTH, {
                        accessToken: access_token
                    }, {
                        headers: {
                            'accept': 'application/ld+json',
                            'Content-Type': 'application/ld+json'
                        }
                    });
                })
                .then((response) => {
                    document.cookie = `jwt=${response.data.token}; path=/; HttpOnly; Secure`;
                    console.log("jwt: ", response.data.token);
                    router.push('/');
                })
                .catch((error: any) => {
                    console.error('Error during token exchange:', error);
                });
        }
    }, [searchParams, router]);

    return null;
};

export default Callback;
