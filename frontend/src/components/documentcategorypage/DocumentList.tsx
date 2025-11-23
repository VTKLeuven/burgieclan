import DocumentFilter from '@/components/documentcategorypage/DocumentFilter';
import DocumentListItem from '@/components/documentcategorypage/DocumentListItem';
import DocumentSort from '@/components/documentcategorypage/DocumentSort';
import { Checkbox } from '@/components/ui/Checkbox';
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import DownloadButton from '@/components/ui/DownloadButton';
import Pagination from '@/components/ui/Pagination';
import useRetrieveDocuments, { DocumentFilters, DocumentSortOptions } from '@/hooks/useRetrieveDocuments';
import type { Course, Document, DocumentCategory } from '@/types/entities';
import { LoaderCircle, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DocumentListProps {
    course?: Course;
    category?: DocumentCategory;
}

const DocumentList: React.FC<DocumentListProps> = ({ course, category }) => {
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [filters, setFilters] = useState<DocumentFilters>({});
    const [sort, setSort] = useState<DocumentSortOptions>({ field: 'name', direction: 'asc' });

    const { documents, loading, totalItems } = useRetrieveDocuments(
        page,
        itemsPerPage,
        course,
        category,
        false,
        filters,
        sort
    );

    const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
    const { t } = useTranslation();

    useEffect(() => {
        // Show amount of items per page based on screen size
        const updateItemsPerPage = () => {
            if (window.innerWidth < 768) {
                setItemsPerPage(50);
            } else {
                setItemsPerPage(50);
            }
        };

        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);

        return () => {
            window.removeEventListener('resize', updateItemsPerPage);
        };
    }, []);

    const handleToggleSelect = (document: Document) => {
        setSelectedDocuments(prev => {
            const isSelected = prev.some(doc => doc.id === document.id);
            if (isSelected) {
                return prev.filter(doc => doc.id !== document.id);
            } else {
                return [...prev, document];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedDocuments.length === documents.length) {
            setSelectedDocuments([]);
        } else {
            setSelectedDocuments([...documents]);
        }
    };

    const handleClearSelection = () => {
        setSelectedDocuments([]);
    };

    const isDocumentSelected = (document: Document) => {
        return selectedDocuments.some(doc => doc.id === document.id);
    };

    const handleSortChange = (newSort: DocumentSortOptions) => {
        setSort(newSort);
        setPage(1);
        setSelectedDocuments([]);
    };

    const handleFilterChange = (newFilters: DocumentFilters) => {
        setFilters(newFilters);
        setPage(1);
        setSelectedDocuments([]);
    };

    const handleClearFilters = () => {
        setFilters({});
        setPage(1);
        setSelectedDocuments([]);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        setSelectedDocuments([]);
    };

    const allSelected = documents.length > 0 && selectedDocuments.length === documents.length;

    return (
        <div className="mt-3 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3>{t('course-page.documents.header')}</h3>

                <div className="flex items-center space-x-2">
                    <CreateDocumentButton className='mx-0' initialData={{ course, category }} />

                    <DocumentFilter
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                        course={course}
                        category={category}
                    />

                    <DocumentSort
                        currentSort={sort}
                        onSortChange={handleSortChange}
                    />

                    {selectedDocuments.length > 0 && (
                        <div className="flex items-center space-x-2 ml-4">
                            <span className="text-sm text-gray-700">
                                {t('course-page.documents.selected', { amount: selectedDocuments.length })}
                            </span>
                            <DownloadButton
                                documents={selectedDocuments}
                                size={16}
                                showText={true}
                                className="px-3 py-2 bg-vtk-blue-400 hover:bg-vtk-blue-600 text-white hover:text-gray-300 text-sm"
                            />
                            <button
                                onClick={handleClearSelection}
                                className="p-2 text-gray-600 hover:text-gray-800 rounded-md"
                                title={t('course-page.documents.clear-selection')}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-lg shadow-sm">
                {loading ? (
                    <div className="flex justify-center items-center h-full py-12">
                        <LoaderCircle className="animate-spin text-vtk-blue-500" size={48} />
                    </div>
                ) : documents.length === 0 ? (
                    <p className='p-4'>{t('course-page.documents.no-documents')}</p>
                ) : (
                    <div>
                        {documents.length > 0 && (
                            <div className="mb-2 flex items-center">
                                <Checkbox
                                    label={allSelected ? t('course-page.documents.deselect-all') : t('course-page.documents.select-all')}
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                    className="text-sm pl-3"
                                />
                            </div>
                        )}

                        <div className="flex flex-col space-y-2">
                            {documents.map((document) => (
                                <DocumentListItem
                                    key={document.id}
                                    document={document}
                                    isSelected={isDocumentSelected(document)}
                                    onToggleSelect={handleToggleSelect}
                                />
                            ))}
                        </div>
                        <Pagination totalAmount={totalItems} currentPage={page} itemsPerPage={itemsPerPage} onPageChange={handlePageChange} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentList;