'use client'

import useDownloadContent from "@/hooks/useDownloadContent";
import type { Document } from "@/types/entities";
import { Download, Loader } from "lucide-react";
import { formatFileSize } from "@/utils/fileSize";
import { useTranslation } from 'react-i18next';

interface DownloadButtonProps {
    document: Document;            // The document to download
    fileSize?: string;
    disabled?: boolean;          // Whether the button is disabled
}

export default function DownloadSingleDocumentButton({document, fileSize, disabled = false,}: DownloadButtonProps) {
    const { downloadContent, loading: isDownloading } = useDownloadContent();
    const { t } = useTranslation();

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
            type="button"
            className="vtk-button vtk-button-sm"
            onClick={handleDownload}
            disabled={disabled || isDownloading}
            title={t('download.title', { name: document.name, size: formattedFileSize })}
        >
            {isDownloading
                ? <Loader className="size-4 animate-spin" aria-hidden="true" />
                : <Download className="size-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{t('download.download')}</span>
            {formattedFileSize && <span className="hidden text-fg-muted tabular md:inline">{formattedFileSize}</span>}
        </button>
    );
}
