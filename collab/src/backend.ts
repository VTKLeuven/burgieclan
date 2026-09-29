import { createHmac } from 'node:crypto';

/**
 * Talks to the internal collab routes in Symfony
 * (App\Controller\Internal\CollabDocumentController).
 *
 * Every request is signed: HMAC-SHA256 over "METHOD\nPATH\nTIMESTAMP\nBODY" with the shared
 * secret, checked by App\Service\Collab\CollabRequestSignature. Change both sides together.
 */
export const HEADER_SIGNATURE = 'X-Collab-Signature';
export const HEADER_TIMESTAMP = 'X-Collab-Timestamp';

export function signRequest(secret: string, method: string, path: string, timestamp: number, body: string): string {
    const digest = createHmac('sha256', secret)
        .update(`${method.toUpperCase()}\n${path}\n${timestamp}\n${body}`)
        .digest('hex');

    return `sha256=${digest}`;
}

export class BackendError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'BackendError';
        this.status = status;
    }
}

export interface Backend {
    /** The stored Yjs state, or null when the document has never been stored. */
    load(documentName: string): Promise<Uint8Array | null>;
    store(documentName: string, state: Uint8Array, content: unknown): Promise<void>;
}

export interface BackendOptions {
    baseUrl: string;
    secret: string;
    /** Attempts per store before giving up. Loads are never retried: a failed load must fail loudly. */
    storeAttempts?: number;
    /** Delay before the first retry; doubles after each attempt (ms). */
    retryDelay?: number;
    fetch?: typeof fetch;
}

export function createBackend(options: BackendOptions): Backend {
    const doFetch = options.fetch ?? fetch;
    const storeAttempts = options.storeAttempts ?? 3;
    const retryDelay = options.retryDelay ?? 1000;

    const documentPath = (documentName: string) =>
        `/internal/collab/documents/${encodeURIComponent(documentName)}`;

    const signedFetch = (method: 'GET' | 'PUT', path: string, body = ''): Promise<Response> => {
        const timestamp = Math.floor(Date.now() / 1000);
        const headers: Record<string, string> = {
            [HEADER_TIMESTAMP]: String(timestamp),
            [HEADER_SIGNATURE]: signRequest(options.secret, method, path, timestamp, body),
        };
        if (method === 'PUT') {
            headers['Content-Type'] = 'application/json';
        }

        return doFetch(options.baseUrl + path, {
            method,
            headers,
            body: method === 'PUT' ? body : undefined,
            signal: AbortSignal.timeout(10_000),
        });
    };

    return {
        async load(documentName) {
            const response = await signedFetch('GET', documentPath(documentName));

            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                // Throwing makes Hocuspocus refuse the connection instead of opening an empty
                // document, which the next store would then write over the real one.
                throw new BackendError(`Loading "${documentName}" failed with HTTP ${response.status}`, response.status);
            }

            return new Uint8Array(await response.arrayBuffer());
        },

        async store(documentName, state, content) {
            const body = JSON.stringify({ state: Buffer.from(state).toString('base64'), content });

            for (let attempt = 1; ; attempt++) {
                try {
                    const response = await signedFetch('PUT', documentPath(documentName), body);
                    if (response.ok) {
                        return;
                    }
                    // A 4xx will not get better by retrying.
                    if (response.status < 500 || attempt >= storeAttempts) {
                        throw new BackendError(`Storing "${documentName}" failed with HTTP ${response.status}`, response.status);
                    }
                } catch (error) {
                    if (error instanceof BackendError || attempt >= storeAttempts) {
                        throw error;
                    }
                }

                await new Promise((resolve) => setTimeout(resolve, retryDelay * 2 ** (attempt - 1)));
            }
        },
    };
}
