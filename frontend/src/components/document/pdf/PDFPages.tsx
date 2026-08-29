'use client'

/**
 * The bare page renderer: a PDF drawn at whatever width the caller asks for, a chunk at a time.
 */

import { LoaderCircle } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useCallback, useMemo, useState, type JSX } from 'react';
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
                    <div
                        key={`page_wrapper_${index + 1}`}
                        // The viewer anchors the reader's scroll position to one of these while the
                        // pages change size, so every page has to be findable by its number.
                        data-pdf-page={index + 1}
                        className="my-4 shadow-md shadow-black/50 bg-white overflow-hidden mx-auto flex justify-center"
                        style={{
                            width: `${width}px`,
                            minHeight: `${Math.round(width * pageAspect)}px`,
                            aspectRatio: `1 / ${pageAspect}`,
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
