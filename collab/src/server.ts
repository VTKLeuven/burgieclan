import { Server, type Hocuspocus } from '@hocuspocus/server';
import { TiptapTransformer } from '@hocuspocus/transformer';
import * as Y from 'yjs';
import type { Backend } from './backend.ts';
import { handleInternalRequest } from './internal.ts';
import { verifyCollabToken, type CollabIdentity } from './token.ts';

/**
 * The Yjs field the editor writes to. TipTap's Collaboration extension defaults to "default";
 * the frontend sets it explicitly so the two cannot drift apart silently.
 */
export const EDITOR_FIELD = 'default';

/**
 * Top-level Y.Arrays that live next to the editor content and belong to the document just as
 * much: they are sent along as JSON on every store and rolled back together with the content.
 * "sittings" holds the days an exam was given on (frontend: components/exam).
 *
 * This server has no editor schema and needs none: it copies these, and the editor field, as
 * plain Yjs structures.
 */
export const JSON_FIELDS = ['sittings'] as const;

/**
 * Close code for a websocket whose access changed, e.g. because its document locked while it
 * was open. The browser reconnects by itself and asks Symfony for a new token.
 */
export const CLOSE_ACCESS_CHANGED = { code: 4000, reason: 'Access changed, reconnect' };

/**
 * Closes the websockets of everyone who has the document open. Closing only their document
 * connection is not enough: the provider then waits, unauthenticated, instead of asking for a
 * new token. A closed socket makes it reconnect and start over.
 */
export function reconnectEveryone(hocuspocus: Hocuspocus, documentName: string): void {
    for (const connection of hocuspocus.documents.get(documentName)?.getConnections() ?? []) {
        connection.webSocket.close(CLOSE_ACCESS_CHANGED.code, CLOSE_ACCESS_CHANGED.reason);
    }
}

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
    /** Current time in ms; tests move it forward. */
    now?: () => number;
}

const CARET_COLOR = /^#[0-9a-f]{6}$/i;
const FALLBACK_CARET_COLOR = '#5c6b7a';

/** The editor content and the JSON fields as the JSON copy Symfony keeps next to the state. */
export function jsonCopy(document: Y.Doc): { content: unknown; fields: Record<string, unknown> } {
    const fields: Record<string, unknown> = {};
    for (const field of JSON_FIELDS) {
        fields[field] = document.getArray(field).toJSON();
    }

    return { content: TiptapTransformer.fromYdoc(document, EDITOR_FIELD), fields };
}

function cloneValue(value: unknown): unknown {
    return value instanceof Y.AbstractType ? value.clone() : value;
}

/**
 * Makes a live document look like `state` again, as one normal edit, so everyone who has it open
 * sees the change and it is stored like any other.
 *
 * Replacing the content with clones keeps it a plain edit on top of the current document:
 * applying the old Yjs update itself would do nothing, because the live document already
 * contains everything in it.
 */
export async function restoreDocument(hocuspocus: Hocuspocus, documentName: string, state: Uint8Array): Promise<void> {
    // Decode first: a broken update must fail before the live document is touched.
    const snapshot = new Y.Doc();
    try {
        Y.applyUpdate(snapshot, state);

        const connection = await hocuspocus.openDirectConnection(documentName, {});
        try {
            await connection.transact((document) => {
                const content = document.getXmlFragment(EDITOR_FIELD);
                content.delete(0, content.length);
                content.insert(0, snapshot.getXmlFragment(EDITOR_FIELD).toArray()
                    // The editor never writes hooks; they could not be shown anyway.
                    .filter((node): node is Y.XmlElement | Y.XmlText => !(node instanceof Y.XmlHook))
                    .map((node) => node.clone()));

                for (const field of JSON_FIELDS) {
                    const items = document.getArray(field);
                    items.delete(0, items.length);
                    items.insert(0, snapshot.getArray(field).toArray().map(cloneValue));
                }
            });
        } finally {
            await connection.disconnect();
        }
    } finally {
        snapshot.destroy();
    }
}

export function createCollabServer(options: CollabServerOptions): Server<ConnectionContext> {
    const log = options.log ?? console;
    const now = options.now ?? Date.now;

    /** Per document: ids of the users who changed it since the last store. */
    const contributors = new Map<string, Set<string>>();

    const isPastLock = (identity: CollabIdentity): boolean =>
        identity.editableUntil !== undefined && now() / 1000 >= identity.editableUntil;

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
            connectionConfig.readOnly = identity.mode !== 'edit' || isPastLock(identity);

            return { identity } satisfies ConnectionContext;
        },

        /**
         * A connection opened before its document locked must not keep editing after. The token
         * says when the lock is; from then on its changes are dropped and it is closed, so the
         * browser reconnects and gets a read-only token. (When a moderator locks early, Symfony
         * asks us to close the connections instead, see internal.ts.)
         */
        async beforeHandleMessage({ connection, context }) {
            const identity = (context as Partial<ConnectionContext> | undefined)?.identity;
            if (!identity || connection.readOnly || !isPastLock(identity)) {
                return;
            }

            connection.readOnly = true;
            setTimeout(() => connection.webSocket.close(CLOSE_ACCESS_CHANGED.code, CLOSE_ACCESS_CHANGED.reason), 0);
        },

        /**
         * A throw here closes the connections instead of opening an empty document: the next
         * store would otherwise write that empty document over the real one.
         */
        async onLoadDocument({ documentName, document }) {
            try {
                return (await options.backend.load(documentName)) ?? undefined;
            } catch (error) {
                log.error(`Could not load "${documentName}":`, error);
                // Hocuspocus never destroys a document that failed to load, which would keep its
                // awareness timer (and the document) alive forever.
                document.destroy();
                throw error;
            }
        },

        /** Remembers who changed what, for the history moderators see. */
        async onChange({ documentName, context }) {
            const userId = (context as Partial<ConnectionContext> | undefined)?.identity?.userId;
            if (!userId) {
                return;
            }

            const ids = contributors.get(documentName) ?? new Set<string>();
            ids.add(userId);
            contributors.set(documentName, ids);
        },

        /**
         * Runs a moment after edits stop (debounce), at least every maxDebounce while they keep
         * coming, and when the last person leaves. Sends the Yjs state, which is the source of
         * truth, together with a JSON copy for rendering and search, and who changed it.
         */
        async onStoreDocument({ documentName, document }) {
            const state = Y.encodeStateAsUpdate(document);
            const changedBy = contributors.get(documentName) ?? new Set<string>();
            contributors.delete(documentName);

            try {
                await options.backend.store(documentName, state, { ...jsonCopy(document), contributors: [...changedBy] });
            } catch (error) {
                // Keep them for the next attempt.
                const pending = contributors.get(documentName) ?? new Set<string>();
                changedBy.forEach((id) => pending.add(id));
                contributors.set(documentName, pending);

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
         * Plain HTTP: a health check for Docker, and the internal routes Symfony calls. Rejecting
         * without an error stops Hocuspocus from writing its default response after ours.
         */
        async onRequest({ request, response, instance }) {
            const path = new URL(request.url ?? '/', 'http://collab').pathname;
            if (path === '/health' || path === '/collab/health') {
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ status: 'ok' }));

                return Promise.reject();
            }

            const handled = await handleInternalRequest(request, response, options.secret, {
                restore: (documentName, state) => restoreDocument(instance, documentName, state),
                disconnect: async (documentName) => reconnectEveryone(instance, documentName),
            }, log);

            return handled ? Promise.reject() : undefined;
        },
    });
}
