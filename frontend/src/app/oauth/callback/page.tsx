'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

const Callback = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        console.log("callback");

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const storedState = localStorage.getItem('oauth_state');
        const codeVerifier = localStorage.getItem('code_verifier');


        if (state !== storedState) {
            console.error('State mismatch: potential CSRF attack.');
            return;
        }

        if (code && codeVerifier) {
            console.log("code verified");
            axios.post(process.env.LITUS_OAUTH_TOKEN, {
                grant_type: 'authorization_code',
                code: code,
                client_id: process.env.LITUS_API_KEY,
                redirect_uri: process.env.REDIRECT_URL,
                code_verifier: codeVerifier,
            })
                .then(response => {
                    const { access_token } = response.data;
                    console.log("access_token: ", access_token);

                    return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/exchange-token`, { access_token });
                })
                .then(response => {
                    document.cookie = `jwt=${response.data.jwt}; path=/; HttpOnly; Secure`;

                    console.log("cookie: ", document.cookie);
                    router.push('/');
                })
                .catch(error => {
                    console.error('Error during token exchange:', error);
                });
        }
    }, [searchParams, router]);

    return null;
};

export default Callback;
