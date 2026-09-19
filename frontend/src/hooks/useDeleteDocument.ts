import { ApiClient } from '@/actions/api';
import { useToast } from '@/components/ui/Toast';
import { invalidateApiCache, isErrorResponse } from '@/hooks/useApi';
import { captureException } from '@sentry/nextjs';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Withdraws an upload that is still waiting on moderation. The backend only grants this to the
 * uploader of a document whose review has not finished, so a 403 here means a moderator got to
 * it first.
 *
 * Goes to ApiClient rather than `useApi().request` on purpose: that wrapper returns null both
 * for a 204 and for an error response, which is exactly the distinction this needs to pick a
 * toast. It therefore also has to drop the GET cache itself.
 */
export function useDeleteDocument() {
    const { showToast } = useToast();
    const { t } = useTranslation();

    return useCallback(async (documentId: number) => {
        const result = await ApiClient('DELETE', `/api/documents/${documentId}`);

        if (isErrorResponse(result)) {
            const message = result.error.detail ?? result.error.message ?? t('document.delete.toast.error');
            captureException(new Error(message), {
                extra: { context: 'Deleting a pending document', documentId },
            });
            showToast(t('document.delete.toast.error'), 'error');
            throw new Error(message);
        }

        invalidateApiCache();
        showToast(t('document.delete.toast.success'), 'success');
    }, [showToast, t]);
}
