'use client'

/**
 * The bare page renderer: a PDF drawn at whatever width the caller asks for, a chunk at a time.
 *
 * Everything about how wide that should be — the zoom bar, the trackpad, the remembered
 * preference — lives in `PDFViewer`, which wraps this. Small embedded previews (the account
 * document list, the comment modal) size themselves and use this directly.
 *
 * Based on sample: https://github.com/wojtekmaj/react-pdf/tree/main/sample/next-app/app
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PAGES_PER_LOAD = 10;

export type PDFFile = string | File | null;

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PDFPagesProps {
    file: PDFFile;
    /** Page width in CSS pixels. Pages wait rather than rasterise at zero while the caller measures. */
    width: number;
    pageAspect?: number;
    onDocumentLoad?: (pdf: PDFDocumentProxy) => void;
}

export default function PDFPages({ file, width, pageAspect, onDocumentLoad }: PDFPagesProps): JSX.Element {
    const { t } = useTranslation();

    // Total number of pages in the PDF
    const [numPages, setNumPages] = useState<number>();
    // Number of pages currently displayed
    const [displayedPages, setDisplayedPages] = useState<number>(PAGES_PER_LOAD);

    // Options for PDF.js configuration
    // Memoize the options object to prevent unnecessary rerenders
    const options = useMemo(() => ({
        cMapUrl: '/cmaps/',
        standardFontDataUrl: '/standard_fonts/',
        withCredentials: true,
    }), []);

    function onDocumentLoadSuccess(pdf: PDFDocumentProxy): void {
        setNumPages(pdf.numPages);
        setDisplayedPages(Math.min(PAGES_PER_LOAD, pdf.numPages));
        onDocumentLoad?.(pdf);
    }

    function loadMorePages(): void {
        if (numPages) {
            setDisplayedPages(prev => Math.min(prev + PAGES_PER_LOAD, numPages));
        }
    }

    return (
        <div className="w-full">
            <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                options={options}
                className="flex flex-col items-center"
                loading={
                    <div className="p-4 text-italic">
                        {t('document.loading')}
                    </div>
                }
            >
                {width > 0 && Array.from(new Array(displayedPages), (_el, index) => (
                    <div
                        key={`page_wrapper_${index + 1}`}
                        className="my-4 shadow-md shadow-black/50 bg-white overflow-hidden flex justify-center"
                        style={{
                            width: `${width}px`,
                            minHeight: pageAspect ? `${Math.round(width * pageAspect)}px` : undefined,
                            aspectRatio: pageAspect ? `1 / ${pageAspect}` : undefined,
                        }}
                    >
                        <Page
                            pageNumber={index + 1}
                            width={width}
                            className="bg-white"
                            canvasBackground="white"
                            loading={null}
                        />
                    </div>
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
