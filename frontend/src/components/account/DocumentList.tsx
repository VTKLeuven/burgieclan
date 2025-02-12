import React, { useState, useEffect } from 'react';
import useRetrieveDocuments from '@/hooks/useRetrieveDocuments';
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import Badge from '@/components/ui/Badge';
import { useTranslation } from 'react-i18next';
import Pagination from '@/components/ui/Pagination';

const DocumentList: React.FC = () => {
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const { documents, loading, totalItems } = useRetrieveDocuments(page, itemsPerPage);
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
        <CollapsibleSection header={<h3 className="text-xl font-semibold">Uploaded Documents <span className="text-sm">({totalItems})</span></h3>}>
            <div className="rounded-lg shadow-sm">
                {loading ?
                    <div className="flex justify-center items-center h-full">
                        <LoaderCircle className="animate-spin text-vtk-blue-500" size={48} />
                    </div>
                    : documents.length === 0 ? (
                        <p className='p-4'>{t('account.documents.no_uploads')}</p>
                    ) : (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                {documents.map((document) => (
                                    <Link
                                        href={`/document/${document.id}`}
                                        key={document.id}
                                    >
                                        <div className="border p-4 rounded-md shadow-sm relative hover:shadow-md transition-shadow cursor-pointer">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-xl font-semibold truncate">{document.name}</h3>
                                                {document.underReview ? (
                                                    <Badge text={t('document.under_review')} color="yellow" />
                                                ) : (
                                                    <Badge text={t('document.approved')} color="green" />
                                                )}
                                            </div>
                                            <p className="text-gray-700 truncate max-w-[75%]">{document.course!.name}</p>
                                            {/* TODO add rating */}
                                            <p className="text-gray-700 truncate max-w-[65%]">{document.category!.name}</p>
                                            <p className="text-gray-500 text-xs absolute bottom-2 right-2">{new Date(document.createDate!).toLocaleString('en-GB', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false
                                            })}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <Pagination totalAmount={totalItems} currentPage={page} itemsPerPage={itemsPerPage} onPageChange={setPage} />
                        </div>
                    )}
            </div>
        </CollapsibleSection>
    );
};

export default DocumentList;