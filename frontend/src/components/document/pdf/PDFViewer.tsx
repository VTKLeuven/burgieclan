'use client'

/**
 * The document page's PDF reader: `PDFPages` plus everything that decides how big those pages are.
 *
 * Pages are laid out at a width the reader controls — a trackpad pinch, ⌘/Ctrl with the scroll
 * wheel, the slider, the +/- buttons or the two fit presets — and that choice is remembered across
 * documents and across sessions, the same way the sidebar remembers its width.
 */

import PDFZoomBar from '@/components/document/pdf/PDFZoomBar';
import PDFPages, { type PDFFile } from '@/components/document/pdf/PDFPages';
import { clampPdfZoom, usePdfZoomPreference, type PdfFitMode } from '@/hooks/usePdfZoomPreference';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';

/** Fit-to-column stops here, so a page stays a readable column rather than a billboard. */
const MAX_BASE_WIDTH = 1000;

/**
 * Everything between the top of the window and the top of a page once the reader has scrolled to
 * it: the sticky site header, this component's zoom bar, the surrounding padding and a page's own
 * margin. "Whole page" sizes against what is left, so the page really does fit on screen.
 */
const VERTICAL_CHROME = 170;

/** Re-rasterising pages while a gesture is actively moving is wasted work; let it settle, then commit. */
const RENDER_COMMIT_MS = 300;

/** One press of ⌘/Ctrl +/-, matching the notch the zoom bar's buttons take. */
const KEYBOARD_ZOOM_STEP = 1.25;

