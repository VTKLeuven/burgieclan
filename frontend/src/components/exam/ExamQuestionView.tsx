'use client'

import { useExamEditor } from '@/components/exam/ExamContext';
import ExamQuestionThread from '@/components/exam/ExamQuestionThread';
import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Check, GripVertical, MessageSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * How a question looks in the editor: a header with its number, the days it came up on and,
 * while editing, handles to move or delete it; below it the question itself.
 *
 * The number is not stored anywhere: a CSS counter over the questions draws it (the label comes
 * from data-label), so it follows every reorder.
 *
 * Each question carries the anchor `q-{id}`, its permanent id, so a link such as a search result
 * can point at it: /course/{id}/exams/{examId}#q-{id}.
 *
 * The header also counts the comments, which open below the question, and lets you say you had
 * this question too. Both work on a locked exam and on the stored copy as well.
 */
export default function ExamQuestionView({ node, editor, getPos, deleteNode }: ReactNodeViewProps) {
    const { t } = useTranslation();
    const { sittings, editable, discussion } = useExamEditor();
    const [threadOpen, setThreadOpen] = useState(false);

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

    const uid: unknown = node.attrs.id;
    const questionUid = typeof uid === 'string' ? uid : null;
    const stats = questionUid !== null ? discussion?.stats[questionUid] : undefined;
    const comments = stats?.comments ?? 0;
    const confirmations = stats?.confirmations ?? 0;
    const confirmed = stats?.confirmed ?? false;

    return (
        <NodeViewWrapper className="exam-question__inner" id={questionUid !== null ? `q-${questionUid}` : undefined}>
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

                <div className="exam-question__tools">
                    {discussion && questionUid !== null && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                aria-expanded={threadOpen}
                                onClick={() => setThreadOpen((open) => !open)}
                                className={clsx('exam-chip', threadOpen && 'exam-chip--active')}
                                aria-label={t('exam.discussion.comments', { count: comments })}
                                title={t('exam.discussion.comments', { count: comments })}
                            >
                                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                                {comments}
                            </button>
                            <button
                                type="button"
                                aria-pressed={confirmed}
                                onClick={() => void discussion.setConfirmed(questionUid, !confirmed)}
                                className={clsx('exam-chip', confirmed && 'exam-chip--active')}
                                aria-label={`${t('exam.discussion.had-this-too')}: ${t('exam.discussion.had-this-too-help', { count: confirmations })}`}
                                title={t('exam.discussion.had-this-too-help', { count: confirmations })}
                            >
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('exam.discussion.had-this-too')}
                                {confirmations > 0 && <span className="tabular-nums">{confirmations}</span>}
                            </button>
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
            </div>

            <NodeViewContent className="exam-question__body" />

            {threadOpen && discussion && questionUid !== null && (
                <ExamQuestionThread
                    examId={discussion.examId}
                    uid={questionUid}
                    reloadKey={discussion.activity?.byQuestion[questionUid] ?? 0}
                    onChange={discussion.refresh}
                />
            )}
        </NodeViewWrapper>
    );
}
