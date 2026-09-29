import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { HEADER_SIGNATURE, HEADER_TIMESTAMP, signRequest } from './backend.ts';

/**
 * Routes Symfony calls on this server, for the changes it starts itself
 * (App\Service\Collab\CollabServerClient):
 *
 *   POST /internal/documents/{name}/restore      {"state": "<base64 Yjs update>"}
 *   POST /internal/documents/{name}/disconnect
 *
 * Requests are signed exactly like the ones this server sends to Symfony (backend.ts), and
 * checked like Symfony checks those (CollabRequestSignature): same secret, same clock skew.
 *
 * Only Symfony reaches these, over the internal Docker network. The public nginx proxies
 * /collab/... here, so these paths are not even reachable from outside; the signature is the
 * second lock.
 */

/** How far Symfony's clock may drift from ours, in seconds. Same as CollabRequestSignature::MAX_SKEW. */
export const MAX_SKEW_SECONDS = 300;

/** A restore carries a whole document; CollabDocumentController::MAX_STATE_BYTES is 5 MB, base64 adds a third. */
export const MAX_BODY_BYTES = 8 * 1024 * 1024;

const DOCUMENT_NAME = /^[a-z0-9][a-z0-9-]{0,99}$/;
const ROUTE = /^\/internal\/documents\/([^/]+)\/(restore|disconnect)$/;

export interface InternalActions {
    /** Replace the content of a live document with an earlier state. */
    restore(documentName: string, state: Uint8Array): Promise<void>;
    /** Close every connection to a document so clients reconnect with a fresh token. */
    disconnect(documentName: string): Promise<void>;
}

export function isValidSignature(
    secret: string,
    method: string,
    path: string,
    headers: IncomingMessage['headers'],
    body: string,
    now = Date.now(),
): boolean {
    const signature = headers[HEADER_SIGNATURE.toLowerCase()];
    const timestamp = headers[HEADER_TIMESTAMP.toLowerCase()];

    if (typeof signature !== 'string' || typeof timestamp !== 'string' || !/^\d{1,12}$/.test(timestamp)) {
        return false;
    }
    if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > MAX_SKEW_SECONDS) {
        return false;
    }

    const expected = Buffer.from(signRequest(secret, method, path, Number(timestamp), body));
    const given = Buffer.from(signature);

    return expected.length === given.length && timingSafeEqual(expected, given);
}

class BodyTooLargeError extends Error {}

async function readBody(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
        size += (chunk as Buffer).length;
        if (size > MAX_BODY_BYTES) {
            throw new BodyTooLargeError();
        }
        chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks).toString('utf8');
}

function reply(response: ServerResponse, status: number, detail?: string): void {
    if (detail === undefined) {
        response.writeHead(status).end();
        return;
    }
    response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify({ detail }));
}

/**
 * Answers the request if it is one of the internal routes. Returns false for anything else, so
 * the caller can let Hocuspocus handle it.
 */
export async function handleInternalRequest(
    request: IncomingMessage,
    response: ServerResponse,
    secret: string,
    actions: InternalActions,
    log: Pick<Console, 'warn' | 'error'>,
): Promise<boolean> {
    const path = new URL(request.url ?? '/', 'http://collab').pathname;
    if (!path.startsWith('/internal/')) {
        return false;
    }

    const match = ROUTE.exec(path);
    if (!match || request.method !== 'POST') {
        reply(response, 404);
        return true;
    }

    let body: string;
    try {
        body = await readBody(request);
    } catch (error) {
        reply(response, error instanceof BodyTooLargeError ? 413 : 400);
        return true;
    }

    if (!isValidSignature(secret, 'POST', path, request.headers, body)) {
        log.warn(`Rejected unsigned or badly signed request to ${path}`);
        reply(response, 401);
        return true;
    }

    const documentName = decodeURIComponent(match[1] ?? '');
    if (!DOCUMENT_NAME.test(documentName)) {
        reply(response, 404);
        return true;
    }

    try {
        if (match[2] === 'disconnect') {
            await actions.disconnect(documentName);
            reply(response, 204);
            return true;
        }

        let payload: unknown;
        try {
            payload = JSON.parse(body);
        } catch {
            payload = null;
        }
        const state = typeof payload === 'object' && payload !== null && 'state' in payload ? payload.state : null;
        if (typeof state !== 'string' || state === '') {
            reply(response, 400, 'Expected {"state": "<base64 Yjs update>"}.');
            return true;
        }

        await actions.restore(documentName, new Uint8Array(Buffer.from(state, 'base64')));
        reply(response, 204);
    } catch (error) {
        log.error(`Internal request ${path} failed:`, error);
        reply(response, 500, 'The document could not be changed.');
    }

    return true;
}
