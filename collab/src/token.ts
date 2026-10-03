import { jwtVerify } from 'jose';

/**
 * Must match App\Service\Collab\CollabTokenIssuer in the backend.
 */
export const TOKEN_ISSUER = 'burgieclan-backend';
export const TOKEN_AUDIENCE = 'burgieclan-collab';

export type CollabMode = 'edit' | 'view';

export interface CollabIdentity {
    /** Burgieclan user id. */
    userId: string;
    /** The one document this token opens. */
    document: string;
    mode: CollabMode;
    /** Name shown on this user's cursor. */
    name: string;
    /**
     * For an edit token on a document that locks: when it locks, in seconds since the epoch.
     * A connection opened before then turns read-only once it passes (see server.ts).
     */
    editableUntil?: number;
}

/**
 * Checks a collab token issued by Symfony and returns who it belongs to.
 *
 * Symfony has already decided whether this user may open the document and whether they may edit
 * it; the token carries that decision. All we check is that Symfony signed it and that it has not
 * expired. Throws when anything is off.
 */
export async function verifyCollabToken(token: string, secret: string): Promise<CollabIdentity> {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ['HS256'],
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        requiredClaims: ['sub', 'exp', 'doc', 'mode', 'name'],
    });

    const { sub, doc, mode, name, until } = payload;
    if (typeof sub !== 'string' || typeof doc !== 'string' || typeof name !== 'string') {
        throw new Error('Collab token has malformed claims');
    }
    if (mode !== 'edit' && mode !== 'view') {
        throw new Error('Collab token has an unknown mode');
    }
    if (until !== undefined && typeof until !== 'number') {
        throw new Error('Collab token has a malformed "until" claim');
    }

    return { userId: sub, document: doc, mode, name, ...(until === undefined ? {} : { editableUntil: until }) };
}
