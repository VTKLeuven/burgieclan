'use client'

import { ExamEditorContext } from '@/components/exam/ExamContext';
import type { QuestionDiscussion } from '@/components/exam/useQuestionDiscussion';
import { examExtensions } from '@/components/exam/extensions';
import SittingsBar from '@/components/exam/SittingsBar';
import type { Exam } from '@/types/entities';
import { EditorContent, useEditor } from '@tiptap/react';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The last stored copy of a reconstruction, rendered through the same schema as the live editor,
 * so only known nodes and marks ever reach the page. Shown until the live document has loaded,
 * and instead of it when the collab server cannot be reached.
 */
export default function ExamReadOnly({ exam, discussion = null }: { exam: Exam; discussion?: QuestionDiscussion | null }) {
    const { t } = useTranslation();
    const hasContent = (exam.content?.content?.length ?? 0) > 0;

    const editor = useEditor({
        extensions: examExtensions({ collaborative: false }),
        content: hasContent ? exam.content : undefined,
        editable: false,
        immediatelyRender: false,
        editorProps: {
            attributes: { class: 'tiptap exam-editor mx-auto min-h-32 p-3 focus:outline-hidden' },
        },
    }, [exam.content]);

    const context = useMemo(
        () => ({ sittings: exam.sittings, editable: false, discussion }),
        [exam.sittings, discussion],
    );

    return (
        <ExamEditorContext.Provider value={context}>
            <div className="grid gap-4">
                <SittingsBar sittings={exam.sittings} editable={false} />
                <div className="editor-container rounded-md border border-vtk-ink/10 bg-vtk-surface">
                    {hasContent ? <EditorContent editor={editor} /> : <p className="vtk-empty">{t('exam.editor.empty')}</p>}
                </div>
            </div>
        </ExamEditorContext.Provider>
    );
}
