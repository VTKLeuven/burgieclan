import { useState, useEffect, useCallback } from 'react';
import type { CommentCategory, Course } from '@/types/entities';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import { convertToCommentCategory, convertToCourse } from '@/utils/convertToEntity';

export const useFormFields = (isOpen: boolean) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<CommentCategory[]>([]);
    const [shouldShowLoading, setShouldShowLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();
    const { request, loading: isLoading } = useApi();

    const fetchData = useCallback(async () => {
        try {
            const [courseResponse, categoryResponse] = await Promise.all([
                request('GET', `/api/courses`),
                request('GET', `/api/document_categories`)
            ]);

            if (!courseResponse || courseResponse.error) {
                throw new Error(courseResponse?.error?.message);
            }

            if (!categoryResponse || categoryResponse.error) {
                throw new Error(categoryResponse?.error?.message);
            }

            setCourses(courseResponse['hydra:member']?.map(convertToCourse) || []);

            setCategories(categoryResponse['hydra:member']?.map(convertToCommentCategory) || []);
        } catch (err) {
            setError(t('form.errors.fetch_failed'));
            console.error('Failed to fetch form data:', err);
        } finally {
            setShouldShowLoading(false);
        }
    }, [t, request]);

    useEffect(() => {
        if (!isOpen) {
            setShouldShowLoading(false);
            return;
        }

        let loadingTimeout: NodeJS.Timeout;

        const initiateFetch = async () => {
            // Only show loading state if it takes longer than 400ms
            loadingTimeout = setTimeout(() => {
                setShouldShowLoading(true);
            }, 400);

            await fetchData();
        };

        initiateFetch();

        return () => {
            clearTimeout(loadingTimeout);
            setShouldShowLoading(false);
        };
    }, [isOpen, fetchData]);

    return {
        courses,
        categories,
        isLoading: shouldShowLoading && isLoading, // Only expose the delayed loading state
        error
    };
};