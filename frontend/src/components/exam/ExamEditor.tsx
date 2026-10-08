'use client'

import CollabStatus from '@/components/collab/CollabStatus';
import { caretColor, EDITOR_FIELD, useCollabSession, type CollabSession } from '@/components/collab/useCollabSession';
import { Toolbar } from '@/components/editor/Editor';
import { ExamEditorContext } from '@/components/exam/ExamContext';
import {
    ExamImageUpload,
    insertExamImages,
    setExamImageUploadOptions,
    uploadExamImage,
    type ExamImageUploadOptions,
} from '@/components/exam/ExamImageUpload';
import { countQuestionsWithSitting } from '@/components/exam/ExamQuestion';
import ExamReadOnly from '@/components/exam/ExamReadOnly';
import { examExtensions } from '@/components/exam/extensions';
import RemoveSittingDialog, { type SittingRemoval } from '@/components/exam/RemoveSittingDialog';
import SittingsBar from '@/components/exam/SittingsBar';
import { useQuestionDiscussion, type QuestionDiscussion } from '@/components/exam/useQuestionDiscussion';
import { SITTINGS_FIELD, SITTINGS_ORIGIN, useSittings } from '@/components/exam/useSittings';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/components/UserContext';
import type { Exam } from '@/types/entities';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { EditorContent, useEditor } from '@tiptap/react';
import { yUndoPluginKey } from '@tiptap/y-tiptap';
import clsx from 'clsx';
import 'katex/dist/katex.min.css';
import { ImagePlus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

function LiveExam({ session, readOnly, hidden, discussion }: {
    session: CollabSession;
    readOnly: boolean;
    hidden: boolean;
    discussion: QuestionDiscussion;
}) {
    const { t } = useTranslation();
    const { user } = useUser();
    const { sittings, add, rename, remove } = useSittings(session.doc);
    const editable = !readOnly;
    const [removal, setRemoval] = useState<SittingRemoval | null>(null);
    const [confirmingRemoval, setConfirmingRemoval] = useState(false);
    const { showToast } = useToast();
    const imageInput = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            ...examExtensions({ collaborative: true }),
            ExamImageUpload,
            Collaboration.configure({
                document: session.doc,
                field: EDITOR_FIELD,
                // Your own changes to the days are undone with Ctrl/Cmd+Z too, see below.
                yUndoOptions: { trackedOrigins: [SITTINGS_ORIGIN] },
            }),
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

    // Read by the editor's upload plugin whenever an image comes in, so the editor does not have
    // to be rebuilt when these change. Null while you cannot edit.
    const uploadOptions = useMemo<ExamImageUploadOptions | null>(() => (editable ? {
        uploadingLabel: t('exam.images.uploading'),
        upload: async (file) => {
            const result = await uploadExamImage(discussion.examId, file);
            if ('problem' in result) {
                showToast(t(`exam.images.errors.${result.problem}`), 'error');
                return null;
            }
            return result.image;
        },
    } : null), [editable, discussion.examId, showToast, t]);

    useEffect(() => {
        if (editor) {
            setExamImageUploadOptions(editor, uploadOptions);
        }
    }, [editor, uploadOptions]);

    // The days live next to the questions in the Y.Doc, not in them, so the undo history only
    // covers them once told to. Removing a day and unmarking it on the questions happen within
    // the same moment, so one undo brings back both.
    useEffect(() => {
        if (editor) {
            yUndoPluginKey.getState(editor.state)?.undoManager.addToScope(session.doc.getArray(SITTINGS_FIELD));
        }
    }, [editor, session]);

    const removeSitting = useCallback((id: string) => {
        remove(id);
        editor?.commands.removeSittingFromQuestions(id);
    }, [editor, remove]);

    const requestSittingRemoval = useCallback((id: string) => {
        const sitting = sittings.find((candidate) => candidate.id === id);
        const questions = editor ? countQuestionsWithSitting(editor.state.doc, id) : 0;
        if (!sitting || questions === 0) {
            removeSitting(id);
            return;
        }

        setRemoval({ id, label: sitting.label, questions });
        setConfirmingRemoval(true);
    }, [editor, removeSitting, sittings]);

    const confirmSittingRemoval = (id: string) => {
        removeSitting(id);
        setConfirmingRemoval(false);
    };

    const addQuestion = () => {
        editor?.chain().focus().insertExamQuestion({ atEnd: true }).run();
    };

    /** The image button: where the cursor last was, as with pasting. */
    const addImages = (files: FileList | null) => {
        if (!editor || !uploadOptions || !files || files.length === 0) {
            return;
        }
        insertExamImages(editor.view, Array.from(files), editor.state.selection.from, uploadOptions);
    };

    const context = useMemo(
        () => ({ examId: discussion.examId, sittings, editable, discussion }),
        [sittings, editable, discussion],
    );

    return (
        <ExamEditorContext.Provider value={context}>
            <div className={clsx('grid gap-4', hidden && 'hidden')}>
                <SittingsBar
                    sittings={sittings}
                    editable={editable}
                    onAdd={add}
                    onRename={rename}
                    onRemove={requestSittingRemoval}
                />
                <RemoveSittingDialog
                    removal={removal}
                    open={confirmingRemoval}
                    onCancel={() => setConfirmingRemoval(false)}
                    onConfirm={confirmSittingRemoval}
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
                            <button
                                type="button"
                                className="vtk-button vtk-button-sm vtk-button-ghost"
                                onClick={() => imageInput.current?.click()}
                            >
                                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                                {t('exam.images.add')}
                            </button>
                            <input
                                ref={imageInput}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                multiple
                                hidden
                                onChange={(event) => {
                                    addImages(event.target.files);
                                    event.target.value = '';
                                }}
                            />
                            <span className="vtk-help">{t('exam.editor.shortcut')}</span>
                            <span className="vtk-help basis-full">{t('exam.images.hint')}</span>
                        </div>
                    )}
                </div>
            </div>
        </ExamEditorContext.Provider>
    );
}

