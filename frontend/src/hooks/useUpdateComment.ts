import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { convertToCourseComment } from '@/utils/convertToEntity';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useUpdateComment() {
    const { request } = useApi();
    const { showToast } = useToast();
    const { t } = useTranslation();

    return useCallback(async (commentId: number, data: { content?: string, anonymous?: boolean }) => {
        const result = await request('PATCH', `/api/course_comments/${commentId}`, data);

        if (!result || result.error) {
            showToast(
                t('course-page.comments.toast.update-error'),
                'error'
            );
            throw new Error(result?.error?.message || t('course-page.comments.toast.update-error'));
        }

        showToast(
            t('course-page.comments.toast.update-success'),
            'success'
        );
        const updatedComment = convertToCourseComment(result);
        return updatedComment;
    }, [request, showToast, t]);
}
