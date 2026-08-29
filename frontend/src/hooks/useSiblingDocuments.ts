import { HydraCollection, useApi } from '@/hooks/useApi';
import type { Document } from '@/types/entities';
import { convertToDocument } from '@/utils/convertToEntity';
import { useEffect, useState } from 'react';

/**
 * A category never holds this many documents in practice, but a course with a decade of
 * scanned exercise sessions can come close. Past the cap the neighbours are simply not
 * offered rather than paged through - the full list stays one click away either way.
 */
const MAX_SIBLINGS = 200;

/**
 * The documents sitting in the same course and category as the one being read, in the order
 * the category page lists them: newest academic year first, name as the tiebreaker.
 *
 * Reading one of six exercise sessions used to mean going back to the folder for every next
 * file; with the neighbours in hand the reader can step straight from one to the next.
 */
export function useSiblingDocuments(courseId?: number, categoryId?: number) {
    const { request } = useApi<HydraCollection<unknown>>();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (courseId === undefined || categoryId === undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDocuments([]);
            return;
        }

        let cancelled = false;
        setLoading(true);

        const fetchSiblings = async () => {
            const url = `/api/documents?page=1&itemsPerPage=${MAX_SIBLINGS}`
                + '&includeFileMetadata=false'
                + `&course=${encodeURIComponent(`/api/courses/${courseId}`)}`
                + `&category=${encodeURIComponent(`/api/document_categories/${categoryId}`)}`
                + '&order[year]=desc&order[name]=asc';

            const response = await request('GET', url);
            if (cancelled) return;

            const members = response?.['hydra:member'];
            setDocuments(Array.isArray(members) ? members.map(convertToDocument) : []);
            setLoading(false);
        };

        void fetchSiblings();

        return () => {
            cancelled = true;
        };
    }, [courseId, categoryId, request]);

    return { documents, loading };
}
