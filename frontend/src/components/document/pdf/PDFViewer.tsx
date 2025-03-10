'use client'

/**
 * PDF Viewer using react-pdf
 *
 * Based on sample: https://github.com/wojtekmaj/react-pdf/tree/main/sample/next-app/app
 */

import { useState, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjsLib from "pdfjs-dist";

const PAGES_PER_LOAD = 10;

type PDFFile = string | File | null;

// PDF worker from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = require("pdfjs-dist/build/pdf.worker.min.mjs").toString();

export default function PDFViewer({ fileArg, width }: { fileArg: PDFFile, width: number }): JSX.Element {
    // PDF file to display
    const [file, setFile] = useState<PDFFile>(fileArg);

    // Total number of pages in the PDF
    const [numPages, setNumPages] = useState<number>();

    // Number of pages currently displayed
    const [displayedPages, setDisplayedPages] = useState<number>(PAGES_PER_LOAD);

    // Options for GET requests to PDF files
    // Memoize the options object to prevent unnecessary rerenders
    const options = useMemo(() => ({
        cMapUrl: '/cmaps/',
        standardFontDataUrl: '/standard_fonts/',
        withCredentials: true,
    }), []); // Empty dependency array since these values never change


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
                loading={
                    <div className="p-4 text-italic">
                        Bringing your document to life...
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
                        Load More Pages ({displayedPages} of {numPages})
                    </button>
                </div>
            )}
        </div>
    );
}