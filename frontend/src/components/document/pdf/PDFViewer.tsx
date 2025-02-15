'use client'

/**
 * PDF Viewer using react-pdf
 *
 * Based on sample: https://github.com/wojtekmaj/react-pdf/tree/main/sample/next-app/app
 */

import { useState, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import type { PDFDocumentProxy } from 'pdfjs-dist';

const PAGES_PER_LOAD = 10;

type PDFFile = string | File | null;

// PDF worker from pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

export default function PDFViewer({ fileArg, width }: { fileArg: PDFFile, width: number }): JSX.Element {
    // PDF file to display
    const [file, setFile] = useState<PDFFile>(fileArg);

    // Total number of pages in the PDF
    const [numPages, setNumPages] = useState<number>();

    // Number of pages currently displayed
    const [displayedPages, setDisplayedPages] = useState<number>(PAGES_PER_LOAD);

    // Options for GET requests to PDF files
    const options = {
        cMapUrl: '/cmaps/',
        standardFontDataUrl: '/standard_fonts/',
        httpHeaders: {
            // Backend requires authentication to access PDFs
            // TODO: retrieve from context
            'Authorization': `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3Mzk2NTMzNzAsImV4cCI6MTczOTY1Njk3MCwicm9sZXMiOlsiUk9MRV9BRE1JTiJdLCJ1c2VybmFtZSI6ImphbmVfYWRtaW4iLCJpZCI6MSwiZnVsbE5hbWUiOiJKYW5lIERvZSJ9.JF7Yh87__M3G6qseum13jIyP4M4lyh4ewPxNk3caSQaX941jKSrGZ5B92xnCSYl-dgMbX30HcJJVfYnafnULyk90gi9fOUVPdKhP5mO8cOx-CmWlYlqHy81CxSoj_UfanTd9ZHQgAfQr5ZDwVxD2uswbqvfVKTfLxGN0evXJezEKYi_GicfzWYyC63jHMrumIerlflz0Tz_xUXu1ykwIAr6g7kBaHZzqO0u8qtYM1E9LoJd1q5j7oGcayy6lvkVw3no-XoIHRyw-jdBhjUXEblKpEyEDW318pSqCU8AuIwE6awWvCSbGoLGO84UQ998SXQzYiKr9IEmDTNc2GUgehQ`,
        },
        withCredentials: true,
    };

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
        <div className="w-full">
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
                        width={width}
                        className="my-4 shadow-md shadow-black/50"
                    />
                ))}
            </Document>

            {numPages && displayedPages < numPages && (
                <div className="flex justify-center my-8">
                    <button
                        onClick={loadMorePages}
                        className="white-button border border-vtk-blue-600 hover:bg-vtk-blue-600 hover:text-white"
                    >
                        Load More Pages ({displayedPages} of {numPages})
                    </button>
                </div>
            )}
        </div>
    );
}