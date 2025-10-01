import { useApi } from '@/hooks/useApi';
import type { DocumentCategory } from '@/types/entities';
import { convertToDocumentCategory } from '@/utils/convertToEntity';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useUploadFormFields = (isOpen: boolean) => {
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const [shouldShowLoading, setShouldShowLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();
    const { request } = useApi();

    // Function to fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            setError(null);
            const categoryResponse = await request('GET', '/api/document_categories');

            if (categoryResponse && categoryResponse['hydra:member']) {
                setCategories(categoryResponse['hydra:member'].map(convertToDocumentCategory));
            }
        } catch (err) {
            setError(t('form.errors.fetch_failed'));
            console.error('Failed to fetch categories:', err);
        }
    }, [request, t]);

    // Initial data fetch when form opens
    useEffect(() => {
        if (!isOpen) {
            setShouldShowLoading(false);
            return;
        }

        let loadingTimeout: NodeJS.Timeout;

        const initiateFetch = async () => {
            loadingTimeout = setTimeout(() => {
                setShouldShowLoading(true);
            }, 400);

            try {
                await fetchCategories();
            } finally {
                setShouldShowLoading(false);
                clearTimeout(loadingTimeout);
            }
        };

        initiateFetch();

        return () => {
            clearTimeout(loadingTimeout);
            setShouldShowLoading(false);
        };
    }, [isOpen, fetchCategories]);



    return {
        categories,
        isLoading: shouldShowLoading,
        error,
    };
};