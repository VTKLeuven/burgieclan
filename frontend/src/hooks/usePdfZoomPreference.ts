'use client';

import { STORAGE_KEYS } from '@/utils/cookieNames';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * How the reader wants PDF pages sized.
 *
 * `width` and `page` are the two presets that follow the window — fit the column, or fit a whole
 * page on screen — while `custom` pins the multiplier the reader dialled in themselves. The
 * multiplier is always relative to the column the viewer sits in rather than to the page's own
 * point size, so a preference set on a laptop still looks like the same choice on a wide monitor
 * and next to a collapsed sidebar.
 */
export type PdfFitMode = 'width' | 'page' | 'custom';

export interface PdfZoomPreference {
    fit: PdfFitMode;
    /** Page width as a fraction of the fit-to-column width. Only read when `fit` is `custom`. */
    zoom: number;
}

export const PDF_MIN_ZOOM = 0.25;
export const PDF_MAX_ZOOM = 3;

export const DEFAULT_PDF_ZOOM_PREFERENCE: PdfZoomPreference = { fit: 'width', zoom: 1 };

export const clampPdfZoom = (zoom: number) =>
    Math.min(PDF_MAX_ZOOM, Math.max(PDF_MIN_ZOOM, zoom));

const PERSIST_DEBOUNCE_MS = 300;

const parsePreference = (raw: string | null): PdfZoomPreference | null => {
    if (!raw) return null;

    try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return null;

        const { fit, zoom } = parsed as Partial<PdfZoomPreference>;
        if (fit !== 'width' && fit !== 'page' && fit !== 'custom') return null;
        if (typeof zoom !== 'number' || !Number.isFinite(zoom)) return null;

        return { fit, zoom: clampPdfZoom(zoom) };
    } catch {
        return null;
    }
};

/**
 * The reader's PDF sizing, remembered across documents and across sessions.
 *
 * Same deal as the sidebar width: stored in localStorage and read back after mount rather than
 * during the first render, so the server-rendered markup and the hydrated markup still agree.
 * The PDF itself is still loading at that point, so the reader never sees the default flash past.
 */
export function usePdfZoomPreference() {
    const [preference, setPreference] = useState<PdfZoomPreference>(DEFAULT_PDF_ZOOM_PREFERENCE);
    const hydratedRef = useRef(false);

    useEffect(() => {
        const stored = parsePreference(window.localStorage.getItem(STORAGE_KEYS.PDF_ZOOM));
        hydratedRef.current = true;
        if (!stored) return;

        // Reading a browser-only preference after hydration intentionally replaces the initial value.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreference(stored);
    }, []);

    // Written on a trailing debounce: a pinch gesture walks through dozens of intermediate
    // multipliers and only the one the reader lands on is worth keeping.
    useEffect(() => {
        if (!hydratedRef.current) return;

        const timer = window.setTimeout(() => {
            window.localStorage.setItem(STORAGE_KEYS.PDF_ZOOM, JSON.stringify(preference));
        }, PERSIST_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [preference]);

    const setFit = useCallback((fit: PdfFitMode) => {
        setPreference((previous) => ({ ...previous, fit }));
    }, []);

    const setZoom = useCallback((zoom: number) => {
        setPreference({ fit: 'custom', zoom: clampPdfZoom(zoom) });
    }, []);

    return { preference, setFit, setZoom };
}
