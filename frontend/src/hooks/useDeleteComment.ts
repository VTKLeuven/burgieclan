import { ApiClient } from '@/actions/api';
import { useToast } from '@/components/ui/Toast';
import { invalidateApiCache, isErrorResponse } from '@/hooks/useApi';
import { captureException } from '@sentry/nextjs';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Deletes one of the reader's own course comments.
 *
 * Goes to ApiClient rather than `useApi().request` on purpose: that wrapper returns null both
 * for a 204 and for an error response, so a refused delete used to read as a success and the
 * comment vanished from the page while it stayed in the database. It therefore also has to
 * drop the GET cache itself.
 */
export function useDeleteComment() {
    const { showToast } = useToast();
    const { t } = useTranslation();

    return useCallback(async (commentId: number) => {
        const result = await ApiClient('DELETE', `/api/course_comments/${commentId}`);

        if (isErrorResponse(result)) {
            const message = result.error.detail ?? result.error.message ?? t('course-page.comments.toast.delete-error');
            captureException(new Error(message), {
                extra: { context: 'Deleting a course comment', commentId },
            });
            showToast(t('course-page.comments.toast.delete-error'), 'error');
            throw new Error(message);
        }

        invalidateApiCache();
        showToast(t('course-page.comments.toast.delete-success'), 'success');
    }, [showToast, t]);
}
