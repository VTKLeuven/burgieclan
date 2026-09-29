import { Server } from '@hocuspocus/server';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { encodeStateAsUpdate } from 'yjs';
import type { Backend } from './backend.ts';
import { verifyCollabToken, type CollabIdentity } from './token.ts';

/**
 * The Yjs field the editor writes to. TipTap's Collaboration extension defaults to "default";
 * the frontend sets it explicitly so the two cannot drift apart silently.
 */
export const EDITOR_FIELD = 'default';

export interface ConnectionContext {
    identity: CollabIdentity;
}

export interface CollabServerOptions {
    port: number;
    secret: string;
    backend: Backend;
    debounce: number;
    maxDebounce: number;
    /** Hocuspocus installs SIGINT/SIGTERM handlers that store open documents before exiting. */
    stopOnSignals?: boolean;
    log?: Pick<Console, 'info' | 'warn' | 'error'>;
}

const CARET_COLOR = /^#[0-9a-f]{6}$/i;
const FALLBACK_CARET_COLOR = '#5c6b7a';

export function createCollabServer(options: CollabServerOptions): Server<ConnectionContext> {
    const log = options.log ?? console;

    return new Server<ConnectionContext>({
        name: 'burgieclan-collab',
        port: options.port,
        quiet: true,
        stopOnSignals: options.stopOnSignals ?? true,
        debounce: options.debounce,
        maxDebounce: options.maxDebounce,

        /**
         * Every connection brings a token from POST /api/collab/token. Symfony already decided
         * whether this user may open this document and whether they may edit it; we only check
         * that Symfony signed the token and that it was issued for this document.
         */
        async onAuthenticate({ token, documentName, connectionConfig }) {
            let identity: CollabIdentity;
            try {
                identity = await verifyCollabToken(token, options.secret);
            } catch (error) {
                log.warn(`Rejected connection to "${documentName}": ${(error as Error).message}`);
                throw error;
            }

            if (identity.document !== documentName) {
                log.warn(`Rejected connection to "${documentName}": token was issued for "${identity.document}"`);
                throw new Error('Token was issued for another document');
            }

            // Hocuspocus drops document updates from read-only connections; awareness (the
            // cursor) still goes through.
            connectionConfig.readOnly = identity.mode !== 'edit';

            return { identity } satisfies ConnectionContext;
        },

        /**
         * A throw here closes the connections instead of opening an empty document: the next
         * store would otherwise write that empty document over the real one.
         */
        async onLoadDocument({ documentName }) {
            try {
                return (await options.backend.load(documentName)) ?? undefined;
            } catch (error) {
                log.error(`Could not load "${documentName}":`, error);
                throw error;
            }
        },

        /**
         * Runs a moment after edits stop (debounce), at least every maxDebounce while they keep
         * coming, and when the last person leaves. Sends the Yjs state, which is the source of
         * truth, together with a TipTap JSON copy for rendering and search.
         */
        async onStoreDocument({ documentName, document }) {
            const state = encodeStateAsUpdate(document);
            const content: unknown = TiptapTransformer.fromYdoc(document, EDITOR_FIELD);

            try {
                await options.backend.store(documentName, state, content);
            } catch (error) {
                log.error(`Could not store "${documentName}":`, error);
                throw error;
            }
        },

        /**
         * The name on someone's cursor comes from their token, not from what their browser
         * claims, so nobody can type under someone else's name.
         */
        async beforeHandleAwareness({ context, states }) {
            if (!context) {
                return;
            }

            for (const state of states.values()) {
                if (state.user === undefined) {
                    continue;
                }
                const claimed = typeof state.user === 'object' && state.user !== null ? state.user : {};
                const color = typeof claimed.color === 'string' && CARET_COLOR.test(claimed.color)
                    ? claimed.color
                    : FALLBACK_CARET_COLOR;

                state.user = { name: context.identity.name, color };
            }
        },

        /**
         * Plain HTTP: a health check for Docker. Rejecting without an error stops Hocuspocus
         * from writing its default response after ours.
         */
        async onRequest({ request, response }) {
            const path = new URL(request.url ?? '/', 'http://collab').pathname;
            if (path === '/health' || path === '/collab/health') {
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ status: 'ok' }));

                return Promise.reject();
            }

            return undefined;
        },
    });
}
