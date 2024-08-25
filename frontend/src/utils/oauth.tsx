import crypto from "crypto";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ReadonlyURLSearchParams } from "next/navigation";import axios from "axios";

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
 * Exchange PCKE code and code verifier for access and refresh tokens from Litus authorization server
 */
const requestLitusTokens = async (code: string, codeVerifier: string) => {
    const frontendApiUri = process.env.NEXT_PUBLIC_FRONTEND_API_URL;
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL

    if (!frontendApiUri || !clientId || !frontendUri) {
        throw Error("Error during authorization code exchange: missing environment variables for OAuth flow");
    }

    const redirectUri = frontendUri + "/oauth/callback"
    const tokenProxyUri = frontendApiUri + "/api/frontend/oauth/litus-token-proxy"

    // Request access and refresh tokens from Litus via proxy endpoint
    const response = await axios.post(tokenProxyUri, {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
    });

    return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token
    };
};

/**
 * Exchange refresh token for new access and refresh tokens from Litus authorization server
 */
const refreshLitusTokens = async (refreshToken: string) => {
    const frontendApiUri = process.env.NEXT_PUBLIC_FRONTEND_API_URL;
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL

    if (!frontendApiUri || !clientId || !frontendUri) {
        throw Error("Error during authorization code exchange: missing environment variables for OAuth flow");
    }

    const redirectUri = frontendUri + "/oauth/callback"
    const tokenProxyUri = frontendApiUri + "/api/frontend/oauth/litus-token-proxy"

    const response = await axios.post(tokenProxyUri, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        redirect_uri: redirectUri,
    });

    return {
        newAccessToken: response.data.access_token,
        newRefreshToken: response.data.refresh_token
    };
}

/**
 * Exchange Litus access token for JWT from backend
 */
const requestJWT = async (accessToken: string) => {
    const backendAuthUrl = process.env.NEXT_PUBLIC_BURGIECLAN_BACKEND_AUTH;

    if (!backendAuthUrl) {
        throw Error("Error during JWT exchange: missing environment variables for OAuth flow");
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

/**
 * Decode and parse JWT
 */
const parseJWT = (jwt: string) : string => {
    const base64Url = jwt.split('.')[1];
    const base64Str = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64Str);

    return JSON.parse(jsonPayload);
};

/**
 * Returns the expiration time of a JWT as Unix timestamp
 */
export const getJWTExpiration = (jwt: string) : number => {
    const parsedJWT = parseJWT(jwt);
    return parsedJWT?.exp;
}

/**
 * Store JWT and Litus refresh token in Http-only cookies for session management
 */
export const storeOAuthTokens = async (jwt: string, refreshToken?: string) => {
    const frontendApiUrl = process.env.NEXT_PUBLIC_FRONTEND_API_URL

    if (!frontendApiUrl) {
        throw Error("Error during setting JWT cookie: missing environment variables for OAuth flow");
    }

    const setOAuthCookiesUrl = frontendApiUrl + "/api/frontend/oauth/set-oauth-cookies"

    // Store cookies via server-side API endpoint because client-side can't set Http-only cookies
    await axios.post(setOAuthCookiesUrl, { jwt, refreshToken });
}

/**
 * Redirects the user to Litus where he should authenticate himself, after which the Litus authentication server
 * redirects back to the callback url
 */
export const initiateLitusOAuthFlow = (router: AppRouterInstance, redirectTo : string) => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store for later verification of received code
    sessionStorage.setItem('code_verifier', codeVerifier);

    const randomState = crypto.randomBytes(16).toString('hex');
    const state = JSON.stringify({
        state: randomState,
        redirectTo: redirectTo,
    })

    // Store for later verification of received state
    sessionStorage.setItem('state', state);

    const authorizationUri = process.env.NEXT_PUBLIC_LITUS_OAUTH_AUTHORIZE;
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL

    if (!authorizationUri || !clientId || !frontendUri) {
        throw Error("Error during Litus authorization redirect: missing environment variables for OAuth flow");
    }

    const redirectUri = frontendUri + "/oauth/callback"

    const params = new URLSearchParams({
        scope: 'openid profile email',
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: encodeURIComponent(state),
    });
    const authUrl = `${authorizationUri}?${params.toString()}`;

    router.push(authUrl);
}

/**
 * Provides functionality for callback url, where the Litus authentication server redirects to after successful user
 * login. Retrieves access token and JWT and sets it as cookie for future requests.
 */
export const LitusOAuthCallback = async (router : AppRouterInstance, searchParams : ReadonlyURLSearchParams): null => {
    const code = searchParams.get('code');
    const codeVerifier = sessionStorage.getItem('code_verifier');

    if (!codeVerifier) {
        throw Error('Code verifier is missing.');
    }

    const encodedState = searchParams.get('state');
    const state = encodedState ? decodeURIComponent(encodedState) : null;
    const storedState = sessionStorage.getItem('state');

    if (state !== storedState) {
        throw Error('State mismatch: potential CSRF attack.');
    }

    if (code && codeVerifier) {
        try {
            const {accessToken, refreshToken} = await requestLitusTokens(code, codeVerifier);
            const jwt = await requestJWT(accessToken);
            await storeOAuthTokens(jwt, refreshToken);

            // Redirect to the redirect URL from the state parameter
            const parsedState = JSON.parse(storedState);
            const redirectTo = (parsedState && parsedState.redirectTo) ? parsedState.redirectTo : '/';
            router.push(redirectTo);
        } catch (error) {
            throw Error(error.message);
        }
    }
};

/**
 * Refreshes JWT by exchanging the old Litus refresh token for new Litus access and refresh tokens and then exchanging
 * the new access token for a new JWT from the backend.
 * */
export const LitusOAuthRefresh = async (oldRefreshToken: string): Promise<{ newJwt: string; newRefreshToken: string }> => {
    try {
        const { newAccessToken, newRefreshToken } = await refreshLitusTokens(oldRefreshToken);
        const newJwt = await requestJWT(newAccessToken);

        return { newJwt, newRefreshToken };
    } catch (error) {
        throw Error(error.message);
    }
};
