// hooks/useFormFields.ts
import { useState, useEffect } from 'react';
import { Course, Category } from '@/types/upload';
import { ApiClient } from '@/actions/api';

export const useFormFields = (isOpen: boolean) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [shouldShowLoading, setShouldShowLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);

        // Only show loading state if it takes longer than 400ms
        const loadingTimeout = setTimeout(() => {
            if (isLoading) {
                setShouldShowLoading(true);
            }
        }, 400);

        const fetchData = async () => {
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
                setError('Failed to load form data. Please try again.');
                console.error('Failed to fetch form data:', err);
            } finally {
                setIsLoading(false);
                setShouldShowLoading(false);
            }
        };

        fetchData();

        return () => {
            clearTimeout(loadingTimeout);
            setIsLoading(false);
            setShouldShowLoading(false);
        };
    }, [isOpen]);

    return {
        courses,
        categories,
        isLoading: shouldShowLoading, // Only expose the delayed loading state
        error
    };
};