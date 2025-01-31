import { useState, useEffect } from 'react';
import { Document } from '@/types/entities';
import { useUser } from '@/components/UserContext';
import { ApiClient } from '@/actions/api';
import { ApiError } from '@/utils/error/apiError';
import { convertToDocument } from '@/utils/convertToEntity';

const useRetrieveDocuments = (page: number, itemsPerPage: number = 30) => {
    const { user } = useUser();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [totalItems, setTotalItems] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocuments = async (userId?: number) => {
            try {
                const response = await ApiClient('GET', `/api/documents?creator=${encodeURIComponent(`/api/users/${userId}`)}&page=${page}&itemsPerPage=${itemsPerPage}`);

                if (response?.error) {
                    throw new ApiError(response.error.message, response.error.status);
                }

                const documents: Document[] = response['hydra:member'].map(convertToDocument);
                const totalItems: number = response['hydra:totalItems'];
                setDocuments(documents);
                setTotalItems(totalItems);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDocuments(user.id);
        }
    }, [user, page, itemsPerPage]);

    return { documents, totalItems, loading, error };
};

export default useRetrieveDocuments;