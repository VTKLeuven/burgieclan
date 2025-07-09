import React from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useDownloadContent from '@/hooks/useDownloadContent';
import type { Program, Module, Course, Document } from '@/types/entities';

interface DownloadButtonProps {
    programs?: Program[];
    modules?: Module[];
    courses?: Course[];
    documents?: Document[];
    size?: number;
    className?: string;
    showText?: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
    programs = [],
    modules = [],
    courses = [],
    documents = [],
    size = 16,
    className = '',
    showText = false
}) => {
    const { t } = useTranslation();
    const { downloadContent, loading } = useDownloadContent();

    const hasContent = programs.length > 0 || modules.length > 0 || courses.length > 0 || documents.length > 0;

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering parent click events (like expanding nodes)

        if (!hasContent || loading) return;

        downloadContent({
            programIds: programs.map(p => p.id),
            moduleIds: modules.map(m => m.id),
            courseIds: courses.map(c => c.id),
            documents
        });
    };

    if (!hasContent) return null;

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className={`inline-flex items-center justify-center rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {loading ? (
                <LoaderCircle size={size} className="animate-spin" />
            ) : (
                <Download size={size} />
            )}
            {showText && (
                <span className="ml-1.5 text-sm">
                    {loading ? t('download.downloading') : t('download.download')}
                </span>
            )}
        </button>
    );
};

export default DownloadButton;