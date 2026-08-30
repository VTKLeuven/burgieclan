'use client'

/**
 * The document page's PDF reader: `PDFPages` plus everything that decides how big those pages are.
 *
 * Pages are laid out at a width the reader controls — a trackpad pinch, ⌘/Ctrl with the scroll
 * wheel, the slider, the +/- buttons or the two fit presets — and that choice is remembered across
 * documents and across sessions.
 */

import PDFPages, { type PDFFile } from '@/components/document/pdf/PDFPages';
import PDFZoomBar from '@/components/document/pdf/PDFZoomBar';
import {
    clampPdfZoom,
    usePdfZoomPreference,
    type PdfFitMode,
} from '@/hooks/usePdfZoomPreference';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react';

/** Fit-to-column stops here, so a page stays a readable column rather than a billboard. */
const MAX_BASE_WIDTH = 1000;

/** Vertical space for header, toolbar and margins when calculating "whole page" fit. */
const VERTICAL_CHROME = 170;

const KEYBOARD_ZOOM_STEP = 1.25;

/**
 * Where the reader was looking, in terms that survive a resize: a page, how far down that page,
 * and where that spot sat in the window.
 */
interface ScrollAnchor {
    page: number;
    fractionY: number;
    viewportY: number;
    fractionX: number;
    viewportX: number;
    stackHeight: number;
}

