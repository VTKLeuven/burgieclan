import { HydraCollection, useApi } from '@/hooks/useApi';
import type { Course, DocumentCategory } from '@/types/entities';
import { convertToCourse, convertToDocumentCategory } from '@/utils/convertToEntity';
import { captureException } from "@sentry/nextjs";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useFormFields = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t, i18n } = useTranslation();
    const { request } = useApi<HydraCollection<unknown>>();

    const fetchData = useCallback(async () => {
        try {
            const lang = i18n.language;
            const [courseResponse, categoryResponse] = await Promise.all([
                request('GET', `/api/courses?pagination=false`),
                request('GET', `/api/document_categories?pagination=false&lang=${lang}`)
            ]);

            if (!courseResponse || courseResponse.error) {
                throw new Error(courseResponse?.error?.message);
            }

            if (!categoryResponse || categoryResponse.error) {
                throw new Error(categoryResponse?.error?.message);
            }

            setCourses(courseResponse['hydra:member']?.map(convertToCourse) || []);
            setCategories(categoryResponse['hydra:member']?.map(convertToDocumentCategory) || []);
        } catch (err) {
            setError(t('form.errors.fetch_failed'));
            captureException(
                err instanceof Error ? err : new Error(String(err)),
                {
                    extra: { context: "Failed to fetch form data" },
                }
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
        courses,
        categories,
        isLoading,
        error
    };
};