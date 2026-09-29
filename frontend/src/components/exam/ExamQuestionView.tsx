'use client'

import { useExamEditor } from '@/components/exam/ExamContext';
import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * How a question looks in the editor: a header with its number, the days it came up on and,
 * while editing, handles to move or delete it; below it the question itself.
 *
 * The number is not stored anywhere: a CSS counter over the questions draws it (the label comes
 * from data-label), so it follows every reorder.
 */
export default function ExamQuestionView({ node, editor, getPos, deleteNode }: ReactNodeViewProps) {
    const { t } = useTranslation();
    const { sittings, editable } = useExamEditor();

    const marked: string[] = Array.isArray(node.attrs.sittings) ? node.attrs.sittings : [];
    // Days that were removed since stay in the attribute until someone edits it; skip them.
    const shownSittings = editable ? sittings : sittings.filter((sitting) => marked.includes(sitting.id));

    const position = () => {
        const pos = getPos();
        return typeof pos === 'number' ? pos : null;
    };

    const toggle = (sittingId: string) => {
        const pos = position();
        if (pos !== null) {
            editor.commands.toggleExamQuestionSitting(pos, sittingId);
        }
    };

    const move = (direction: -1 | 1) => {
        const pos = position();
        if (pos !== null) {
            editor.commands.moveExamQuestion(pos, direction);
        }
    };

    return (
        <NodeViewWrapper className="exam-question__inner">
            <div className="exam-question__head" contentEditable={false}>
                {editable && (
                    <button
                        type="button"
                        className="exam-question__handle"
                        data-drag-handle=""
                        draggable
                        aria-label={t('exam.question.drag')}
                        title={t('exam.question.drag')}
                    >
                        <GripVertical className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}

                <span className="exam-question__number" data-label={t('exam.question.label')} />

                {shownSittings.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('exam.question.sittings')}>
                        {shownSittings.map((sitting) => {
                            const active = marked.includes(sitting.id);
                            return editable ? (
                                <button
                                    key={sitting.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => toggle(sitting.id)}
                                    className={clsx('exam-chip', active && 'exam-chip--active')}
                                >
                                    {sitting.label}
                                </button>
                            ) : (
                                <span key={sitting.id} className="exam-chip exam-chip--active">{sitting.label}</span>
                            );
                        })}
                    </div>
                )}

                {editable && (
                    <div className="exam-question__actions">
                        <button type="button" onClick={() => move(-1)} aria-label={t('exam.question.up')} title={t('exam.question.up')}>
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => move(1)} aria-label={t('exam.question.down')} title={t('exam.question.down')}>
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => deleteNode()} aria-label={t('exam.question.delete')} title={t('exam.question.delete')}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            <NodeViewContent className="exam-question__body" />
        </NodeViewWrapper>
    );
}
