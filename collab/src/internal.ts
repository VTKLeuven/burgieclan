import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { HEADER_SIGNATURE, HEADER_TIMESTAMP, signRequest } from './backend.ts';

/**
 * Routes Symfony calls on this server, for the changes it starts itself
 * (App\Service\Collab\CollabServerClient):
 *
 *   POST /internal/documents/{name}/restore      {"state": "<base64 Yjs update>"}
 *   POST /internal/documents/{name}/disconnect
 *   POST /internal/documents/{name}/broadcast    {...}, any small JSON object
 *   POST /internal/documents/{name}/copy         {"state": "<base64 Yjs update>"}
 *        → 200 {"state": "<base64>", "content": {...}, "fields": {...}}: a new document {name}
 *          built from that state without the exam days (freshCopy), for Symfony to store.
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

/** A broadcast is a notification, like {"type": "question-activity", "uid": "…"}, never content. */
export const MAX_BROADCAST_BYTES = 4096;

const DOCUMENT_NAME = /^[a-z0-9][a-z0-9-]{0,99}$/;
const ROUTE = /^\/internal\/documents\/([^/]+)\/(restore|disconnect|broadcast|copy)$/;
const BASE64_STATE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export interface InternalActions {
    /** Replace the content of a live document with an earlier state. */
    restore(documentName: string, state: Uint8Array): Promise<void>;
    /** Close every connection to a document so clients reconnect with a fresh token. */
    disconnect(documentName: string): Promise<void>;
    /**
     * Send `message` (JSON text) as a stateless message to everyone who has the document open.
     * Does nothing when nobody does; never loads a document just for this.
     */
    broadcast(documentName: string, message: string): void;
    /** Build a new document from `state`, for a reconstruction that starts as a copy. */
    copy(state: Uint8Array): { state: Uint8Array; content: unknown; fields: Record<string, unknown> };
}

function hasFreshSignatureHeaders(headers: IncomingMessage['headers'], now = Date.now()): boolean {
    const signature = headers[HEADER_SIGNATURE.toLowerCase()];
    const timestamp = headers[HEADER_TIMESTAMP.toLowerCase()];

    if (typeof signature !== 'string' || typeof timestamp !== 'string' || !/^\d{1,12}$/.test(timestamp)) {
        return false;
    }

    return Math.abs(Math.floor(now / 1000) - Number(timestamp)) <= MAX_SKEW_SECONDS;
}

export function isValidSignature(
    secret: string,
    method: string,
    path: string,
    headers: IncomingMessage['headers'],
    body: string,
    now = Date.now(),
): boolean {
    if (!hasFreshSignatureHeaders(headers, now)) {
        return false;
    }

    const signature = headers[HEADER_SIGNATURE.toLowerCase()] as string;
    const timestamp = headers[HEADER_TIMESTAMP.toLowerCase()] as string;
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
            request.destroy();
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

    if (!hasFreshSignatureHeaders(request.headers)) {
        log.warn(`Rejected unsigned or badly signed request to ${path}`);
        reply(response, 401);
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

    let documentName = '';
    try {
        documentName = decodeURIComponent(match[1] ?? '');
    } catch {
        reply(response, 404);
        return true;
    }
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

        if (match[2] === 'broadcast' && Buffer.byteLength(body, 'utf8') > MAX_BROADCAST_BYTES) {
            reply(response, 400, `Expected a JSON object of at most ${MAX_BROADCAST_BYTES} bytes.`);
            return true;
        }

        let payload: unknown;
        try {
            payload = JSON.parse(body);
        } catch {
            payload = null;
        }

        if (match[2] === 'broadcast') {
            if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
                reply(response, 400, `Expected a JSON object of at most ${MAX_BROADCAST_BYTES} bytes.`);
                return true;
            }
            actions.broadcast(documentName, JSON.stringify(payload));
            reply(response, 204);
            return true;
        }
        const state = typeof payload === 'object' && payload !== null && 'state' in payload ? payload.state : null;
        if (typeof state !== 'string' || state === '' || !BASE64_STATE.test(state)) {
            reply(response, 400, 'Expected {"state": "<base64 Yjs update>"}.');
            return true;
        }

        const decoded = new Uint8Array(Buffer.from(state, 'base64'));
        if (match[2] === 'copy') {
            const copy = actions.copy(decoded);
            response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
                state: Buffer.from(copy.state).toString('base64'),
                content: copy.content,
                fields: copy.fields,
            }));
            return true;
        }

        await actions.restore(documentName, decoded);
        reply(response, 204);
    } catch (error) {
        log.error(`Internal request ${path} failed:`, error);
        reply(response, 500, 'The document could not be changed.');
    }

    return true;
}
