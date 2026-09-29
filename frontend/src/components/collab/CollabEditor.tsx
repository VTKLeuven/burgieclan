'use client'

import { Toolbar } from '@/components/editor/Editor';
import { useUser } from '@/components/UserContext';
import CollabStatus from '@/components/collab/CollabStatus';
import {
    caretColor,
    EDITOR_FIELD,
    useCollabSession,
    type CollabSession,
} from '@/components/collab/useCollabSession';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { Mathematics } from '@tiptap/extension-mathematics';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import 'katex/dist/katex.min.css';
import { useEffect } from 'react';

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

/**
 * A TipTap editor whose content is shared live with everyone who has the same document open.
 */
export default function CollabEditor({ documentName }: { documentName: string }) {
    const { session, status, readOnly, people } = useCollabSession(documentName);

    const refused = status === 'denied' || status === 'unavailable';

    return (
        <div className="grid gap-2">
            <CollabStatus status={status} readOnly={readOnly} people={people} />
            {session && !refused && <LiveEditor session={session} readOnly={readOnly} />}
        </div>
    );
}
