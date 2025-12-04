'use client'

/**
 * PDF Viewer using react-pdf
 *
 * Based on sample: https://github.com/wojtekmaj/react-pdf/tree/main/sample/next-app/app
 */

import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PAGES_PER_LOAD = 10;

type PDFFile = string | File | null;

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PDFViewer({ file, width }: { file: PDFFile, width: number }): JSX.Element {
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


    function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }): void {
        setNumPages(nextNumPages);
        setDisplayedPages(Math.min(PAGES_PER_LOAD, nextNumPages));
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
                {Array.from(new Array(displayedPages), (_el, index) => (
                    <Page
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        width={width}
                        className="my-4 shadow-md shadow-black/50"
                        loading={null}
                    />
                ))}
            </Document>

            {numPages && displayedPages < numPages && (
                <div className="flex justify-center my-8">
                    <button
                        onClick={loadMorePages}
                        className="white-button border border-vtk-blue-600 hover:bg-vtk-blue-600 hover:text-white"
                    >
                        {t('document.load-more', { displayedPages, numPages })}
                    </button>
                </div>
            )}
        </div>
    );
}