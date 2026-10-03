'use client'

import { ApiClient } from '@/actions/api';
import { useUser } from '@/components/UserContext';
import { isErrorResponse, useApi } from '@/hooks/useApi';
import type { ExamQuestionComment } from '@/types/entities';
import { convertToExamQuestionComment } from '@/utils/convertToEntity';
import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

/** ExamQuestionComment::MAX_LENGTH in the backend. */
const MAX_LENGTH = 2000;

interface ExamQuestionThreadProps {
    examId: number;
    uid: string;
    /** Grows when someone else changes this thread (QuestionActivity.byQuestion). */
    reloadKey: number;
    /** After your own comment changed something: the counts in the header follow. */
    onChange: () => void;
}

/**
 * The comments on one question, below it, with a box to add one. Comments are plain text and
 * shown as such. Your own you can edit and delete; anything else goes through a moderator.
 *
 * Rendered inside the question's node view, so it is kept out of the document: contentEditable
 * off, and TipTap leaves events from its textareas and buttons alone.
 */
export default function ExamQuestionThread({ examId, uid, reloadKey, onChange }: ExamQuestionThreadProps) {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { request } = useApi();
    const [comments, setComments] = useState<ExamQuestionComment[] | null>(null);
    const [version, setVersion] = useState(0);
    const [draft, setDraft] = useState('');
    const [posting, setPosting] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const query = new URLSearchParams({ 'question.exam': String(examId), 'question.uid': uid, pagination: 'false' });
        request('GET', `/api/exam_question_comments?${query}`).then((data) => {
            if (cancelled || !data || isErrorResponse(data)) {
                return;
            }
            const members = (data as { 'hydra:member'?: unknown[] })['hydra:member'] ?? [];
            setComments(members.map(convertToExamQuestionComment));
        });
        return () => { cancelled = true; };
    }, [examId, uid, request, version, reloadKey]);

    /** Runs a change, then reloads the thread and the counts. Returns whether it worked. */
    const change = useCallback(async (method: string, endpoint: string, body?: unknown): Promise<boolean> => {
        setProblem(null);
        const result = await ApiClient(method, endpoint, body);
        if (isErrorResponse(result)) {
            setProblem(t(result.error.status === 429 ? 'exam.discussion.rate-limited' : 'exam.discussion.error'));
            return false;
        }
        setVersion((current) => current + 1);
        onChange();
        return true;
    }, [onChange, t]);

    const submit = async (event?: FormEvent) => {
        event?.preventDefault();
        if (draft.trim() === '' || posting) {
            return;
        }
        setPosting(true);
        const posted = await change('POST', '/api/exam_question_comments', {
            exam: `/api/exams/${examId}`,
            questionUid: uid,
            content: draft,
        });
        setPosting(false);
        if (posted) {
            setDraft('');
        }
    };

    const submitOnModEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void submit();
        }
    };

    const formatDate = (date?: Date) => date?.toLocaleString(i18n.language, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

    return (
        <div className="exam-question__thread" contentEditable={false}>
            {comments === null && <p className="vtk-help m-0">{t('exam.discussion.loading')}</p>}
            {comments?.length === 0 && <p className="vtk-help m-0">{t('exam.discussion.empty')}</p>}
            {comments && comments.length > 0 && (
                <ul className="m-0 grid list-none gap-3 p-0">
                    {comments.map((comment) => (
                        <ThreadComment
                            key={comment.id}
                            comment={comment}
                            date={formatDate(comment.createdAt)}
                            onSave={(content) => change('PATCH', `/api/exam_question_comments/${comment.id}`, { content })}
                            onDelete={() => change('DELETE', `/api/exam_question_comments/${comment.id}`)}
                        />
                    ))}
                </ul>
            )}

            <form onSubmit={submit} className="grid gap-2">
                <textarea
                    value={draft}
                    maxLength={MAX_LENGTH}
                    rows={2}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={submitOnModEnter}
                    placeholder={t('exam.discussion.placeholder')}
                    aria-label={t('exam.discussion.new')}
                    className="vtk-input min-h-16 text-sm"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="vtk-help">
                        {user?.defaultAnonymous ? t('exam.discussion.as-anonymous') : t('exam.discussion.as-named')}
                    </span>
                    <button type="submit" className="vtk-button vtk-button-sm" disabled={posting || draft.trim() === ''}>
                        {t('exam.discussion.post')}
                    </button>
                </div>
                {problem && <p className="vtk-error-text m-0" role="alert">{problem}</p>}
            </form>
        </div>
    );
}

function ThreadComment({ comment, date, onSave, onDelete }: {
    comment: ExamQuestionComment;
    date?: string;
    onSave: (content: string) => Promise<boolean>;
    onDelete: () => Promise<boolean>;
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(comment.content);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [busy, setBusy] = useState(false);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (draft.trim() === '') {
            return;
        }
        setBusy(true);
        if (await onSave(draft)) {
            setEditing(false);
        }
        setBusy(false);
    };

    return (
        <li className="grid gap-1">
            <p className="m-0 text-xs text-vtk-muted">
                <span className="font-semibold text-vtk-ink">{comment.authorName}</span>
                {comment.mine && ` (${t('exam.you')})`}
                {date && ` · ${date}`}
            </p>

            {editing ? (
                <form onSubmit={save} className="grid gap-2">
                    <textarea
                        value={draft}
                        maxLength={MAX_LENGTH}
                        rows={2}
                        onChange={(event) => setDraft(event.target.value)}
                        aria-label={t('exam.discussion.edit')}
                        className="vtk-input min-h-16 text-sm"
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="vtk-button vtk-button-sm" disabled={busy || draft.trim() === ''}>
                            {t('exam.discussion.save')}
                        </button>
                        <button type="button" className="vtk-button vtk-button-sm vtk-button-ghost" onClick={() => {
                            setDraft(comment.content);
                            setEditing(false);
                        }}>
                            {t('exam.cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <p className="m-0 whitespace-pre-wrap break-words text-sm text-vtk-body">{comment.content}</p>
            )}

            {comment.mine && !editing && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                    {confirmingDelete ? (
                        <>
                            <span className="text-vtk-muted">{t('exam.discussion.delete-confirm')}</span>
                            <button type="button" className="exam-thread__link text-red-700" disabled={busy} onClick={async () => {
                                setBusy(true);
                                await onDelete();
                                setBusy(false);
                            }}>
                                {t('exam.discussion.delete')}
                            </button>
                            <button type="button" className="exam-thread__link" onClick={() => setConfirmingDelete(false)}>
                                {t('exam.cancel')}
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="exam-thread__link" onClick={() => setEditing(true)}>
                                {t('exam.discussion.edit')}
                            </button>
                            <button type="button" className="exam-thread__link" onClick={() => setConfirmingDelete(true)}>
                                {t('exam.discussion.delete')}
                            </button>
                        </>
                    )}
                </div>
            )}
        </li>
    );
}
