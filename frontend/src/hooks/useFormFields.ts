// hooks/useFormFields.ts
import { useState, useEffect, useCallback } from 'react';
import { Course, Category } from '@/types/upload';
import { ApiClient } from '@/actions/api';
import { useTranslation } from 'react-i18next';

export const useFormFields = (isOpen: boolean) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [shouldShowLoading, setShouldShowLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    const fetchData = useCallback(async () => {
        try {
            const [courseResponse, categoryResponse] = await Promise.all([
                ApiClient('GET', `/api/courses`),
                ApiClient('GET', `/api/document_categories`)
            ]);

            if (courseResponse.error) throw new Error(courseResponse.error.message);
            if (categoryResponse.error) throw new Error(categoryResponse.error.message);

            setCourses(courseResponse['hydra:member']?.map((course: any) => ({
                id: course['@id'],
                name: course.name
            })) || []);

            setCategories(categoryResponse['hydra:member']?.map((category: any) => ({
                id: category['@id'],
                name: category.name
            })) || []);
        } catch (err) {
            setError(t('form.errors.fetch_failed'));
            console.error('Failed to fetch form data:', err);
        } finally {
            setIsLoading(false);
            setShouldShowLoading(false);
        }
    }, [t]); // Add t to dependency array

    useEffect(() => {
        if (!isOpen) {
            setIsLoading(false);
            setShouldShowLoading(false);
            return;
        }

        let loadingTimeout: NodeJS.Timeout;

        const initiateFetch = async () => {
            setIsLoading(true);

            // Only show loading state if it takes longer than 400ms
            loadingTimeout = setTimeout(() => {
                setShouldShowLoading(true);
            }, 400);

            await fetchData();
        };

        initiateFetch();

        return () => {
            clearTimeout(loadingTimeout);
            setIsLoading(false);
            setShouldShowLoading(false);
        };
    }, [isOpen, fetchData]);

    return {
        courses,
        categories,
        isLoading: shouldShowLoading, // Only expose the delayed loading state
        error
    };
};