import React, { useState, useEffect } from 'react';
import useRetrieveDocuments from '@/hooks/useRetrieveDocuments';
import Link from 'next/link';
import { LoaderCircle, Download } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useTranslation } from 'react-i18next';
import Pagination from '@/components/ui/Pagination';
import type { Course, DocumentCategory } from '@/types/entities';

interface DocumentListProps {
    course?: Course;
    category?: DocumentCategory;
}

const extractFilename = (contentUrl?: string): string => {
    if (!contentUrl) return '';
    const parts = contentUrl.split('/');
    return parts[parts.length - 1]; // Get the last part of the path
};

const DocumentList: React.FC<DocumentListProps> = ({ course, category }) => {
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const { documents, loading, totalItems } = useRetrieveDocuments(page, itemsPerPage, course, category, false);
    const { t } = useTranslation();

    useEffect(() => {
        // Show only 10 items per page on small screens, 20 on larger screens
        const updateItemsPerPage = () => {
            if (window.innerWidth < 768) {
                setItemsPerPage(10);
            } else {
                setItemsPerPage(20);
            }
        };

        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);

        return () => {
            window.removeEventListener('resize', updateItemsPerPage);
        };
    }, []);

    return (
        <div className="mt-6 rounded-lg">
                <h2 className="text-xl font-semibold">{t('course-page.documents.header')} <span className="text-sm">({totalItems})</span></h2>
            <div className="rounded-lg shadow-sm">
                {loading ?
                    <div className="flex justify-center items-center h-full">
                        <LoaderCircle className="animate-spin text-vtk-blue-500" size={48} />
                    </div>
                    : documents.length === 0 ? (
                        <p className='p-4'>{t('course-page.documents.no-documents')}</p>
                    ) : (
                        <div>
                            <div className="flex flex-col space-y-2 px-4">
                                {documents.map((document) => (
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
                                ))}
                            </div>
                            <Pagination totalAmount={totalItems} currentPage={page} itemsPerPage={itemsPerPage} onPageChange={setPage} />
                        </div>
                    )}
            </div>
        </div>
    );
};

export default DocumentList;