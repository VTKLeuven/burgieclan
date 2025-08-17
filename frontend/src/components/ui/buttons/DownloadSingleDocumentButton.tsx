'use client'

import useDownloadContent from "@/hooks/useDownloadContent";
import type { Document } from "@/types/entities";
import { Download, Loader } from "lucide-react";
import { formatFileSize } from "@/utils/fileSize";
import { useState } from "react";

interface DownloadButtonProps {
    document: Document;            // The document to download
    fileSize?: string;
    disabled?: boolean;          // Whether the button is disabled
}

export default function DownloadSingleDocumentButton({document, fileSize, disabled = false,}: DownloadButtonProps) {
    const { downloadContent, loading: isDownloading } = useDownloadContent();
    const [isHovered, setIsHovered] = useState(false); // Used to show file size on hover

    // Use the provided fileSize prop or format the document's fileSize
    const formattedFileSize = fileSize || (document.fileSize ? formatFileSize(document.fileSize) : "");

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering parent click events (like expanding nodes)
        if (disabled || isDownloading) return;

        downloadContent({
            documents: [document]
        });
    };

    return (
        <button
            className={`
                inline-flex items-center px-3 py-1 border rounded-2xl
                transition-all duration-300 ease-in-out
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                border-gray-500 relative
                ${isDownloading ? 'w-18' : `${isHovered ? 'w-24' : 'w-12'}`}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleDownload}
            disabled={disabled}
            title={`Download ${document.name} (${formattedFileSize})`}
        >
            <Download
                size={20}
                strokeWidth={isHovered && (!isDownloading) ? '2.5' : '1.5'}
                className={`
                    transition-all duration-300 text-gray-500
                    ${isHovered ? '-translate-x-1' : ''}
                    ${isDownloading ? 'opacity-0 duration-0' : 'opacity-100 duration-300'}
                `}
            />

            <span
                className={`
                    absolute
                    right-3
                    text-sm
                    font-semibold
                    text-gray-500
                    transition-opacity
                    ${isDownloading ? 'opacity-100 duration-300' : `${isHovered ? 'opacity-100 duration-300' : 'opacity-0 duration-0'}`}
                `}
            >
                {isDownloading
                    ? <Loader size={20} className="animate-spin" />
                    : formattedFileSize
                }
            </span>
        </button>
    );
}
