'use client'

import { getCollabToken } from '@/actions/collab';
import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { useEffect, useState } from 'react';
import * as Y from 'yjs';

/**
 * The Yjs field the editor writes to. The collab server reads the same field when it turns the
 * document into TipTap JSON (EDITOR_FIELD in collab/src/server.ts).
 */
export const EDITOR_FIELD = 'default';

/** Distinct, readable on white, and none of them the brand yellow used for highlights. */
const CARET_COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4d7c0f'];

export type ConnectionStatus =
    | 'connecting'
    | 'connected'
    | 'disconnected'
    /** Symfony said no: not logged in or no access to this document. */
    | 'denied'
    /** Live editing is switched off on the server (no COLLAB_SECRET). */
    | 'unavailable';

/** An open socket only counts as connected once the server accepted the token (onAuthenticated). */
const SOCKET_STATUS: Record<WebSocketStatus, ConnectionStatus> = {
    [WebSocketStatus.Connecting]: 'connecting',
    [WebSocketStatus.Connected]: 'connecting',
    [WebSocketStatus.Disconnected]: 'disconnected',
};

export interface CollabSession {
    doc: Y.Doc;
    provider: HocuspocusProvider;
}

export interface CollabSessionState {
    session: CollabSession | null;
    status: ConnectionStatus;
    /** The server only lets this connection watch (a view token, or the document is locked). */
    readOnly: boolean;
    /** The document has been loaded from the server at least once since the page opened. */
    synced: boolean;
    /** Names on everyone's cursor who has the document open, yourself included. */
    people: string[];
    /**
     * The document grew past what the collab server lets anyone edit (MAX_DOCUMENT_BYTES in
     * collab/src/server.ts), so the connection is read-only until a moderator rolls it back.
     */
    tooLarge: boolean;
    /**
     * Comments and confirmations on questions, as announced by Symfony (ExamQuestionActivity):
     * null until the first announcement.
     */
    activity: QuestionActivity | null;
}

export interface QuestionActivity {
    /** Grows with every announcement, so the same question twice in a row still reads as new. */
    seq: number;
    /** Per question uid, how many announcements it had: a thread reloads when its own count moves. */
    byQuestion: Record<string, number>;
}

type Notice = { type: 'too-large' } | { type: 'question-activity'; uid: string };

/**
 * Stateless messages from the collab server: TOO_LARGE_MESSAGE in collab/src/server.ts, and the
 * question-activity messages Symfony sends through it. Anything else is ignored.
 */
function parseNotice(payload: string): Notice | null {
    let message: unknown;
    try {
        message = JSON.parse(payload);
    } catch {
        return null;
    }
    if (typeof message !== 'object' || message === null || !('type' in message)) {
        return null;
    }
    if (message.type === 'too-large') {
        return { type: 'too-large' };
    }
    if (message.type === 'question-activity' && 'uid' in message && typeof message.uid === 'string') {
        return { type: 'question-activity', uid: message.uid };
    }

    return null;
}

function collabUrl(): string {
    if (process.env.NEXT_PUBLIC_COLLAB_URL) {
        return process.env.NEXT_PUBLIC_COLLAB_URL;
    }

    // Deployed behind nginx on the same host as the site itself.
    const { protocol, host } = window.location;
    return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/collab`;
}

export function caretColor(userId: number | undefined): string {
    return CARET_COLORS[(userId ?? 0) % CARET_COLORS.length];
}

function namesOf(states: ReadonlyArray<Record<string, unknown>>): string[] {
    return states
        .map((state) => state.user)
        .map((user) => (typeof user === 'object' && user !== null && 'name' in user ? String(user.name) : ''))
        .filter((name) => name !== '');
}

/**
 * Opens a live document on the collab server for as long as the component is mounted.
 *
 * Access can change while it is open: when a moderator locks or reopens a document, or when it
 * locks by itself, the server closes the connection. The provider then reconnects on its own and
 * asks Symfony for a new token, so `readOnly` follows without a reload.
 */
export function useCollabSession(documentName: string): CollabSessionState {
    const [session, setSession] = useState<CollabSession | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [readOnly, setReadOnly] = useState(false);
    const [synced, setSynced] = useState(false);
    const [people, setPeople] = useState<string[]>([]);
    const [tooLarge, setTooLarge] = useState(false);
    const [activity, setActivity] = useState<QuestionActivity | null>(null);

    useEffect(() => {
        const doc = new Y.Doc();
        let refused: ConnectionStatus | null = null;

        const provider = new HocuspocusProvider({
            url: collabUrl(),
            name: documentName,
            document: doc,
            // A function, so every reconnect asks Symfony for a fresh token.
            token: async () => {
                const result = await getCollabToken(documentName);
                if ('error' in result) {
                    refused = result.error.status === 503 ? 'unavailable' : 'denied';
                    setStatus(refused);
                    // An empty token makes the collab server refuse the connection.
                    return '';
                }
                refused = null;
                return result.token;
            },
            onStatus: ({ status: next }) => {
                if (!refused) {
                    setStatus(SOCKET_STATUS[next]);
                }
            },
            onAuthenticated: ({ scope }) => {
                setReadOnly(scope === 'readonly');
                setStatus('connected');
                // Sent again right after this when it still applies.
                setTooLarge(false);
            },
            onStateless: ({ payload }) => {
                const notice = parseNotice(payload);
                if (notice?.type === 'too-large') {
                    setTooLarge(true);
                } else if (notice?.type === 'question-activity') {
                    setActivity((previous) => ({
                        seq: (previous?.seq ?? 0) + 1,
                        byQuestion: { ...previous?.byQuestion, [notice.uid]: (previous?.byQuestion[notice.uid] ?? 0) + 1 },
                    }));
                }
            },
            onAuthenticationFailed: () => setStatus(refused ?? 'denied'),
            onSynced: () => setSynced(true),
            onAwarenessChange: ({ states }) => setPeople(namesOf(states)),
        });

        // The provider opens a websocket, so it can only be created in an effect (and must be
        // destroyed when the effect is cleaned up); the editor needs it as state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession({ doc, provider });

        return () => {
            provider.destroy();
            doc.destroy();
            setSession(null);
            setSynced(false);
        };
    }, [documentName]);

    return { session, status, readOnly, synced, people, tooLarge, activity };
}
