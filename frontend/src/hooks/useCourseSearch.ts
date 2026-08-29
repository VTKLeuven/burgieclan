'use client';

import { useApi } from '@/hooks/useApi';
import type { Course } from '@/types/entities';
import { convertToCourse } from '@/utils/convertToEntity';
import { useEffect, useState } from 'react';

type SearchApiResponse = {
    courses?: unknown[];
};

export const COURSE_SEARCH_MIN_LENGTH = 3;

type CourseSearchState = {
    query: string;
    courses: Course[];
    status: 'idle' | 'loading' | 'done';
};

/**
 * Search courses through the global search endpoint instead of downloading the full catalogue.
 * This deliberately shares the website search semantics for translated names and course codes.
 */
export function useCourseSearch(query: string) {
    const [search, setSearch] = useState<CourseSearchState>({
        query: '',
        courses: [],
        status: 'idle',
    });
    const { request, error } = useApi<SearchApiResponse>();

    useEffect(() => {
        const searchQuery = query.trim();

        if (searchQuery.length < COURSE_SEARCH_MIN_LENGTH) {
            return;
        }

        let active = true;

        const timer = window.setTimeout(async () => {
            setSearch({ query: searchQuery, courses: [], status: 'loading' });
            const result = await request(
                'GET',
                `/api/search?searchText=${encodeURIComponent(searchQuery)}`,
            );

            if (!active) return;

            setSearch({
                query: searchQuery,
                courses: result?.courses?.map(convertToCourse) ?? [],
                status: 'done',
            });
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [query, request]);

    const searchQuery = query.trim();
    const meetsMinimumLength = searchQuery.length >= COURSE_SEARCH_MIN_LENGTH;
    const isCurrentSearch = search.query === searchQuery;

    return {
        // Keep the last result available while the input is closed so the selected option
        // retains its label. The combobox itself hides these until three characters are typed.
        courses: meetsMinimumLength
            ? (isCurrentSearch && search.status === 'done' ? search.courses : [])
            : search.courses,
        isSearching: meetsMinimumLength && (!isCurrentSearch || search.status !== 'done'),
        error: isCurrentSearch ? error : null,
    };
}
