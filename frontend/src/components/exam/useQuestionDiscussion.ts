'use client'

import { ApiClient } from '@/actions/api';
import type { QuestionActivity } from '@/components/collab/useCollabSession';
import { useToast } from '@/components/ui/Toast';
import { isErrorResponse, useApi } from '@/hooks/useApi';
import type { ExamQuestionStats } from '@/types/entities';
import { convertToExamQuestionStats } from '@/utils/convertToEntity';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Comments and "Ik had deze ook" around the questions of one exam, for the question views.
 */
export interface QuestionDiscussion {
    examId: number;
    /** By question uid. Questions without comments or confirmations are missing. */
    stats: Record<string, ExamQuestionStats>;
    setConfirmed: (uid: string, confirmed: boolean) => Promise<void>;
    /** Reload the counts, e.g. after your own comment. */
    refresh: () => void;
    /** Announced changes per question, so an open thread reloads when its question had one. */
    activity: QuestionActivity | null;
}

/**
 * Loads the counts with the page and again whenever the collab server says someone changed
 * something around a question (`activity`), so nobody polls. Without a live connection, as on
 * the stored copy, the counts still follow your own actions.
 */
export function useQuestionDiscussion(examId: number, activity: QuestionActivity | null): QuestionDiscussion {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { request } = useApi();
    const [stats, setStats] = useState<Record<string, ExamQuestionStats>>({});
    const [version, setVersion] = useState(0);
    const activitySeq = activity?.seq ?? 0;

    useEffect(() => {
        let cancelled = false;
        request('GET', `/api/exams/${examId}/question_stats`).then((data) => {
            if (!cancelled && data && !isErrorResponse(data)) {
                setStats(convertToExamQuestionStats(data));
            }
        });
        return () => { cancelled = true; };
    }, [examId, request, version, activitySeq]);

    const refresh = useCallback(() => setVersion((current) => current + 1), []);

    const setConfirmed = useCallback(async (uid: string, confirmed: boolean) => {
        // Show it at once; the answer brings the real counts, including other people's.
        setStats((current) => {
            const previous = current[uid] ?? { uid, comments: 0, confirmations: 0, confirmed: false };
            if (previous.confirmed === confirmed) {
                return current;
            }
            const confirmations = Math.max(0, previous.confirmations + (confirmed ? 1 : -1));
            return { ...current, [uid]: { ...previous, confirmed, confirmations } };
        });

        const result = await ApiClient('POST', `/api/exams/${examId}/confirmations`, { questionUid: uid, confirmed });
        if (isErrorResponse(result) || !result) {
            const limited = isErrorResponse(result) && result.error.status === 429;
            showToast(t(limited ? 'exam.discussion.rate-limited' : 'exam.discussion.error'), 'error');
            refresh();
            return;
        }
        setStats(convertToExamQuestionStats(result));
    }, [examId, refresh, showToast, t]);

    return useMemo(
        () => ({ examId, stats, setConfirmed, refresh, activity }),
        [examId, stats, setConfirmed, refresh, activity],
    );
}
