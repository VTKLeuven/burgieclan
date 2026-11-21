'use client';

import { ApiClient } from '@/actions/api';
import { usePreloadedApi } from '@/components/ApiSeed';
import { invalidateApiCache, isErrorResponse, useApi } from '@/hooks/useApi';
import type { ExchangeCourse, ExchangeDestinationDetail, ExchangeOverview, ExchangeTopic } from '@/types/entities';
import { apiEndpoints } from '@/utils/apiEndpoints';
import { convertToExchangeDestinationDetail, convertToExchangeOverview } from '@/utils/convertToEntity';
import { useCallback, useEffect, useState } from 'react';

/** Sent after a report was shared, deleted or marked, so every exchange read on the page asks again. */
const EXCHANGE_CHANGED_EVENT = 'burgieclan:exchange-changed';
const notifyChanged = () => window.dispatchEvent(new Event(EXCHANGE_CHANGED_EVENT));

/**
 * One exchange read: the page's seed first, then a fresh fetch, and again after any change made
 * here. `failed` is set when the first fetch fails and there is nothing to show.
 */
function useExchangeRead<T>(endpoint: string | null, convert: (value: unknown) => T) {
    const readPreloadedApi = usePreloadedApi();
    const { request } = useApi();
    const [result, setResult] = useState<{ endpoint: string; value: T } | null>(() => {
        const preloaded = endpoint ? readPreloadedApi(endpoint) : undefined;
        return endpoint && preloaded ? { endpoint, value: convert(preloaded) } : null;
    });
    const [failed, setFailed] = useState(false);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const onChange = () => setVersion((current) => current + 1);
        window.addEventListener(EXCHANGE_CHANGED_EVENT, onChange);
        return () => window.removeEventListener(EXCHANGE_CHANGED_EVENT, onChange);
    }, []);

    useEffect(() => {
        if (!endpoint) return;
        let cancelled = false;
        request('GET', endpoint).then((data) => {
            if (cancelled) return;
            if (data) {
                setResult({ endpoint, value: convert(data) });
                setFailed(false);
            } else {
                setFailed(true);
            }
        });
        return () => { cancelled = true; };
    }, [endpoint, request, version, convert]);

    const value = result && result.endpoint === endpoint ? result.value : null;
    return { value, failed: failed && value === null };
}

/** Every destination and the latest reports; `enabled` false skips the fetch (a closed dialog). */
export function useExchangeOverview(enabled = true): { overview: ExchangeOverview | null; failed: boolean } {
    const { value, failed } = useExchangeRead(enabled ? apiEndpoints.exchange() : null, convertToExchangeOverview);
    return { overview: value, failed };
}

export function useExchangeDestination(id: string | null): { detail: ExchangeDestinationDetail | null; failed: boolean } {
    const { value, failed } = useExchangeRead(id ? apiEndpoints.exchangeDestination(id) : null, convertToExchangeDestinationDetail);
    return { detail: value, failed };
}

export interface ExchangeReportInput {
    destinationId?: number;
    newDestination?: { name: string; city: string; country: string };
    academicYear: string;
    phase: string;
    period: string;
    program: string;
    sections: Partial<Record<ExchangeTopic, string>>;
    courses: ExchangeCourse[];
    contactable: boolean;
    showName: boolean;
}

/** The backend's reason, in English; shown under the form when the page has no better words. */
export class ExchangeError extends Error {
    constructor(readonly detail: string, readonly status: number) {
        super(detail);
        this.name = 'ExchangeError';
    }
}

const throwIfError = (result: unknown) => {
    if (isErrorResponse(result)) {
        throw new ExchangeError(result.error.detail ?? result.error.message ?? '', result.error.status ?? 500);
    }
};

/**
 * The changes to exchange reports. They go to ApiClient rather than `useApi().request`, which
 * returns null both for a 204 and for an error, so they drop the GET cache themselves.
 */
export function useExchangeActions() {
    const share = useCallback(async (input: ExchangeReportInput): Promise<{ id: number; destinationId: number }> => {
        const result = await ApiClient('POST', '/api/exchange/reports', input);
        throwIfError(result);
        invalidateApiCache();
        notifyChanged();
        const data = (result ?? {}) as { id?: unknown; destinationId?: unknown };
        return { id: Number(data.id), destinationId: Number(data.destinationId) };
    }, []);

    const remove = useCallback(async (reportId: number): Promise<void> => {
        throwIfError(await ApiClient('DELETE', `/api/exchange/reports/${reportId}`));
        invalidateApiCache();
        notifyChanged();
    }, []);

    const markHelpful = useCallback(async (reportId: number, part: string, helpful: boolean): Promise<void> => {
        throwIfError(await ApiClient('PUT', `/api/exchange/reports/${reportId}/helpful`, { part, helpful }));
        invalidateApiCache();
    }, []);

    const suggestPrograms = useCallback(async (destinationId: number, add: string[], remove: string[], note: string): Promise<void> => {
        throwIfError(await ApiClient('POST', `/api/exchange/destinations/${destinationId}/program_suggestions`, { add, remove, note }));
        invalidateApiCache();
        notifyChanged();
    }, []);

    return { share, remove, markHelpful, suggestPrograms };
}
