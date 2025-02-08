'use client'

import { useState, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import type { PDFDocumentProxy } from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const options = {
    cMapUrl: '/cmaps/',
    standardFontDataUrl: '/standard_fonts/',
};

const maxWidth = 800;
const PAGES_PER_LOAD = 10;

type PDFFile = string | File | null;

export default function PDFViewer({ fileArg }: { fileArg: PDFFile }): JSX.Element {
    // PDF file to display
    const [file, setFile] = useState<PDFFile>(fileArg);

    // Total number of pages in the PDF
    const [numPages, setNumPages] = useState<number>();

    // Number of pages to display
    const [displayedPages, setDisplayedPages] = useState<number>(PAGES_PER_LOAD);

    // Used to scale pdf width to fit its parent container
    const [containerWidth, setContainerWidth] = useState<number>(0);

    useEffect(() => {
        const updateWidth = () => {
            const width = window.innerWidth;
            // Account for padding on mobile
            setContainerWidth(width > 768 ? Math.min(width * 0.9, maxWidth) : width - 32);
        };

        // Set initial width
        updateWidth();

        // Update width on resize
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    function onDocumentLoadSuccess({ numPages: nextNumPages }: PDFDocumentProxy): void {
        setNumPages(nextNumPages);
        setDisplayedPages(Math.min(PAGES_PER_LOAD, nextNumPages));
    }

    function loadMorePages(): void {
        if (numPages) {
            setDisplayedPages(prev => Math.min(prev + PAGES_PER_LOAD, numPages));
        }
    }

    return (
        <div className="w-full px-4 md:px-8">
            <div className="mx-auto max-w-screen-md">
                <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    options={options}
                    className="flex flex-col items-center"
                >
                    {Array.from(new Array(displayedPages), (_el, index) => (
                        <Page
                            key={`page_${index + 1}`}
                            pageNumber={index + 1}
                            width={containerWidth}
                            className="my-4 shadow-md shadow-black/50"
                        />
                    ))}
                </Document>

                {numPages && displayedPages < numPages && (
                    <div className="flex justify-center my-8">
                        <button
                            onClick={loadMorePages}
                            className="primary-button"
                        >
                            Load More Pages ({displayedPages} of {numPages})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}