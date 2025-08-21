interface JWTPayload {
    id?: number;
    username?: string;
    fullName?: string
    roles?: string[];
    exp?: number;
    iat?: number;
}


export function decodeJWT(token: string): JWTPayload | null {
    try {
        const base64Url = token.split('.')[1];
        const base64Str = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = atob(base64Str);
        const parsedPayload = JSON.parse(decodedPayload);
        if (typeof (parsedPayload.exp) !== 'number') {
            throw new Error("Failed to parse JWT: Expiration time is missing.");
        }

        return parsedPayload;
    } catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
}

export function getUserIdFromJWT(token: string): number | null {
    const payload = decodeJWT(token);
    if (!payload) return null;

    return payload.id ?? null;
}

export function isJWTExpired(token: string): boolean {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;

    return Date.now() >= payload.exp * 1000;
}