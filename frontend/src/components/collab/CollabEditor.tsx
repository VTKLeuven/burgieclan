'use client'

import { getCollabToken } from '@/actions/collab';
import { Toolbar } from '@/components/editor/Editor';
import { useUser } from '@/components/UserContext';
import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { Mathematics } from '@tiptap/extension-mathematics';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import 'katex/dist/katex.min.css';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Y from 'yjs';

/**
 * The Yjs field the editor writes to. The collab server reads the same field when it turns the
 * document into TipTap JSON (EDITOR_FIELD in collab/src/server.ts).
 */
const EDITOR_FIELD = 'default';

/** Distinct, readable on white, and none of them the brand yellow used for highlights. */
const CARET_COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4d7c0f'];

type ConnectionStatus =
    | 'connecting'
    | 'connected'
    | 'disconnected'
    /** Symfony said no: not logged in or no access to this document. */
    | 'denied'
    /** Live editing is switched off on the server (no COLLAB_SECRET). */
    | 'unavailable';

const SOCKET_STATUS: Record<WebSocketStatus, ConnectionStatus> = {
    [WebSocketStatus.Connecting]: 'connecting',
    [WebSocketStatus.Connected]: 'connected',
    [WebSocketStatus.Disconnected]: 'disconnected',
};

interface CollabSession {
    doc: Y.Doc;
    provider: HocuspocusProvider;
}

function collabUrl(): string {
    if (process.env.NEXT_PUBLIC_COLLAB_URL) {
        return process.env.NEXT_PUBLIC_COLLAB_URL;
    }

    // Deployed behind nginx on the same host as the site itself.
    const { protocol, host } = window.location;
    return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/collab`;
}

function caretColor(userId: number | undefined): string {
    return CARET_COLORS[(userId ?? 0) % CARET_COLORS.length];
}

/**
 * Opens a live document on the collab server for as long as the component is mounted.
 */
function useCollabSession(documentName: string) {
    const [session, setSession] = useState<CollabSession | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [readOnly, setReadOnly] = useState(false);
    const [peerCount, setPeerCount] = useState(0);

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
            onAuthenticated: ({ scope }) => setReadOnly(scope === 'readonly'),
            onAuthenticationFailed: () => setStatus(refused ?? 'denied'),
            onAwarenessChange: ({ states }) => setPeerCount(states.length),
        });

        // The provider opens a websocket, so it can only be created in an effect (and must be
        // destroyed when the effect is cleaned up); the editor needs it as state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession({ doc, provider });

        return () => {
            provider.destroy();
            doc.destroy();
            setSession(null);
        };
    }, [documentName]);

    return { session, status, readOnly, peerCount };
}

function LiveEditor({ session, readOnly }: { session: CollabSession; readOnly: boolean }) {
    const { user } = useUser();

    const editor = useEditor({
        extensions: [
            // Collaboration brings its own undo/redo that only undoes your own changes.
            StarterKit.configure({ undoRedo: false }),
            Mathematics,
            Collaboration.configure({ document: session.doc, field: EDITOR_FIELD }),
            CollaborationCaret.configure({
                provider: session.provider,
                // The collab server replaces the name with the one from your token, so what we
                // send here only matters for your own view.
                user: { name: user?.fullName ?? '', color: caretColor(user?.id) },
            }),
        ],
        immediatelyRender: false, // Prevents hydration errors in Next.js
        editorProps: {
            attributes: {
                class: 'tiptap overflow-auto mx-auto min-h-64 p-3 focus:outline-hidden',
            },
            // Strip styling from pasted content, like the comment editor does.
            handlePaste(view, event) {
                event.preventDefault();
                const text = event.clipboardData?.getData('text/plain');
                view.dispatch(view.state.tr.insertText(text ?? ''));
                return true;
            },
        },
    }, [session]);

    useEffect(() => {
        editor?.setEditable(!readOnly);
    }, [editor, readOnly]);

    return (
        <div className="editor-container border border-vtk-ink/10 rounded-md h-fit bg-vtk-surface">
            {!readOnly && <Toolbar editor={editor} />}
            <EditorContent editor={editor} />
        </div>
    );
}

const STATUS_DOT: Record<ConnectionStatus, string> = {
    connecting: 'bg-vtk-yellow',
    connected: 'bg-emerald-500',
    disconnected: 'bg-vtk-muted',
    denied: 'bg-red-600',
    unavailable: 'bg-red-600',
};

/**
 * A TipTap editor whose content is shared live with everyone who has the same document open.
 */
export default function CollabEditor({ documentName }: { documentName: string }) {
    const { t } = useTranslation();
    const { session, status, readOnly, peerCount } = useCollabSession(documentName);

    const refused = status === 'denied' || status === 'unavailable';

    return (
        <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-vtk-muted" aria-live="polite">
                <span className="inline-flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
                    {t(`collab.status.${status}`)}
                </span>
                {status === 'connected' && (
                    <span>{t('collab.people_here', { count: peerCount })}</span>
                )}
                {readOnly && status === 'connected' && (
                    <span className="rounded-sm bg-vtk-paper-2 px-2 py-0.5 text-xs font-semibold text-vtk-body">
                        {t('collab.read_only')}
                    </span>
                )}
            </div>

            {session && !refused && <LiveEditor session={session} readOnly={readOnly} />}
        </div>
    );
}
