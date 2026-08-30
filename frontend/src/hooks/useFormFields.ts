import { HydraCollection, useApi } from '@/hooks/useApi';
import type { DocumentCategory } from '@/types/entities';
import { convertToDocumentCategory } from '@/utils/convertToEntity';
import { captureException } from '@sentry/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useFormFields = () => {
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t, i18n } = useTranslation();
    const { request } = useApi<HydraCollection<unknown> | unknown[]>();

    const fetchData = useCallback(async () => {
        try {
            const lang = i18n.language;
            const categoryResponse = await request(
                'GET',
                `/api/document_categories?pagination=false&lang=${lang}`,
            );

            if (!categoryResponse || (typeof categoryResponse === 'object' && 'error' in categoryResponse && categoryResponse.error)) {
                throw new Error('Failed to fetch document categories');
            }

            const members = Array.isArray(categoryResponse)
                ? categoryResponse
                : (categoryResponse as HydraCollection<unknown>)['hydra:member'];

            setCategories(Array.isArray(members) ? members.map(convertToDocumentCategory) : []);
        } catch (err) {
            setError(t('form.errors.fetch_failed'));
            captureException(
                err instanceof Error ? err : new Error(String(err)),
                {
                    extra: { context: 'Failed to fetch form data' },
                },
            );
        } finally {
            setIsLoading(false);
        }
    }, [t, i18n.language, request]);

    useEffect(() => {
        const initiateFetch = async () => {
            setIsLoading(true);
            await fetchData();
        };
        initiateFetch();
    }, [fetchData]);

    return {
        categories,
        isLoading,
        error,
    };
};
