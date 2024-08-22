'use client'

import React, {createContext, useContext, useState, useEffect, ReactNode, useRef} from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import crypto from "crypto";

interface AuthContextType {
    initiateLitusOAuthFlow: () => void;
    handleOAuthCallback: (code: string, state: string) => Promise<void>;
    user: any; // You can type this better if you have a specific user object structure
}

// Create AuthContext
const AuthContext = createContext<AuthContextType | null>(null);

// Create the AuthProvider component that will wrap the app
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const callbackHasRun = useRef(false);
    /**
     * Expiration of JWT (Unix epoch)
     */
    const [tokenExpiration, setTokenExpiration] = useRef(null);

    /**
     * Encode binary buffer to base64url
     */
    function base64URLEncode(buffer : crypto.BinaryLike) {
        // @ts-ignore
        return buffer.toString("base64")
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Hash binary buffer with SHA256
     */
    function sha256(buffer: crypto.BinaryLike) {
        return crypto.createHash('sha256').update(buffer).digest();
    }

    /**
     * Generate unguessable code verifier (following PCKE for OAuth, see RFC7636)
     */
    const generateCodeVerifier = () => {
        return base64URLEncode(crypto.randomBytes(32));
    };

    /**
     * Generate code challenge which is to be verified later (following PCKE for OAuth, see RFC7636)
     */
    const generateCodeChallenge = (codeVerifier: string) => {
        return base64URLEncode(sha256(codeVerifier));
    };

    /**
     * Redirects the user to Litus where he should authenticate himself, after which the Litus authentication server
     * redirects back to the callback url
     */
    const initiateLitusOAuthFlow = () => {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);

        sessionStorage.setItem('code_verifier', codeVerifier);

        const state = crypto.randomBytes(16).toString('hex');
        sessionStorage.setItem('state', state);

        const authorizationUri = process.env.NEXT_PUBLIC_LITUS_OAUTH_AUTHORIZE;
        const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
        const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL;

        const redirectUri = `${frontendUri}/oauth/callback`;

        const params = new URLSearchParams({
            scope: "openid profile email",
            response_type: "code",
            client_id: clientId,
            redirect_uri: redirectUri,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            state: state,
        });

        const authUrl = `${authorizationUri}?${params.toString()}`;
        router.push(authUrl);
    };

    /**
     * Request authorization code and provide PCKE code and code verifier to authentication server
     */
    const retrieveLitusTokens = async (code: string, codeVerifier: string) : Promise<{ access_token: string; refresh_token: string; }> => {
        // Proxy access-token retrieval through backend to avoid CORS issues
        const frontendApiUri = process.env.NEXT_PUBLIC_FRONTEND_API_URL;
        const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
        const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL

        if (!frontendApiUri || !clientId || !frontendUri) {
            throw new Error("Error during authorization code exchange: missing environment variables for OAuth flow");
        }

        const redirectUri = frontendUri + "/oauth/callback"
        const tokenProxyUri = frontendApiUri + "/api/frontend/oauth/exchange-access-token"

        const response = await axios.post(tokenProxyUri, {
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        });

        if (!response.data.access_token || !response.data.refresh_token) {
            throw new Error("Invalid response from token exchange endpoint: token missing");
        }

        return {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token
        };
    };

    /**
     * Retrieve JWT from access token via backend endpoint
     */
    const retrieveJWT = async (accessToken: string) => {
        const backendAuthUrl = process.env.NEXT_PUBLIC_BURGIECLAN_BACKEND_AUTH;

        if (!backendAuthUrl) {
            throw new Error("Error during JWT exchange: missing environment variables for OAuth flow");
        }

        const response = await axios.post(backendAuthUrl, {
            accessToken: accessToken
        }, {
            headers: {
                'accept': 'application/ld+json',
                'Content-Type': 'application/ld+json'
            }
        });

        return response.data.token;
    };



    const refreshJWT = (refreshToken: string) => {
        console.log("refreshing JWT");
    };

    /**
     * Provides functionality for callback url, where the Litus authentication server redirects to after successful user
     * login. Retrieves access token and JWT and sets it as cookie for future requests.
     */
    const handleOAuthCallback = async (code, state) => {
        if (callbackHasRun.current) return;
        callbackHasRun.current = true;

        const codeVerifier = sessionStorage.getItem("code_verifier");
        const storedState = sessionStorage.getItem("state");

        if (state !== storedState) {
            console.error("State mismatch: potential CSRF attack.");
            return;
        }

        try {
            const { access_token, refresh_token } = await retrieveLitusTokens(code, codeVerifier);
            const jwt = await retrieveJWT(access_token);

            const frontendApiUrl = process.env.NEXT_PUBLIC_FRONTEND_API_URL;
            const setJWTCookieUrl = `${frontendApiUrl}/api/frontend/oauth/set-jwt-cookie`;

            // Set JWT as Http-only cookie
            await axios.post(setJWTCookieUrl, { jwt });


            router.push("/");
        } catch (error) {
            console.error("Error during token exchange:", error);
        }
    };

    // Make these values available to the whole app
    const value = {
        initiateLitusOAuthFlow,
        handleOAuthCallback,
        user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use AuthContext
export const useAuth = () => {
    return useContext(AuthContext);
};