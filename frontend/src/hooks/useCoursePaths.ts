import { useApi } from '@/hooks/useApi';
import type { CurriculumPath } from '@/types/entities';
import { convertToCurriculumPaths } from '@/utils/convertToEntity';
import { useEffect, useState } from 'react';

/**
 * Every place a course sits in the curriculum. Empty while loading and for a course no
 * programme reaches — callers render nothing rather than an empty frame in both cases.
 */
export function useCoursePaths(courseId?: number) {
    const { request } = useApi<unknown>();
    const [paths, setPaths] = useState<CurriculumPath[]>([]);
    const [loading, setLoading] = useState(courseId !== undefined);

    useEffect(() => {
        if (courseId === undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPaths([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        const fetchPaths = async () => {
            const result = await request('GET', `/api/courses/${courseId}/paths`);
            if (cancelled) return;

            setPaths(result ? convertToCurriculumPaths(result) : []);
            setLoading(false);
        };

        void fetchPaths();

        return () => {
            cancelled = true;
        };
    }, [courseId, request]);

    return { paths, loading };
}
