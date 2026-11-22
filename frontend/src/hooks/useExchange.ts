'use client';

import { ApiClient } from '@/actions/api';
import { usePreloadedApi } from '@/components/ApiSeed';
import { apiGet, invalidateApiCache, isErrorResponse, useApi } from '@/hooks/useApi';
import type { AthensCourseDetail, AthensOverview, AthensTopic, ExchangeCourse, ExchangeDestinationDetail, ExchangeOverview, ExchangeTopic } from '@/types/entities';
import { apiEndpoints } from '@/utils/apiEndpoints';
import { convertToAthensCourseDetail, convertToAthensOverview, convertToExchangeDestinationDetail, convertToExchangeOverview } from '@/utils/convertToEntity';
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

/** ExchangeReportFileStore in the backend: what a report may carry. */
export const EXCHANGE_FILE_EXTENSIONS = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'odt', 'ods', 'png', 'jpg', 'jpeg'];
export const MAX_EXCHANGE_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_EXCHANGE_FILES = 5;

/** The backend's reason, in English; shown under the form when the page has no better words. */
export class ExchangeError extends Error {
    /** For refused files: "size", "type", "count" or "failed". */
    constructor(readonly detail: string, readonly status: number, readonly reason?: string) {
        super(detail);
        this.name = 'ExchangeError';
    }
}

const throwIfError = (result: unknown) => {
    if (isErrorResponse(result)) {
        const reason = typeof result.error.reason === 'string' ? result.error.reason : undefined;
        throw new ExchangeError(result.error.detail ?? result.error.message ?? '', result.error.status ?? 500, reason);
    }
};

/**
 * The changes to exchange reports. They go to ApiClient rather than `useApi().request`, which
 * returns null both for a 204 and for an error, so they drop the GET cache themselves.
 */
export function useExchangeActions() {
    const share = useCallback(async (input: ExchangeReportInput, files: File[] = []): Promise<{ id: number; destinationId: number }> => {
        // With files, as multipart: the report as JSON in "report", the files as "files[]".
        let body: ExchangeReportInput | FormData = input;
        if (files.length > 0) {
            body = new FormData();
            body.append('report', JSON.stringify(input));
            for (const file of files) body.append('files[]', file, file.name);
        }
        const result = await ApiClient('POST', '/api/exchange/reports', body);
        if (isErrorResponse(result) && result.error.status === 413) {
            // nginx answers an oversized body itself, without our JSON.
            throw new ExchangeError('', 413, 'size');
        }
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

    /**
     * A short-lived link to a file attached to a report, asked for right before it is opened:
     * links expire after ten minutes. Local storage answers with a path on the backend.
     */
    const fileUrl = useCallback(async (reportId: number, fileId: number): Promise<string> => {
        const result = await apiGet(`/api/exchange/reports/${reportId}/files/${fileId}`);
        throwIfError(result);
        const url = (result as { url?: unknown } | null)?.url;
        if (typeof url !== 'string') throw new ExchangeError('Unexpected response', 500);
        return new URL(url, process.env.NEXT_PUBLIC_BACKEND_URL).toString();
    }, []);

    return { share, remove, markHelpful, suggestPrograms, fileUrl };
}

/** The ATHENS courses of the current catalogue; `enabled` false skips the fetch (a closed dialog). */
export function useAthensOverview(enabled = true): { overview: AthensOverview | null; failed: boolean } {
    const { value, failed } = useExchangeRead(enabled ? apiEndpoints.athens() : null, convertToAthensOverview);
    return { overview: value, failed };
}

export function useAthensCourse(id: string | null): { detail: AthensCourseDetail | null; failed: boolean } {
    const { value, failed } = useExchangeRead(id ? apiEndpoints.athensCourse(id) : null, convertToAthensCourseDetail);
    return { detail: value, failed };
}

export interface AthensReviewInput {
    courseId: number;
    session: string;
    program: string;
    rating: number;
    sections: Partial<Record<AthensTopic, string>>;
    contactable: boolean;
    showName: boolean;
}

/** Reviews of ATHENS courses, and the reader's private stars. */
export function useAthensActions() {
    const share = useCallback(async (input: AthensReviewInput): Promise<{ id: number; courseId: number }> => {
        const result = await ApiClient('POST', '/api/exchange/athens/reviews', input);
        throwIfError(result);
        invalidateApiCache();
        notifyChanged();
        const data = (result ?? {}) as { id?: unknown; courseId?: unknown };
        return { id: Number(data.id), courseId: Number(data.courseId) };
    }, []);

    const remove = useCallback(async (reviewId: number): Promise<void> => {
        throwIfError(await ApiClient('DELETE', `/api/exchange/athens/reviews/${reviewId}`));
        invalidateApiCache();
        notifyChanged();
    }, []);

    /**
     * Stars change on screen at once (the caller keeps them), so this does not make every read on
     * the page fetch again; it only drops the cache for the next visit.
     */
    const setStars = useCallback(async (courseId: number, stars: number | null): Promise<void> => {
        throwIfError(await ApiClient('PUT', `/api/exchange/athens/courses/${courseId}/stars`, { stars }));
        invalidateApiCache();
    }, []);

    return { share, remove, setStars };
}
