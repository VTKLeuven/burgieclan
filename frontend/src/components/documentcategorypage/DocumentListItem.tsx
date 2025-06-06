import React from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useTranslation } from 'react-i18next';
import type { Document } from '@/types/entities';

interface DocumentListItemProps {
    document: Document;
}

const extractFilename = (contentUrl?: string): string => {
    if (!contentUrl) return '';
    const parts = contentUrl.split('/');
    return parts[parts.length - 1]; // Get the last part of the path
};

const DocumentListItem: React.FC<DocumentListItemProps> = ({ document }) => {
    const { t } = useTranslation();

    return (
        <div className="border p-3 rounded-md relative" key={document.id}>
            <div className="flex items-center">
                <div>
                    <Link
                        href={`/document/${document.id}`}
                        className="cursor-pointer hover:text-vtk-blue-600 hover:underline inline-block"
                    >
                        <h3 className="text-lg font-semibold m-0">{document.name}</h3>
                    </Link>
                    <div className="flex items-center text-xs text-gray-700 space-x-4">
                        <span className="truncate">{extractFilename(document.contentUrl)}</span>
                    </div>
                </div>

                <div className="flex-grow"></div>

                {document.underReview && (
                    <div className="mx-1">
                        <Badge text={t('document.under_review')} color="yellow" />
                    </div>
                )}

                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <p className="text-gray-500 text-xs whitespace-nowrap">{new Date(document.createDate!).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        })}</p>
                        {document.anonymous ? (
                            <span className="text-gray-600 text-sm">
                                {t('course-page.documents.anonymous')}
                            </span>
                        ) : (
                            <span className="text-gray-600 text-sm">
                                {document.creator?.fullName || document.creator?.username}
                            </span>
                        )}
                    </div>
                    <a
                        href={document.contentUrl}
                        download
                        className="p-2 bg-vtk-blue-500 hover:bg-vtk-blue-600 text-white rounded-md flex items-center justify-center"
                        title={t('course-page.documents.download')}
                    >
                        <Download size={20} />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default DocumentListItem;