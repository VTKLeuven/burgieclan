'use client'

import CollabStatus from '@/components/collab/CollabStatus';
import { caretColor, EDITOR_FIELD, useCollabSession, type CollabSession } from '@/components/collab/useCollabSession';
import { Toolbar } from '@/components/editor/Editor';
import { ExamEditorContext } from '@/components/exam/ExamContext';
import ExamReadOnly from '@/components/exam/ExamReadOnly';
import { examExtensions } from '@/components/exam/extensions';
import SittingsBar from '@/components/exam/SittingsBar';
import { useSittings } from '@/components/exam/useSittings';
import { useUser } from '@/components/UserContext';
import type { Exam } from '@/types/entities';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { EditorContent, useEditor } from '@tiptap/react';
import clsx from 'clsx';
import 'katex/dist/katex.min.css';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function LiveExam({ session, readOnly, hidden }: { session: CollabSession; readOnly: boolean; hidden: boolean }) {
    const { t } = useTranslation();
    const { user } = useUser();
    const { sittings, add, rename, remove } = useSittings(session.doc);
    const editable = !readOnly;

    const editor = useEditor({
        extensions: [
            ...examExtensions({ collaborative: true }),
            Collaboration.configure({ document: session.doc, field: EDITOR_FIELD }),
            CollaborationCaret.configure({
                provider: session.provider,
                // Only for your own view: the collab server puts the name from your token on your
                // cursor (your name, or a pseudonym if your account is anonymous).
                user: { name: t('exam.you'), color: caretColor(user?.id) },
            }),
        ],
        immediatelyRender: false, // Prevents hydration errors in Next.js
        editorProps: {
            attributes: {
                class: 'tiptap exam-editor mx-auto min-h-48 p-3 focus:outline-hidden',
                'aria-label': t('exam.editor.label'),
            },
        },
    }, [session]);

    useEffect(() => {
        editor?.setEditable(editable);
    }, [editor, editable]);

    const removeSitting = useCallback((id: string) => {
        remove(id);
        editor?.commands.removeSittingFromQuestions(id);
    }, [editor, remove]);

    const addQuestion = () => {
        editor?.chain().focus().insertExamQuestion({ atEnd: true }).run();
    };

    const context = useMemo(() => ({ sittings, editable }), [sittings, editable]);

    return (
        <ExamEditorContext.Provider value={context}>
            <div className={clsx('grid gap-4', hidden && 'hidden')}>
                <SittingsBar
                    sittings={sittings}
                    editable={editable}
                    onAdd={add}
                    onRename={rename}
                    onRemove={removeSitting}
                />

                <div className="editor-container rounded-md border border-vtk-ink/10 bg-vtk-surface">
                    {editable && <Toolbar editor={editor} />}
                    <EditorContent editor={editor} />
                    {editable && (
                        <div className="flex flex-wrap items-center gap-3 border-t border-vtk-line p-3">
                            <button type="button" className="vtk-button vtk-button-sm" onClick={addQuestion}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {t('exam.editor.add-question')}
                            </button>
                            <span className="vtk-help">{t('exam.editor.shortcut')}</span>
                        </div>
                    )}
                </div>
            </div>
        </ExamEditorContext.Provider>
    );
}

/**
 * An exam reconstruction, edited live by everyone who has it open.
 *
 * The stored copy is shown until the live document has loaded, so the page is readable at once,
 * and stays when the collab server cannot be reached. Whether you may edit is up to the server:
 * a locked exam comes back as a read-only connection.
 */
export default function ExamEditor({ exam, onAccessChange }: {
    exam: Exam;
    /** Called with whether the connection is read-only, whenever the server (re)decides it. */
    onAccessChange?: (readOnly: boolean) => void;
}) {
    const { t } = useTranslation();
    const { session, status, readOnly, synced, people } = useCollabSession(exam.documentName);

    const accessKnown = status === 'connected';
    useEffect(() => {
        if (accessKnown) {
            onAccessChange?.(readOnly);
        }
    }, [accessKnown, readOnly, onAccessChange]);

    const refused = status === 'denied' || status === 'unavailable';
    const live = session !== null && !refused && synced;

    return (
        <div className="grid gap-4">
            <CollabStatus status={status} readOnly={readOnly} people={people} />

            {refused && (
                <p className="vtk-help m-0">{t('exam.editor.stored-copy')}</p>
            )}

            {session && !refused && <LiveExam session={session} readOnly={readOnly} hidden={!synced} />}
            {!live && <ExamReadOnly exam={exam} />}
        </div>
    );
}
