import { useState, useEffect } from 'react';
import { Document, type Course, type DocumentCategory } from '@/types/entities';
import { useUser } from '@/components/UserContext';
import { useApi } from '@/hooks/useApi';
import { ApiError } from '@/utils/error/apiError';
import { convertToDocument } from '@/utils/convertToEntity';

const useRetrieveDocuments = (
    page: number, 
    itemsPerPage: number = 30, 
    course?: Course, 
    category?: DocumentCategory,
    onlyUserDocuments: boolean = true,
) => {
    const { user } = useUser();
    const { request, loading } = useApi();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [totalItems, setTotalItems] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    console.log('useRetrieveDocuments', { page, itemsPerPage, course, category, onlyUserDocuments });

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                setError(null);
                let url = `/api/documents?page=${page}&itemsPerPage=${itemsPerPage}`;
                
                // Filter by user if onlyUserDocuments is true
                if (onlyUserDocuments && user) {
                    url += `&creator=${encodeURIComponent(`/api/users/${user.id}`)}`;
                }
                
                // Add course filter if provided
                if (course) {
                    url += `&course=${encodeURIComponent('/api/courses/' + course.id)}`;
                }
                
                // Add category filter if provided
                if (category) {
                    url += `&category=${encodeURIComponent('/api/document_categories/' + category.id)}`;
                }
                
                const response = await request('GET', url);

                if (!response) {
                    throw new ApiError('Failed to fetch documents', 500);
                }

                if (response.error) {
                    throw new ApiError(response.error.message, response.error.status);
                }

                const documents: Document[] = response['hydra:member'].map(convertToDocument);
                const totalItems: number = response['hydra:totalItems'];
                setDocuments(documents);
                setTotalItems(totalItems);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchDocuments();
    }, [user, page, itemsPerPage, course, category, onlyUserDocuments, request]);

    return { documents, totalItems, loading, error };
};

export default useRetrieveDocuments;