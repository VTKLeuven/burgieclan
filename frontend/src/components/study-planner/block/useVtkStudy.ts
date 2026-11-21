'use client';

import { ApiClient } from '@/actions/api';
import { isErrorResponse } from '@/hooks/useApi';
import type { VtkStudy } from '@/types/entities';
import { convertToVtkStudy } from '@/utils/convertToEntity';
import { captureException } from '@sentry/nextjs';
import { useCallback, useEffect, useState } from 'react';

/** As often as the VTK app: vtk.be counts a session up to its last sign of life. */
const HEARTBEAT_MS = 60_000;

export type VtkStudyAction = 'start' | 'pause' | 'resume' | 'stop';

export interface VtkStudyHandle {
    /** null while loading, or when vtk.be could not be reached. */
    study: VtkStudy | null;
    busy: boolean;
    error: boolean;
    act: (action: VtkStudyAction) => Promise<void>;
}

/**
 * "Samen blokken" of the VTK app as the study timer (GET/POST /api/vtk_study): the same session,
 * kept on vtk.be. While a session runs and is not paused, a heartbeat goes out every minute, also
 * from a tab in the background (studying from a PDF in another tab is not a break); closing the
 * page stops it, and vtk.be then counts up to the last one, as with the app.
 */
export function useVtkStudy(): VtkStudyHandle {
    const [study, setStudy] = useState<VtkStudy | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const send = useCallback(async (method: 'GET' | 'POST', action?: string) => {
        try {
            const result = await ApiClient(method, '/api/vtk_study', action ? { action } : undefined);
            if (result === null || isErrorResponse(result)) {
                setError(true);
                return;
            }
            setError(false);
            setStudy(convertToVtkStudy(result));
        } catch (err) {
            captureException(err);
            setError(true);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void send('GET');
    }, [send]);

    const running = Boolean(study?.available && study.session && !study.session.paused);
    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => void send('POST', 'heartbeat'), HEARTBEAT_MS);
        return () => window.clearInterval(timer);
    }, [running, send]);

    const act = useCallback(
        async (action: VtkStudyAction) => {
            setBusy(true);
            await send('POST', action);
            setBusy(false);
        },
        [send],
    );

    return { study, busy, error, act };
}
