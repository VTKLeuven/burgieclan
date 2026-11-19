'use client';

import { ApiClient } from '@/actions/api';
import { isErrorResponse } from '@/hooks/useApi';
import type { StudyPlanner, StudyPlannerOperation } from '@/types/entities';
import { convertToStudyPlanner } from '@/utils/convertToEntity';
import { captureException } from '@sentry/nextjs';
import { useCallback, useEffect, useState } from 'react';

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
    const [state, setState] = useState<StudyPlanner | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await ApiClient('GET', '/api/study_planner');
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
    }, []);

    const send = useCallback(async (method: string, endpoint: string, body?: unknown): Promise<boolean> => {
        setBusy(true);
        setError(null);
        try {
            const result = await ApiClient(method, endpoint, body);
            if (isErrorResponse(result)) {
                setError(message(result));
                return false;
            }
            if (result === null) {
                // DELETE: unsubscribed.
                setState((s) => (s ? { ...s, subscribed: false, icsUrl: null, feedPath: null, events: [], items: [], rules: [], subjects: [], vtkEvents: [] } : s));
            } else {
                setState(convertToStudyPlanner(result));
            }
            return true;
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
        run: useCallback((op: StudyPlannerOperation) => send('POST', '/api/study_planner/operations', op), [send]),
        subscribe: useCallback((icsUrl: string) => send('POST', '/api/study_planner/subscription', { icsUrl }), [send]),
        unsubscribe: useCallback(() => send('DELETE', '/api/study_planner'), [send]),
        sync: useCallback(() => send('POST', '/api/study_planner/sync', {}), [send]),
        rotateFeed: useCallback(() => send('POST', '/api/study_planner/feed_token', {}), [send]),
    };
}
