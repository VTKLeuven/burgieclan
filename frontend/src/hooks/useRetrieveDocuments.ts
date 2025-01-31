import { useState, useEffect } from 'react';
import { Document } from '@/types/entities';
import { useUser } from '@/components/UserContext';
import { ApiClient } from '@/actions/api';
import { ApiError } from '@/utils/error/apiError';

const useRetrieveDocuments = () => {
    const { user } = useUser();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocuments = async (userId?: number) => {
            try {
                const response = await ApiClient('GET', `/api/documents?creator=${encodeURIComponent(`/api/users/${userId}`)}`);

                if (response?.error) {
                    throw new ApiError(response.error.message, response.error.status);
                }

                const documents: Document[] = response['hydra:member'].map((doc: any) => ({
                    id: parseInt(doc['@id'].split('/').pop()),
                    createDate: doc.createdAt,
                    updateDate: doc.updatedAt,
                    name: doc.name,
                    course: doc.course,
                    category: doc.category,
                    underReview: doc.under_review,
                    creator: doc.creator,
                    contentUrl: doc.contentUrl
                }));
                setDocuments(documents);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDocuments(user.id);
        }
    }, [user]);

    return { documents, loading, error };
};

export default useRetrieveDocuments;