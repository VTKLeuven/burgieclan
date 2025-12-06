import { useToast } from '@/components/ui/Toast';
import { isErrorResponse, useApi } from '@/hooks/useApi';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useDeleteComment() {
    const { request } = useApi();
    const { showToast } = useToast();
    const { t } = useTranslation();

    return useCallback(async (commentId: number) => {
        const result = await request('DELETE', `/api/course_comments/${commentId}`);

        // result == null is a good thing
        if (result && isErrorResponse(result)) {
            showToast(
                t('course-page.comments.toast.delete-error'),
                'error'
            );
            throw new Error(result?.error?.message || t('course-page.comments.toast.delete-error'));
        }

        showToast(
            t('course-page.comments.toast.delete-success'),
            'success'
        );
        return;
    }, [request, showToast, t]);
}
