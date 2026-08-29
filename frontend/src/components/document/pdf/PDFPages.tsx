'use client'

/**
 * The bare page renderer: a PDF drawn at whatever width the caller asks for, a chunk at a time.
 *
 * Each page maintains its rendered canvas during zoom transitions so resizing is immediate,
 * visually continuous, and 100% flicker-free.
 */

import { LoaderCircle } from 'lucide-react';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PAGES_PER_LOAD = 10;

export type PDFFile = string | File | null;

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PDFPageItemProps {
    pdf: PDFDocumentProxy;
    pageNumber: number;
    width: number;
    pageAspect?: number;
}

function PDFPageItem({ pdf, pageNumber, width, pageAspect = 1.414 }: PDFPageItemProps): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<RenderTask | null>(null);
    const pageProxyRef = useRef<PDFPageProxy | null>(null);

    const height = Math.round(width * pageAspect);

    useEffect(() => {
        let cancelled = false;

        const renderPage = async () => {
            try {
                if (!pageProxyRef.current) {
                    pageProxyRef.current = await pdf.getPage(pageNumber);
                }
                if (cancelled || width <= 0) return;

                const page = pageProxyRef.current;
                const canvas = canvasRef.current;
                if (!canvas) return;

                // Cancel any pending render task for this page
                if (renderTaskRef.current) {
                    try {
                        renderTaskRef.current.cancel();
                    } catch {
                        // ignore cancellation
                    }
                    renderTaskRef.current = null;
                }

                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const originalViewport = page.getViewport({ scale: 1 });
                const scale = width / originalViewport.width;
                const viewport = page.getViewport({ scale: scale * dpr });

                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);

                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) return;

                const renderTask = page.render({
                    canvas,
                    canvasContext: ctx,
                    viewport,
                    background: 'white',
                });
                renderTaskRef.current = renderTask;

                await renderTask.promise;
                renderTaskRef.current = null;
            } catch (err: unknown) {
                const error = err as { name?: string };
                if (error?.name !== 'RenderingCancelledException' && !cancelled) {
                    console.error(`Page ${pageNumber} render error:`, err);
                }
            }
        };

        renderPage();

        return () => {
            cancelled = true;
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {
                    // ignore
                }
            }
        };
    }, [pdf, pageNumber, width]);

    return (
        <div
            className="my-4 shadow-md shadow-black/50 bg-white overflow-hidden mx-auto transition-[width,height] duration-75 ease-out"
            style={{
                width: `${width}px`,
                height: `${height}px`,
            }}
        >
            <canvas
                ref={canvasRef}
                className="block w-full h-full"
            />
        </div>
    );
}

interface PDFPagesProps {
    file: PDFFile;
    /** Page width in CSS pixels. Pages wait rather than rasterise at zero while the caller measures. */
    width: number;
    pageAspect?: number;
    onDocumentLoad?: (pdf: PDFDocumentProxy) => void;
}

export default function PDFPages({ file, width, pageAspect, onDocumentLoad }: PDFPagesProps): JSX.Element {
    const { t } = useTranslation();

    const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
    const [numPages, setNumPages] = useState<number>();
    const [displayedPages, setDisplayedPages] = useState<number>(PAGES_PER_LOAD);

    const options = useMemo(() => ({
        cMapUrl: '/cmaps/',
        standardFontDataUrl: '/standard_fonts/',
        withCredentials: true,
    }), []);

    const onDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy): void => {
        setPdfDocument(pdf);
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
                {pdfDocument && width > 0 && Array.from(new Array(displayedPages), (_el, index) => (
                    <PDFPageItem
                        key={`page_${index + 1}`}
                        pdf={pdfDocument}
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
