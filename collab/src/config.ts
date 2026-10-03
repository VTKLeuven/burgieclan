export interface CollabConfig {
    /** Port the websocket and health endpoint listen on. */
    port: number;
    /** Base URL of the Symfony backend, reached server to server (e.g. http://backend:8000). */
    backendUrl: string;
    /** Shared with Symfony: verifies collab tokens and signs load/store calls. */
    secret: string;
    /** Wait this long after the last edit before storing (ms). */
    debounce: number;
    /** Store at least this often while edits keep coming in (ms). */
    maxDebounce: number;
}

/** HS256 needs a key of at least 256 bits; Symfony enforces the same minimum. */
export const MIN_SECRET_BYTES = 32;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CollabConfig {
    const secret = env.COLLAB_SECRET ?? '';
    if (Buffer.byteLength(secret) < MIN_SECRET_BYTES) {
        throw new Error(`COLLAB_SECRET must be at least ${MIN_SECRET_BYTES} bytes (generate one with: openssl rand -hex 32)`);
    }

    const backendUrl = env.BACKEND_URL;
    if (!backendUrl) {
        throw new Error('BACKEND_URL is required, e.g. http://backend:8000');
    }

    return {
        port: Number(env.PORT ?? 1234),
        backendUrl: backendUrl.replace(/\/+$/, ''),
        secret,
        debounce: Number(env.STORE_DEBOUNCE_MS ?? 2000),
        maxDebounce: Number(env.STORE_MAX_DEBOUNCE_MS ?? 10000),
    };
}
