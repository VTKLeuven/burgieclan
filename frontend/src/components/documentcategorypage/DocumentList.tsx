import React, { useState, useEffect } from 'react';
import useRetrieveDocuments from '@/hooks/useRetrieveDocuments';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from '@/components/ui/Pagination';
import DocumentListItem from './DocumentListItem';
import type { Course, DocumentCategory } from '@/types/entities';

interface DocumentListProps {
    course?: Course;
    category?: DocumentCategory;
}

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
                <h3>{t('course-page.documents.header')} <span className="text-sm">({totalItems})</span></h3>
            <div className="rounded-lg shadow-sm">
                {loading ?
                    <div className="flex justify-center items-center h-full">
                        <LoaderCircle className="animate-spin text-vtk-blue-500" size={48} />
                    </div>
                    : documents.length === 0 ? (
                        <p className='p-4'>{t('course-page.documents.no-documents')}</p>
                    ) : (
                        <div>
                            <div className="flex flex-col space-y-2">
                                {documents.map((document) => (
                                    <DocumentListItem 
                                        key={document.id}
                                        document={document}
                                    />
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