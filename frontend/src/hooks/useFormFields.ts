import { useApi } from '@/hooks/useApi';
import type { CommentCategory, Course } from '@/types/entities';
import { convertToCommentCategory, convertToCourse } from '@/utils/convertToEntity';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useFormFields = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<CommentCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();
    const { request } = useApi();

    const fetchData = useCallback(async () => {
        try {
            const [courseResponse, categoryResponse] = await Promise.all([
                request('GET', `/api/courses?pagination=false`),
                request('GET', `/api/document_categories?pagination=false`)
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
            setIsLoading(false);
        }
    }, [t, request]);

    useEffect(() => {
        const initiateFetch = async () => {
            setIsLoading(true);
            await fetchData();
            await new Promise(resolve => setTimeout(resolve, 4000));
            setIsLoading(false);
        };
        initiateFetch();
    }, [fetchData]);

    return {
        courses,
        categories,
        isLoading,
        error
    };
};