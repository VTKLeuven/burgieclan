import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { Tag, Course, DocumentCategory } from '@/types/entities';
import { convertToTag } from '@/utils/convertToEntity';

interface UseFetchTagsProps {
    course?: Course;
    category?: DocumentCategory;
}

interface UseFetchTagsResult {
    tags: Tag[];
    loading: boolean;
    error: string | null;
}

export const useFetchTags = ({ course, category }: UseFetchTagsProps = {}): UseFetchTagsResult => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { request, loading } = useApi();

    useEffect(() => {
        const fetchAllTags = async () => {
            try {
                setError(null);

                // Build the URL with appropriate filters
                let url = '/api/tags?pagination=false';

                // Add course filter if provided
                if (course?.id) {
                    url += `&course=/api/courses/${course.id}`;
                }

                // Add category filter if provided
                if (category?.id) {
                    url += `&category=/api/document_categories/${category.id}`;
                }

                const response = await request('GET', url);

                if (response && response['hydra:member']) {
                    setTags(response['hydra:member'].map(convertToTag));
                }
            } catch (err) {
                setError('Failed to fetch tags');
                console.error('Error fetching tags:', err);
            }
        };

        fetchAllTags();
    }, [course?.id, category?.id, request]);

    return { tags, loading, error };
};

export default useFetchTags;