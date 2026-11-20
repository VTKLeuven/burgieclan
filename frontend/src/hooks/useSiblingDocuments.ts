import { usePreloadedApi } from '@/components/ApiSeed';
import { HydraCollection, useApi } from '@/hooks/useApi';
import type { Document } from '@/types/entities';
import { apiEndpoints } from '@/utils/apiEndpoints';
import { convertToDocument } from '@/utils/convertToEntity';
import { useEffect, useMemo, useState } from 'react';

/**
 * The documents sitting in the same course and category as the one being read, in the order
 * the category page lists them: newest academic year first, name as the tiebreaker.
 *
 * Reading one of six exercise sessions used to mean going back to the folder for every next
 * file; with the neighbours in hand the reader can step straight from one to the next.
 */
export function useSiblingDocuments(courseId?: number, categoryId?: number) {
    const readPreloadedApi = usePreloadedApi();
    const { request } = useApi<HydraCollection<unknown>>();
    const url = courseId !== undefined && categoryId !== undefined
        ? apiEndpoints.siblingDocuments(courseId, categoryId)
        : null;
    // Kept with the folder it lists, so the previous document's neighbours never show for the next.
    const [loaded, setLoaded] = useState<{ url: string; documents: Document[] } | null>(null);

    // What the page brought along or an earlier visit left in the cache, until the request answers:
    // the "2 of 11" beside the title used to appear a moment after the title and push it onto a
    // second line.
    const preloaded = useMemo(() => {
        if (!url) return null;
        const members = (readPreloadedApi(url) as HydraCollection<unknown> | undefined)?.['hydra:member'];
        return Array.isArray(members) ? members.map(convertToDocument) : null;
    }, [url, readPreloadedApi]);

    useEffect(() => {
        if (!url) return;

        let cancelled = false;
        void (async () => {
            const response = await request('GET', url);
            if (cancelled) return;
            const members = response?.['hydra:member'];
            setLoaded({ url, documents: Array.isArray(members) ? members.map(convertToDocument) : [] });
        })();

        return () => {
            cancelled = true;
        };
    }, [url, request]);

    const current = loaded && loaded.url === url ? loaded.documents : null;
    return {
        documents: current ?? preloaded ?? [],
        loading: url !== null && current === null && preloaded === null,
    };
}