/** How long a linked question stays highlighted, in ms; matches the animation in globals.css. */
const LINKED_HIGHLIGHT_MS = 2500;

/**
 * A link like a search result opens the exam at one question: …/exams/{id}#q-{uid}. The questions
 * only exist once the document has rendered, so the browser cannot scroll there by itself. This
 * does, once `ready`, and highlights the question for a moment.
 */
function useScrollToLinkedQuestion(ready: boolean) {
    const done = useRef(false);

    useEffect(() => {
        if (!ready || done.current) {
            return;
        }
        const id = decodeURIComponent(window.location.hash.slice(1));
        if (!id.startsWith('q-')) {
            return;
        }
        done.current = true;

        // Node views mount a moment after the editor; look again for up to two seconds.
        let tries = 0;
        let retry: number | undefined;
        const find = () => {
            const question = document.getElementById(id);
            if (!question) {
                if (++tries < 20) {
                    retry = window.setTimeout(find, 100);
                }
                return;
            }
            question.scrollIntoView({ behavior: 'smooth', block: 'center' });
            question.classList.add('exam-question__inner--linked');
            window.setTimeout(() => question.classList.remove('exam-question__inner--linked'), LINKED_HIGHLIGHT_MS);
        };
        find();

        return () => window.clearTimeout(retry);
    }, [ready]);
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
    const { session, status, readOnly, synced, people, tooLarge, activity } = useCollabSession(exam.documentName);
    const discussion = useQuestionDiscussion(exam.id, activity);

    const accessKnown = status === 'connected';
    useEffect(() => {
        if (accessKnown) {
            onAccessChange?.(readOnly);
        }
    }, [accessKnown, readOnly, onAccessChange]);

    const refused = status === 'denied' || status === 'unavailable';
    const live = session !== null && !refused && synced;
    // Wait for the live document, or for the stored copy when live editing is unavailable: the
    // copy shown while connecting is swapped out and would scroll to the wrong place.
    useScrollToLinkedQuestion(live || refused);

    return (
        <div className="grid gap-4">
            <CollabStatus status={status} readOnly={readOnly} people={people} />

            {refused && (
                <p className="vtk-help m-0">{t('exam.editor.stored-copy')}</p>
            )}
            {tooLarge && (
                <p className="vtk-error-text m-0">{t('exam.editor.too-large')}</p>
            )}

            {session && !refused && (
                <LiveExam session={session} readOnly={readOnly} hidden={!synced} discussion={discussion} />
            )}
            {!live && <ExamReadOnly exam={exam} discussion={discussion} />}
        </div>
    );
}