export default function PDFViewer({ file }: { file: PDFFile }): JSX.Element {
    const { preference, setFit, setZoom } = usePdfZoomPreference();

    const scrollRef = useRef<HTMLDivElement>(null);
    const stackRef = useRef<HTMLDivElement>(null);
    const pointerInsideRef = useRef(false);
    const effectiveZoomRef = useRef(1);
    const isGestureActiveRef = useRef(false);
    const anchorRef = useRef<ScrollAnchor | null>(null);
    const gestureTimeoutRef = useRef<number | null>(null);

    // Height / width of the first page, which is what "whole page" has to solve for. Default to standard A4 (1.414).
    const [pageAspect, setPageAspect] = useState<number>(1.414);
    const [baseWidth, setBaseWidth] = useState(0);
    const [availableHeight, setAvailableHeight] = useState(0);
    const [renderWidth, setRenderWidth] = useState(0);
    const [liveZoom, setLiveZoom] = useState<number | null>(null);

    // Measure column width with a threshold to prevent scrollbar toggle loops
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            const width = Math.min(Math.floor(entry.contentRect.width), MAX_BASE_WIDTH);
            if (width > 0) {
                setBaseWidth((prev) => {
                    if (prev > 0 && Math.abs(width - prev) < 20) return prev;
                    return width;
                });
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Measure window height for "whole page" fit
    useEffect(() => {
        const measure = () => setAvailableHeight(window.innerHeight - VERTICAL_CHROME);

        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    const fitPageZoom = useMemo(() => {
        if (!pageAspect || !baseWidth || !availableHeight) return null;
        return clampPdfZoom(availableHeight / pageAspect / baseWidth);
    }, [pageAspect, baseWidth, availableHeight]);

    const baseEffectiveZoom = preference.fit === 'width'
        ? 1
        : preference.fit === 'page'
            ? fitPageZoom ?? 1
            : clampPdfZoom(preference.zoom);

    useEffect(() => {
        if (!isGestureActiveRef.current) {
            effectiveZoomRef.current = baseEffectiveZoom;
            setLiveZoom(null);
        }
    }, [baseEffectiveZoom]);

    const currentZoom = liveZoom ?? baseEffectiveZoom;
    const targetWidth = Math.round(baseWidth * currentZoom);

    /**
     * Note where the reader is, immediately before the pages are told to change size.
     *
     * Vertical scrolling belongs to the window rather than to this component's box, so resizing the
     * pages moves the document out from under a scroll offset that stays put: zoom in on page 7 and
     * the same offset lands you back around page 2. The spot is stored against a single page instead
     * of against the stack as a whole because the margins between pages do not scale with the zoom.
     *
     * A pinch passes the pointer so the page keeps still under the fingers; everything else anchors
     * the middle of whatever part of the viewer is on screen.
     */
    const captureAnchor = useCallback((clientX?: number, clientY?: number) => {
        const stack = stackRef.current;
        const container = scrollRef.current;
        if (!stack || !container) return;

        const pages = Array.from(stack.querySelectorAll<HTMLElement>('[data-pdf-page]'));
        if (pages.length === 0) return;

        const stackRect = stack.getBoundingClientRect();
        if (stackRect.width <= 0) return;

        const visibleTop = Math.max(stackRect.top, 0);
        const visibleBottom = Math.min(stackRect.bottom, window.innerHeight);
        const anchorY = clientY ?? (visibleBottom > visibleTop
            ? (visibleTop + visibleBottom) / 2
            : window.innerHeight / 2);
        const anchorX = clientX ?? container.getBoundingClientRect().left + container.clientWidth / 2;

        // The page under the anchor, or the one above it when the anchor falls in a margin.
        let anchored = pages[0];
        for (const candidate of pages) {
            if (candidate.getBoundingClientRect().top > anchorY) break;
            anchored = candidate;
        }

        const pageRect = anchored.getBoundingClientRect();
        const page = Number(anchored.dataset.pdfPage);
        if (!page || pageRect.height <= 0) return;

        anchorRef.current = {
            page,
            fractionY: (anchorY - pageRect.top) / pageRect.height,
            viewportY: anchorY,
            fractionX: (anchorX - stackRect.left) / stackRect.width,
            viewportX: anchorX,
            stackHeight: stackRect.height,
        };
    }, []);

    // Commit renderWidth immediately when not in a pinch gesture; debounce only during live trackpad pinches
    useEffect(() => {
        if (targetWidth <= 0) return;

        if (!isGestureActiveRef.current) {
            setRenderWidth(targetWidth);
            return;
        }

        const timer = window.setTimeout(() => {
            captureAnchor();
            setRenderWidth(targetWidth);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [captureAnchor, targetWidth]);

    const previewRatio = renderWidth > 0 ? targetWidth / renderWidth : 1;

    // Put that spot back where it was, before the browser paints the new size. Runs after every
    // commit rather than on a dependency list: an anchor is only ever set moments before the state
    // change it belongs to, and consuming it here means a resize that never arrives cannot leave a
    // stale one behind to fire against a later, unrelated render.
    useLayoutEffect(() => {
        const anchor = anchorRef.current;
        anchorRef.current = null;

        const stack = stackRef.current;
        const container = scrollRef.current;
        if (!anchor || !stack || !container) return;

        const stackRect = stack.getBoundingClientRect();
        // Nothing actually resized, so there is nothing to compensate for — and the reader may well
        // have scrolled in the meantime, which is theirs to keep.
        if (Math.abs(stackRect.height - anchor.stackHeight) < 0.5) return;

        const anchored = stack.querySelector<HTMLElement>(`[data-pdf-page="${anchor.page}"]`);
        if (!anchored) return;

        const pageRect = anchored.getBoundingClientRect();
        const deltaY = pageRect.top + anchor.fractionY * pageRect.height - anchor.viewportY;
        if (Math.abs(deltaY) > 0.5) {
            window.scrollBy(0, deltaY);
        }

        const deltaX = stackRect.left + anchor.fractionX * stackRect.width - anchor.viewportX;
        if (Math.abs(deltaX) > 0.5) {
            container.scrollLeft += deltaX;
        }
    });

    const applyZoom = useCallback((zoom: number) => {
        captureAnchor();
        isGestureActiveRef.current = false;
        if (gestureTimeoutRef.current !== null) {
            window.clearTimeout(gestureTimeoutRef.current);
            gestureTimeoutRef.current = null;
        }
        const next = clampPdfZoom(zoom);
        effectiveZoomRef.current = next;
        const nextWidth = Math.round(baseWidth * next);
        if (nextWidth > 0) {
            setRenderWidth(nextWidth);
        }
        setLiveZoom(null);
        setZoom(next);
    }, [baseWidth, captureAnchor, setZoom]);

    const handleFitChange = useCallback((fit: PdfFitMode) => {
        captureAnchor();
        isGestureActiveRef.current = false;
        if (gestureTimeoutRef.current !== null) {
            window.clearTimeout(gestureTimeoutRef.current);
            gestureTimeoutRef.current = null;
        }
        setLiveZoom(null);
        setFit(fit);

        const nextZoom = fit === 'width' ? 1 : fit === 'page' ? (fitPageZoom ?? 1) : preference.zoom;
        const nextWidth = Math.round(baseWidth * nextZoom);
        if (nextWidth > 0) {
            setRenderWidth(nextWidth);
        }
    }, [baseWidth, captureAnchor, fitPageZoom, preference.zoom, setFit]);

    const handleZoomStep = useCallback((factor: number) => {
        applyZoom(effectiveZoomRef.current * factor);
    }, [applyZoom]);

    /**
     * A step of a live pinch: zoom about the pointer, keeping the spot under it still on both axes.
     */
    const zoomAround = useCallback((clientX: number, clientY: number, factor: number) => {
        const container = scrollRef.current;
        if (!container || baseWidth <= 0) return;

        const current = effectiveZoomRef.current;
        const next = clampPdfZoom(current * factor);
        if (Math.abs(next - current) < 0.0001) return;

        captureAnchor(clientX, clientY);

        effectiveZoomRef.current = next;
        isGestureActiveRef.current = true;

        setLiveZoom(next);
        setZoom(next);

        if (gestureTimeoutRef.current !== null) {
            window.clearTimeout(gestureTimeoutRef.current);
        }
        gestureTimeoutRef.current = window.setTimeout(() => {
            isGestureActiveRef.current = false;
        }, 250);
    }, [baseWidth, captureAnchor, setZoom]);

    // Handle trackpad pinch gestures across all browsers:
    // - Safari uses native gesture events (gesturestart, gesturechange, gestureend)
    // - Chrome & Firefox use wheel events with ctrlKey / metaKey
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onWheel = (event: WheelEvent) => {
            if (!event.ctrlKey && !event.metaKey) return;

            event.preventDefault();
            const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
            const factor = Math.exp(-Math.max(-20, Math.min(20, delta)) * 0.003);
            zoomAround(event.clientX, event.clientY, factor);
        };

        let gestureStartZoom = 1;
        const onGestureStart = (event: Event) => {
            event.preventDefault();
            gestureStartZoom = effectiveZoomRef.current;
        };

        const onGestureChange = (event: Event) => {
            event.preventDefault();
            const e = event as Event & { scale?: number; clientX?: number; clientY?: number };
            if (typeof e.scale === 'number' && e.scale > 0) {
                const target = clampPdfZoom(gestureStartZoom * e.scale);
                const current = effectiveZoomRef.current;
                if (current > 0) {
                    const clientX = e.clientX ?? (window.innerWidth / 2);
                    const clientY = e.clientY ?? (window.innerHeight / 2);
                    zoomAround(clientX, clientY, target / current);
                }
            }
        };

        const onGestureEnd = (event: Event) => {
            event.preventDefault();
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('gesturestart', onGestureStart, { passive: false });
        el.addEventListener('gesturechange', onGestureChange, { passive: false });
        el.addEventListener('gestureend', onGestureEnd, { passive: false });

        return () => {
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('gesturestart', onGestureStart);
            el.removeEventListener('gesturechange', onGestureChange);
            el.removeEventListener('gestureend', onGestureEnd);
        };
    }, [zoomAround]);

    // ⌘/Ctrl with +, - or 0
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((!event.ctrlKey && !event.metaKey) || !pointerInsideRef.current) return;

            if (event.key === '0') {
                event.preventDefault();
                handleFitChange('width');
            } else if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                handleZoomStep(KEYBOARD_ZOOM_STEP);
            } else if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                handleZoomStep(1 / KEYBOARD_ZOOM_STEP);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleFitChange, handleZoomStep]);

    const onDocumentLoad = useCallback((pdf: PDFDocumentProxy) => {
        pdf.getPage(1).then((page) => {
            const viewport = page.getViewport({ scale: 1 });
            if (viewport.width > 0) setPageAspect(viewport.height / viewport.width);
        }).catch(() => {});
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
                onZoomStep={handleZoomStep}
                canFitPage={fitPageZoom !== null}
            />

            <div
                ref={scrollRef}
                className="overflow-x-auto bg-vtk-paper-2 p-4"
            >
                <div
                    ref={stackRef}
                    className="mx-auto flex flex-col items-center"
                    style={previewRatio !== 1 ? { zoom: previewRatio } : undefined}
                >
                    <PDFPages
                        file={file}
                        width={renderWidth}
                        pageAspect={pageAspect}
                        onDocumentLoad={onDocumentLoad}
                    />
                </div>
            </div>
        </div>
    );
}
