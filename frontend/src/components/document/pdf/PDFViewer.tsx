'use client'

/**
 * The document page's PDF reader.
 *
 * Renders pages at a crisp base resolution and scales them with GPU-accelerated CSS `transform: scale()`.
 * This keeps the document perfectly centered, maintains natural vertical scrolling, and provides
 * silky-smooth 120 FPS zooming on all browsers (Safari, Chrome, Firefox).
 */

import PDFPages, { type PDFFile } from '@/components/document/pdf/PDFPages';
import PDFZoomBar from '@/components/document/pdf/PDFZoomBar';
import {
    clampPdfZoom,
    usePdfZoomPreference,
    type PdfFitMode,
} from '@/hooks/usePdfZoomPreference';
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

const KEYBOARD_ZOOM_STEP = 1.25;

export default function PDFViewer({ file }: { file: PDFFile }): JSX.Element {
    const { preference, setFit, setZoom } = usePdfZoomPreference();

    const scrollRef = useRef<HTMLDivElement>(null);
    const sizerRef = useRef<HTMLDivElement>(null);
    const stackRef = useRef<HTMLDivElement>(null);
    const pointerInsideRef = useRef(false);
    const effectiveZoomRef = useRef(1);
    const updateTimerRef = useRef<number | null>(null);

    // Height / width of the first page, which is what "whole page" has to solve for. Default to standard A4 (1.414).
    const [pageAspect, setPageAspect] = useState<number>(1.414);
    const [baseWidth, setBaseWidth] = useState(0);
    const [availableHeight, setAvailableHeight] = useState(0);
    const [stackHeight, setStackHeight] = useState(0);

    // Measure the available column width
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            const width = Math.min(Math.floor(entry.contentRect.width), MAX_BASE_WIDTH);
            if (width > 0) {
                setBaseWidth(width);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Measure the unscaled height of the inner page stack
    useEffect(() => {
        const el = stackRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            if (entry.contentRect.height > 0) {
                setStackHeight(entry.contentRect.height);
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

    const effectiveZoom = preference.fit === 'width'
        ? 1
        : preference.fit === 'page'
            ? fitPageZoom ?? 1
            : clampPdfZoom(preference.zoom);

    useEffect(() => {
        effectiveZoomRef.current = effectiveZoom;
    }, [effectiveZoom]);

    const scheduleReactZoomUpdate = useCallback((zoom: number) => {
        if (updateTimerRef.current !== null) {
            window.cancelAnimationFrame(updateTimerRef.current);
        }
        updateTimerRef.current = window.requestAnimationFrame(() => {
            setZoom(zoom);
        });
    }, [setZoom]);

    const applyZoom = useCallback((zoom: number) => {
        const next = clampPdfZoom(zoom);
        effectiveZoomRef.current = next;

        if (stackRef.current) {
            stackRef.current.style.transform = `scale(${next})`;
        }
        if (sizerRef.current && baseWidth > 0) {
            sizerRef.current.style.width = `${Math.round(baseWidth * next)}px`;
            if (stackHeight > 0) {
                sizerRef.current.style.height = `${Math.round(stackHeight * next)}px`;
            }
        }

        scheduleReactZoomUpdate(next);
    }, [baseWidth, stackHeight, scheduleReactZoomUpdate]);

    const handleFitChange = useCallback((fit: PdfFitMode) => {
        setFit(fit);
    }, [setFit]);

    const handleZoomStep = useCallback((factor: number) => {
        applyZoom(effectiveZoomRef.current * factor);
    }, [applyZoom]);

    const zoomAround = useCallback((clientX: number, _clientY: number, factor: number) => {
        const container = scrollRef.current;
        const stack = stackRef.current;
        const sizer = sizerRef.current;
        if (!container || !stack || !sizer || baseWidth <= 0) return;

        const current = effectiveZoomRef.current;
        const next = clampPdfZoom(current * factor);
        if (Math.abs(next - current) < 0.0001) return;

        const ratio = next / current;
        const overflows = container.scrollWidth > container.clientWidth + 1;
        const containerRect = container.getBoundingClientRect();

        const deltaScrollLeft = overflows
            ? (container.scrollLeft + (clientX - containerRect.left)) * (ratio - 1)
            : 0;

        effectiveZoomRef.current = next;

        // Instant GPU transform update
        stack.style.transform = `scale(${next})`;
        sizer.style.width = `${Math.round(baseWidth * next)}px`;
        if (stackHeight > 0) {
            sizer.style.height = `${Math.round(stackHeight * next)}px`;
        }

        if (overflows && Math.abs(deltaScrollLeft) > 0.01) {
            container.scrollLeft += deltaScrollLeft;
        }

        scheduleReactZoomUpdate(next);
    }, [baseWidth, stackHeight, scheduleReactZoomUpdate]);

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

    const sizerWidth = baseWidth > 0 ? Math.round(baseWidth * effectiveZoom) : undefined;
    const sizerHeight = stackHeight > 0 ? Math.round(stackHeight * effectiveZoom) : undefined;

    return (
        <div
            onPointerEnter={() => { pointerInsideRef.current = true; }}
            onPointerLeave={() => { pointerInsideRef.current = false; }}
        >
            <PDFZoomBar
                fit={preference.fit}
                zoom={effectiveZoom}
                onFitChange={handleFitChange}
                onZoomChange={applyZoom}
                onZoomStep={handleZoomStep}
                canFitPage={fitPageZoom !== null}
            />

            <div
                ref={scrollRef}
                className="min-h-[70vh] overflow-x-auto bg-vtk-paper-2 p-4"
            >
                {/* Sizer keeps the scroll container and layout perfectly sized and centered */}
                <div
                    ref={sizerRef}
                    className="mx-auto flex justify-center"
                    style={{
                        width: sizerWidth ? `${sizerWidth}px` : '100%',
                        height: sizerHeight ? `${sizerHeight}px` : undefined,
                    }}
                >
                    {/* Inner stack is scaled via GPU transform origin-top */}
                    <div
                        ref={stackRef}
                        className="flex flex-col items-center origin-top will-change-transform"
                        style={{
                            width: baseWidth > 0 ? `${baseWidth}px` : '100%',
                            transform: `scale(${effectiveZoom})`,
                            transformOrigin: 'top center',
                        }}
                    >
                        <PDFPages
                            file={file}
                            width={baseWidth}
                            pageAspect={pageAspect}
                            onDocumentLoad={onDocumentLoad}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
