import crypto from "crypto";
import React, {useEffect} from "react";
import Image from "next/image";
import {useRouter} from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

function base64URLEncode(buffer : crypto.BinaryLike) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function sha256(buffer: crypto.BinaryLike) {
    return crypto.createHash('sha256').update(buffer).digest();
}

const generateCodeVerifier = () => {
    return base64URLEncode(crypto.randomBytes(32));
};

const generateCodeChallenge = (codeVerifier: string) => {
    return base64URLEncode(sha256(codeVerifier));
};

const initiateOAuthFlow = (router: AppRouterInstance) => {

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    localStorage.setItem('code_verifier', codeVerifier);

    const authorization = process.env.NEXT_PUBLIC_LITUS_OAUTH_AUTHORIZE;
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URL;
    const state = crypto.randomBytes(16).toString('hex');

    if (!authorization || !clientId || !redirectUri) {
        throw new Error("Missing environment variables for OAuth flow");
    }

    const params = new URLSearchParams({
        scope: 'openid profile email',
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });
    const authUrl = `${authorization}?${params.toString()}`;

    router.push(authUrl);
}

const LitusOAuthButton = () => {
    const router = useRouter();

    const handleLoginClick = (event: { preventDefault: () => void; }) => {
        event.preventDefault();
        initiateOAuthFlow(router);
    };

    return (
        <div className="mt-10 w-full max-w-sm">
            <button
                type="submit"
                onClick={handleLoginClick}
                className="flex flex-row w-full justify-center items-center rounded-md border-0 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-300 font-semibold leading-6 text-black shadow-sm hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-vtk-blue-400"
            >
                <Image
                    src="/images/logos/vtk-logo-blue.png"
                    alt="VTK Logo"
                    width={50}
                    height={25}
                    className="p-2 pb-3"
                />
                <p className="inline p-2 text-vtk-blue-500">Log in with VTK</p>
            </button>
        </div>
    )
}

export default LitusOAuthButton;