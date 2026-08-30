'use client'

/**
 * The bare page renderer: a PDF drawn at whatever width the caller asks for, a chunk at a time.
 */

import { LoaderCircle } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PAGES_PER_LOAD = 10;

/** How long a page holds its old picture before giving up on a re-render that never lands. */
const STALE_PICTURE_TIMEOUT_MS = 3000;

/** How far outside the window a page still counts as worth keeping a picture of. */
const NEARBY_MARGIN = '200px';

export type PDFFile = string | File | null;

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PDFPageProps {
    pageNumber: number;
    width: number;
    pageAspect: number;
}

/**
 * One page, plus the bit that stops it blinking white every time it is re-rasterised.
 *
 * Resizing a page throws its picture away twice over: react-pdf keys the canvas on the scale, so a
 * new width mounts a fresh empty canvas, and it then hides that canvas (`visibility: hidden`) for
 * the whole of the render. Every zoom therefore left the page blank for a frame or more.
 *
 * So each page on or near the screen keeps a copy of its last finished render, and shows that copy —
 * stretched to the new size, exactly as the pinch preview already stretches it — until the new one
 * is ready. The copy has to be taken while the old canvas is still alive, which means at the end of
 * a render rather than at the start of the next one. Pages far off screen keep nothing: no one is
 * looking at them, and their canvases are the expensive part.
 */
function PDFPage({ pageNumber, width, pageAspect }: PDFPageProps): JSX.Element {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pictureRef = useRef<HTMLCanvasElement>(null);
    const renderedWidthRef = useRef(width);
    const hasPictureRef = useRef(false);
    const nearbyRef = useRef(false);
    const showingRef = useRef(false);
    const timeoutRef = useRef<number | null>(null);
    const [showing, setShowing] = useState(false);

    const releasePicture = useCallback(() => {
        // Not while it is the only thing on screen — the next finished render will free it.
        if (showingRef.current) return;

        const picture = pictureRef.current;
        if (picture) {
            // Zeroing the bitmap is what actually hands the memory back.
            picture.width = 0;
            picture.height = 0;
        }
        hasPictureRef.current = false;
    }, []);

    const keepPicture = useCallback(() => {
        const canvas = canvasRef.current;
        const picture = pictureRef.current;
        if (!picture) return;

        if (!nearbyRef.current) {
            releasePicture();
            return;
        }

        // Nothing drawn yet, or a render still in flight — react-pdf keeps the canvas hidden until
        // it finishes, and half a page is worse to hold on to than the last whole one.
        if (!canvas || canvas.width === 0 || canvas.style.visibility === 'hidden') return;

        picture.width = canvas.width;
        picture.height = canvas.height;
        picture.getContext('2d')?.drawImage(canvas, 0, 0);
        hasPictureRef.current = true;
    }, [releasePicture]);

    // The new canvas is up: stop covering it, and take the copy that covers the *next* resize.
    const onRendered = useCallback(() => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        showingRef.current = false;
        setShowing(false);
        keepPicture();
    }, [keepPicture]);

    useLayoutEffect(() => {
        if (renderedWidthRef.current === width) return;
        renderedWidthRef.current = width;

        if (!hasPictureRef.current || showingRef.current) return;

        showingRef.current = true;
        setShowing(true);

        // A render that never finishes must not leave a stale picture up for good.
        timeoutRef.current = window.setTimeout(() => {
            timeoutRef.current = null;
            showingRef.current = false;
            setShowing(false);
        }, STALE_PICTURE_TIMEOUT_MS);
    }, [width]);

    // Only pages the reader can plausibly see are worth holding a second bitmap for.
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const observer = new IntersectionObserver(([entry]) => {
            nearbyRef.current = entry.isIntersecting;
            if (entry.isIntersecting) {
                keepPicture();
            } else {
                releasePicture();
            }
        }, { rootMargin: NEARBY_MARGIN });

        observer.observe(wrapper);
        return () => observer.disconnect();
    }, [keepPicture, releasePicture]);

    useEffect(() => () => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
        }
    }, []);

    return (
        <div
            ref={wrapperRef}
            // The viewer anchors the reader's scroll position to one of these while the pages
            // change size, so every page has to be findable by its number.
            data-pdf-page={pageNumber}
            className="relative my-4 shadow-md shadow-black/50 bg-white overflow-hidden mx-auto flex justify-center"
            style={{
                width: `${width}px`,
                minHeight: `${Math.round(width * pageAspect)}px`,
                aspectRatio: `1 / ${pageAspect}`,
            }}
        >
            <Page
                pageNumber={pageNumber}
                width={width}
                className="bg-white"
                canvasBackground="white"
                canvasRef={canvasRef}
                onRenderSuccess={onRendered}
                onRenderError={onRendered}
                loading={null}
            />
            {/* Width only: the copy keeps the bitmap's own proportions, which are the shape the new
                canvas is about to take, so uncovering it is not a resize. */}
            <canvas
                ref={pictureRef}
                data-pdf-snapshot=""
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 w-full"
                style={{ visibility: showing ? 'visible' : 'hidden' }}
            />
        </div>
    );
}

interface PDFPagesProps {
    file: PDFFile;
    width: number;
    pageAspect?: number;
    onDocumentLoad?: (pdf: PDFDocumentProxy) => void;
}

export default function PDFPages({ file, width, pageAspect = 1.414, onDocumentLoad }: PDFPagesProps): JSX.Element {
    const { t } = useTranslation();

    const [numPages, setNumPages] = useState<number>();
    const [displayedPages, setDisplayedPages] = useState<number>(PAGES_PER_LOAD);

    const options = useMemo(() => ({
        cMapUrl: '/cmaps/',
        standardFontDataUrl: '/standard_fonts/',
        withCredentials: true,
    }), []);

    const onDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy): void => {
        setNumPages(pdf.numPages);
        setDisplayedPages(Math.min(PAGES_PER_LOAD, pdf.numPages));
        onDocumentLoad?.(pdf);
    }, [onDocumentLoad]);

    function loadMorePages(): void {
        if (numPages) {
            setDisplayedPages(prev => Math.min(prev + PAGES_PER_LOAD, numPages));
        }
    }

    return (
        <div className="w-full flex flex-col items-center">
            <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                options={options}
                className="flex flex-col items-center w-full"
                loading={
                    <div className="flex h-96 w-full items-center justify-center p-8">
                        <LoaderCircle className="animate-spin text-vtk-navy" size={40} strokeWidth={2.5} aria-label={t('document.loading')} />
                    </div>
                }
            >
                {width > 0 && Array.from(new Array(displayedPages), (_el, index) => (
                    <PDFPage
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        width={width}
                        pageAspect={pageAspect}
                    />
                ))}
            </Document>

            {numPages && displayedPages < numPages && (
                <div className="flex justify-center my-8">
                    <button
                        onClick={loadMorePages}
                        className="white-button border border-vtk-ink hover:bg-vtk-ink hover:text-white"
                    >
                        {t('document.load-more', { displayedPages, numPages })}
                    </button>
                </div>
            )}
        </div>
    );
}
