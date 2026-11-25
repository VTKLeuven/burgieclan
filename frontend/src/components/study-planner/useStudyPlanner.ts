'use client';

import { ApiClient } from '@/actions/api';
import { usePreloadedApi } from '@/components/ApiSeed';
import { apiGet, isErrorResponse } from '@/hooks/useApi';
import { apiEndpoints } from '@/utils/apiEndpoints';
import type { StudyPlanner, StudyPlannerOperation } from '@/types/entities';
import { convertToStudyPlanner } from '@/utils/convertToEntity';
import { captureException } from '@sentry/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface PlannerApi {
    state: StudyPlanner;
    /** Sends one change; resolves to true when it was saved. */
    run: (op: StudyPlannerOperation) => Promise<boolean>;
    busy: boolean;
    error: string | null;
}

export interface StudyPlannerHandle {
    /** null while loading, or when loading failed. */
    state: StudyPlanner | null;
    loading: boolean;
    loadError: string | null;
    busy: boolean;
    /** The last failed change, in the backend's words. */
    error: string | null;
    clearError: () => void;
    run: (op: StudyPlannerOperation) => Promise<boolean>;
    subscribe: (icsUrl: string) => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
    sync: () => Promise<boolean>;
    /** Adds the older sessions in a calendar file; resolves to how many, or null when it failed. */
    importIcs: (ics: string) => Promise<number | null>;
    rotateFeed: () => Promise<boolean>;
}

function message(result: unknown): string {
    if (isErrorResponse(result)) {
        return result.error.detail || result.error.message || 'Unexpected error';
    }
    return 'Unexpected error';
}

/**
 * The reader's study planner (GET /api/study_planner), kept up to date with the answer of every
 * change: each POST answers with the whole planner, so there is never a second request.
 */
export function useStudyPlanner(): StudyPlannerHandle {
    const readPreloadedApi = usePreloadedApi();
    // The page fetches the planner while it renders (see planner/page.tsx), so the timetable is
    // there on the first frame instead of after a skeleton.
    const [initial] = useState(() => {
        const preloaded = readPreloadedApi(apiEndpoints.studyPlanner());
        return preloaded && !isErrorResponse(preloaded) ? convertToStudyPlanner(preloaded) : null;
    });
    const [state, setState] = useState<StudyPlanner | null>(initial);
    const [loading, setLoading] = useState(initial === null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initial !== null) return;

        let cancelled = false;
        (async () => {
            try {
                const result = await apiGet(apiEndpoints.studyPlanner());
                if (cancelled) return;
                if (result === null || isErrorResponse(result)) {
                    setLoadError(message(result));
                } else {
                    setState(convertToStudyPlanner(result));
                }
            } catch (err) {
                if (!cancelled) {
                    captureException(err);
                    setLoadError(err instanceof Error ? err.message : String(err));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [initial]);

    // The planner as last received, so importIcs can count what an import added.
    const latest = useRef(state);
    useEffect(() => {
        latest.current = state;
    }, [state]);

    const send = useCallback(async (method: string, endpoint: string, body?: unknown): Promise<StudyPlanner | null | false> => {
        setBusy(true);
        setError(null);
        try {
            const result = await ApiClient(method, endpoint, body);
            if (isErrorResponse(result)) {
                setError(message(result));
                return false;
            }
            if (result === null) {
                // DELETE: unsubscribed. The exam period does not depend on the timetable and stays.
                setState((s) => (s ? { ...s, subscribed: false, icsUrl: null, feedPath: null, events: [], items: [], rules: [], subjects: [], vtkEvents: [] } : s));
                return null;
            }
            const planner = convertToStudyPlanner(result);
            setState(planner);
            return planner;
        } catch (err) {
            captureException(err);
            setError(err instanceof Error ? err.message : String(err));
            return false;
        } finally {
            setBusy(false);
        }
    }, []);

    return {
        state,
        loading,
        loadError,
        busy,
        error,
        clearError: useCallback(() => setError(null), []),
        run: useCallback(async (op: StudyPlannerOperation) => (await send('POST', '/api/study_planner/operations', op)) !== false, [send]),
        subscribe: useCallback(async (icsUrl: string) => (await send('POST', '/api/study_planner/subscription', { icsUrl })) !== false, [send]),
        unsubscribe: useCallback(async () => (await send('DELETE', '/api/study_planner')) !== false, [send]),
        sync: useCallback(async () => (await send('POST', '/api/study_planner/sync', {})) !== false, [send]),
        importIcs: useCallback(async (ics: string) => {
            const before = latest.current?.events.length ?? 0;
            const planner = await send('POST', '/api/study_planner/import', { ics });
            return planner ? Math.max(0, planner.events.length - before) : null;
        }, [send]),
        rotateFeed: useCallback(async () => (await send('POST', '/api/study_planner/feed_token', {})) !== false, [send]),
    };
}
