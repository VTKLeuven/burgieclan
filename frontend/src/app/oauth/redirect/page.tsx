'use client'

import {useRouter} from "next/router";
import {useEffect} from "react";
import crypto from "crypto";

const Redirect = () => {

    const router = useRouter();

    const generateCodeVerifier = () => {
        return crypto.randomBytes(32).toString('base64url');
    };

    const generateCodeChallenge = (codeVerifier: string) => {
        return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    };

    useEffect(() => {

        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);

        localStorage.setItem('code_verifier', codeVerifier);

        const authorization = process.env.LITUS_OAUTH_AUTHORIZE;
        const clientId = process.env.LITUS_API_KEY;
        const redirectUri = process.env.REDIRECT_URL;
        const responseType = 'code';
        const state = crypto.randomBytes(16).toString('hex');
        const authUrl = `${authorization}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

        router.push(authUrl);
    }, [router]);

    return null;
}

export default Redirect;