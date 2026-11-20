'use client';

import { ApiClient } from '@/actions/api';
import { usePreloadedApi } from '@/components/ApiSeed';
import { useUser } from '@/components/UserContext';
import { invalidateApiCache, isErrorResponse, useApi } from '@/hooks/useApi';
import type { VtkPolls } from '@/types/entities';
import { apiEndpoints } from '@/utils/apiEndpoints';
import { convertToVtkPolls } from '@/utils/convertToEntity';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Sent after answers were stored, so the sidebar and the homepage ask again. */
const POLLS_CHANGED_EVENT = 'burgieclan:vtk-polls-changed';

/**
 * The POC polls of the VTK website for the signed-in member, or null until known (and for
 * visitors). Fetching fails quietly: the polls are a nudge, and a vtk.be that does not answer just
 * means no tab and no card, not an error on every page.
 */
export function useVtkPolls(): VtkPolls | null {
    const { user } = useUser();
    const { i18n } = useTranslation();
    const endpoint = apiEndpoints.vtkPolls(i18n.language);
    const readPreloadedApi = usePreloadedApi();
    const { request } = useApi();

    // Kept with the endpoint it answers, so a language switch never shows the other language's.
    const [result, setResult] = useState<{ endpoint: string; polls: VtkPolls } | null>(() => {
        const preloaded = readPreloadedApi(endpoint);
        return preloaded ? { endpoint, polls: convertToVtkPolls(preloaded) } : null;
    });
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const onChange = () => setVersion((current) => current + 1);
        window.addEventListener(POLLS_CHANGED_EVENT, onChange);
        return () => window.removeEventListener(POLLS_CHANGED_EVENT, onChange);
    }, []);

    const userId = user?.id;
    useEffect(() => {
        if (userId === undefined) return;

        let cancelled = false;
        request('GET', endpoint).then((data) => {
            if (!cancelled && data) {
                setResult({ endpoint, polls: convertToVtkPolls(data) });
            }
        });
        return () => { cancelled = true; };
    }, [userId, endpoint, request, version]);

    if (!user) return null;
    return result?.endpoint === endpoint ? result.polls : null;
}

/** Why vtk.be refused, as a key under `polls.errors`; unknown reasons fall back to `failed`. */
const KNOWN_REASONS = ['POLL_CLOSED', 'POLL_NOT_YOURS', 'POLL_INVALID', 'POLL_TOO_LONG', 'POLL_EMPTY'];

export class VtkPollAnswerError extends Error {
    constructor(readonly reason: string) {
        super(reason);
        this.name = 'VtkPollAnswerError';
    }
}

/**
 * Sends one member's answers to one poll; sending again replaces what they answered before.
 * Throws a VtkPollAnswerError with the reason when it was not stored.
 *
 * Goes to ApiClient rather than `useApi().request`: that wrapper returns null both for the 204 of
 * a success and for an error, and this needs to tell them apart. It therefore also drops the GET
 * cache itself, and tells every useVtkPolls on the page to ask again.
 */
export function useAnswerVtkPoll() {
    return useCallback(async (pollId: string, answers: Record<string, string>) => {
        const result = await ApiClient('POST', '/api/vtk_polls/answers', { pollId, answers });

        if (isErrorResponse(result)) {
            const reason = result.error.reason;
            throw new VtkPollAnswerError(reason && KNOWN_REASONS.includes(reason) ? reason : 'failed');
        }

        invalidateApiCache();
        window.dispatchEvent(new Event(POLLS_CHANGED_EVENT));
    }, []);
}
