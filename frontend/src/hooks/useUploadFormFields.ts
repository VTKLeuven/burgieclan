import { useState, useEffect, useCallback } from 'react';
import type { Category } from '@/types/entities';
import { ApiClient } from '@/actions/api';
import { useTranslation } from 'react-i18next';
import { convertToCategory } from '@/utils/convertToEntity';

export const useUploadFormFields = (isOpen: boolean) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [shouldShowLoading, setShouldShowLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    // Function to fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const categoryResponse = await ApiClient('GET', '/api/document_categories');
            if (categoryResponse.error) throw new Error(categoryResponse.error.message);
            setCategories(categoryResponse['hydra:member']?.map(convertToCategory) || []);
        } catch (err) {
            setError(t('form.errors.fetch_failed'));
            console.error('Failed to fetch categories:', err);
        }
    }, [t]);

    // Initial data fetch when form opens
    useEffect(() => {
        if (!isOpen) {
            setIsLoading(false);
            setShouldShowLoading(false);
            return;
        }

        let loadingTimeout: NodeJS.Timeout;

        const initiateFetch = async () => {
            setIsLoading(true);
            loadingTimeout = setTimeout(() => {
                setShouldShowLoading(true);
            }, 400);
        
            try {
                await Promise.all([
                    fetchCategories()
                ]);
            } finally {
                setIsLoading(false);
                setShouldShowLoading(false);
                clearTimeout(loadingTimeout);
            }
        };

        initiateFetch();

        return () => {
            clearTimeout(loadingTimeout);
            setIsLoading(false);
            setShouldShowLoading(false);
        };
    }, [isOpen, fetchCategories]);



    return {
        categories,
        isLoading: shouldShowLoading,
        error,
    };
};