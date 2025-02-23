import { ApiClient } from '@/actions/api';
import type { Course, Document, Module, Program } from '@/types/entities';
import { objectToCourse, objectToDocument, objectToModule, objectToProgram } from '@/utils/objectToTypeConvertor';
import debounce from 'lodash/debounce';
import { ApiError } from "next/dist/server/api-utils";
import { useCallback, useEffect, useRef, useState } from 'react';

type SearchResults = {
    courses: Course[];
    modules: Module[];
    programs: Program[];
    documents: Document[];
};

interface UseSearchOptions {
    query: string;
    entities?: Array<keyof SearchResults>;
    debounceMs?: number;
    minLength?: number;
}

export function useSearch(options: UseSearchOptions = { query: '' }) {
    const {
        query,
        entities,
        debounceMs = 300,
        minLength = 2
    } = options;

    const [items, setItems] = useState<SearchResults>({ courses: [], modules: [], programs: [], documents: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSearch = useCallback(async (query: string) => {
        setLoading(true);
        try {
            return await ApiClient('GET', `/api/search?searchText=${query}${entities ? `&entities=${entities.join('&entities=')}` : ''}`);
        } catch (err) {
            throw new ApiError(500, err.message);
        } finally {
            setLoading(false);
        }
    }, [entities]);

    /**
     * Remove all fields starting with '@' from the object
     * @param obj - The object to clean
     * @returns The cleaned object
     */
    function convertToObjects(obj: Record<string, any[]>): SearchResults {
        const items: SearchResults = { courses: [], modules: [], programs: [], documents: [] };
        obj['courses']?.forEach((course) => {
            items.courses.push(objectToCourse(course));
        });
        obj['modules']?.forEach((module) => {
            items.modules.push(objectToModule(module));
        });
        obj['programs']?.forEach((program) => {
            items.programs.push(objectToProgram(program));
        });
        obj['documents']?.forEach((document) => {
            items.documents.push(objectToDocument(document));
        });
        return items;
    }

    const cancelRef = useRef<(() => void) | undefined>();

    const debouncedSearch = useCallback(
        (searchQuery: string) => {
            const delayedSearch = debounce(async () => {
                if (searchQuery.length >= minLength) {
                    try {
                        const result = await fetchSearch(searchQuery);
                        setItems(convertToObjects(result));
                    } catch (err: any) {
                        setError(err);
                    }
                } else {
                    setItems({ courses: [], modules: [], programs: [], documents: [] });
                }
            }, debounceMs);

            cancelRef.current = delayedSearch.cancel;
            delayedSearch();
        },
        [minLength, fetchSearch, debounceMs]
    );

    useEffect(() => {
        debouncedSearch(query);
        return () => {
            cancelRef.current?.();
        };
    }, [query, debouncedSearch]);

    return {
        items,
        loading,
        error,
    };
}