export default function PDFViewer({ file }: { file: PDFFile }): JSX.Element {
    const { preference, setFit, setZoom } = usePdfZoomPreference();

    const scrollRef = useRef<HTMLDivElement>(null);
    const stackRef = useRef<HTMLDivElement>(null);
    const pointerInsideRef = useRef(false);
    const hasCommittedRef = useRef(false);
    const effectiveZoomRef = useRef(1);
    const isGestureActiveRef = useRef(false);
    const gestureTimeoutRef = useRef<number | null>(null);

    // Height / width of the first page, which is what "whole page" has to solve for. Default to standard A4 (1.414).
    const [pageAspect, setPageAspect] = useState<number>(1.414);
    // The column the pages sit in, and the window height they have to fit into. Both are measured
    // rather than assumed: a collapsed sidebar, browser zoom or a second monitor all change them.
    const [baseWidth, setBaseWidth] = useState(0);
    const [availableHeight, setAvailableHeight] = useState(0);
    // The width the pages are actually rasterised at, which trails the target during a gesture.
    const [renderWidth, setRenderWidth] = useState(0);
    // Local live zoom state during gestures so wheel events are instant and un-clobbered by async state
    const [liveZoom, setLiveZoom] = useState<number | null>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            setBaseWidth(Math.min(entry.contentRect.width, MAX_BASE_WIDTH));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const measure = () => setAvailableHeight(window.innerHeight - VERTICAL_CHROME);

        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    // What "whole page" works out to, in the same units as every other zoom level so the slider
    // and the readout can talk about it too. Null until the first page has reported its shape.
    const fitPageZoom = useMemo(() => {
        if (!pageAspect || !baseWidth || !availableHeight) return null;
        return clampPdfZoom(availableHeight / pageAspect / baseWidth);
    }, [pageAspect, baseWidth, availableHeight]);

    const baseEffectiveZoom = preference.fit === 'width'
        ? 1
        : preference.fit === 'page'
            ? fitPageZoom ?? 1
            : clampPdfZoom(preference.zoom);

    // Keep effectiveZoomRef up to date with preference changes when no gesture is active
    useEffect(() => {
        if (!isGestureActiveRef.current) {
            effectiveZoomRef.current = baseEffectiveZoom;
            setLiveZoom(null);
        }
    }, [baseEffectiveZoom]);

    const currentZoom = liveZoom ?? baseEffectiveZoom;
    const targetWidth = baseWidth * currentZoom;

    // Pages keep their last bitmap while a gesture is in flight and are scaled with CSS `zoom`.
    // Once the reader settles, the true width lands and PDF.js redraws them crisply at that size.
    useEffect(() => {
        if (targetWidth <= 0) return;

        if (!hasCommittedRef.current) {
            hasCommittedRef.current = true;
            setRenderWidth(Math.round(targetWidth));
            return;
        }

        // Avoid re-rasterising if width difference is less than 10%
        if (renderWidth > 0 && Math.abs(targetWidth - renderWidth) / renderWidth < 0.10) {
            return;
        }

        const timer = window.setTimeout(() => setRenderWidth(Math.round(targetWidth)), 400);
        return () => window.clearTimeout(timer);
    }, [targetWidth, renderWidth]);

    const previewRatio = renderWidth > 0 ? targetWidth / renderWidth : 1;

    const applyZoom = useCallback((zoom: number) => {
        const next = clampPdfZoom(zoom);
        effectiveZoomRef.current = next;
        setLiveZoom(next);
        setZoom(next);
    }, [setZoom]);

    const handleFitChange = useCallback((fit: PdfFitMode) => {
        isGestureActiveRef.current = false;
        setLiveZoom(null);
        setFit(fit);
    }, [setFit]);

    const stepZoom = useCallback(
        (factor: number) => applyZoom(effectiveZoomRef.current * factor),
        [applyZoom],
    );

    /**
     * Zoom by `factor`, keeping whatever sits under (clientX, clientY) under it afterwards.
     *
     * The document page scrolls as one, so the vertical correction goes to the window; the
     * horizontal one goes to this component's own scroll container. Corrections are applied
     * synchronously so consecutive high-frequency wheel events always calculate from the true
     * updated scroll position.
     */
    const zoomAround = useCallback((clientX: number, clientY: number, factor: number) => {
        const container = scrollRef.current;
        const stack = stackRef.current;
        if (!container || !stack) return;

        const current = effectiveZoomRef.current;
        const next = clampPdfZoom(current * factor);
        if (Math.abs(next - current) < 0.0001) return;

        const ratio = next / current;
        const overflows = container.scrollWidth > container.clientWidth + 1;

        const stackRect = stack.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const deltaScrollY = (clientY - stackRect.top) * (ratio - 1);
        const deltaScrollLeft = overflows
            ? (container.scrollLeft + (clientX - containerRect.left)) * (ratio - 1)
            : 0;

        effectiveZoomRef.current = next;
        isGestureActiveRef.current = true;

        if (Math.abs(deltaScrollY) > 0.01) {
            window.scrollBy({ top: deltaScrollY, left: 0, behavior: 'instant' });
        }
        if (overflows && Math.abs(deltaScrollLeft) > 0.01) {
            container.scrollLeft += deltaScrollLeft;
        }

        setLiveZoom(next);
        setZoom(next);

        if (gestureTimeoutRef.current !== null) {
            window.clearTimeout(gestureTimeoutRef.current);
        }
        gestureTimeoutRef.current = window.setTimeout(() => {
            isGestureActiveRef.current = false;
        }, RENDER_COMMIT_MS);
    }, [setZoom]);

    // A trackpad pinch arrives as a wheel event with ctrlKey set, which is also how ⌘/Ctrl +
    // scrolling arrives, so one handler covers both. It has to be registered by hand because
    // React's onWheel is passive and therefore cannot preventDefault — without that the browser
    // zooms the whole page instead of the document.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onWheel = (event: WheelEvent) => {
            if (!event.ctrlKey && !event.metaKey) return;

            event.preventDefault();
            // Line-mode deltas (Firefox) are smaller than pixel ones.
            const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
            const factor = Math.exp(-Math.max(-30, Math.min(30, delta)) * 0.006);
            zoomAround(event.clientX, event.clientY, factor);
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [zoomAround]);

    // ⌘/Ctrl with +, - or 0, but only while the reader is actually pointed at the document —
    // anywhere else on the page those keys should still zoom the browser.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((!event.ctrlKey && !event.metaKey) || !pointerInsideRef.current) return;

            if (event.key === '0') {
                event.preventDefault();
                handleFitChange('width');
            } else if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                stepZoom(KEYBOARD_ZOOM_STEP);
            } else if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                stepZoom(1 / KEYBOARD_ZOOM_STEP);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleFitChange, stepZoom]);

    const onDocumentLoad = useCallback((pdf: PDFDocumentProxy) => {
        pdf.getPage(1).then((page) => {
            const viewport = page.getViewport({ scale: 1 });
            if (viewport.width > 0) setPageAspect(viewport.height / viewport.width);
        }).catch(() => {
            // Without an aspect ratio "whole page" simply stays unavailable; nothing else breaks.
        });
    }, []);

    return (
        <div
            onPointerEnter={() => { pointerInsideRef.current = true; }}
            onPointerLeave={() => { pointerInsideRef.current = false; }}
        >
            <PDFZoomBar
                fit={preference.fit}
                zoom={currentZoom}
                onFitChange={handleFitChange}
                onZoomChange={applyZoom}
                onZoomStep={stepZoom}
                canFitPage={fitPageZoom !== null}
            />

            <div ref={scrollRef} className="min-h-[70vh] overflow-x-auto bg-vtk-paper-2 p-4">
                <div className="flex w-max min-w-full flex-col items-center">
                    <div ref={stackRef} style={{ zoom: previewRatio }}>
                        <PDFPages file={file} width={renderWidth} pageAspect={pageAspect} onDocumentLoad={onDocumentLoad} />
                    </div>
                </div>
            </div>
        </div>
    );
}
