import { captureException } from "@sentry/nextjs";

interface JWTPayload {
    id?: number;
    username?: string;
    fullName?: string
    roles?: string[];
    exp?: number;
    iat?: number;
}


function base64UrlDecode(base64Url: string): string {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

export function decodeJWT(token: string): JWTPayload | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) {
            throw new Error("Invalid JWT format");
        }
        const decodedPayload = base64UrlDecode(parts[1]);
        const parsedPayload = JSON.parse(decodedPayload);
        if (typeof (parsedPayload.exp) !== 'number') {
            throw new Error("Failed to parse JWT: Expiration time is missing.");
        }

        return parsedPayload;
    } catch (error) {
        captureException(
            error instanceof Error ? error : new Error(String(error)),
            { extra: { context: "Failed to decode JWT" } }
        );
        return null;
    }
}

export function getUserIdFromJWT(token: string): number | null {
    const payload = decodeJWT(token);
    if (!payload) return null;

    return payload.id ?? null;
}

/**
 * Roles the backend put in the token. These are the user's stored roles, not the hierarchy-expanded
 * set — an admin's token lists ROLE_ADMIN and never the ROLE_MODERATOR it implies — so anything
 * checking them has to spell out every role that qualifies. @see ADMIN_ROLES
 */
export function getUserRolesFromJWT(token: string): string[] {
    return decodeJWT(token)?.roles ?? [];
}

export function isJWTExpired(token: string): boolean {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;

    return Date.now() >= payload.exp * 1000;
}