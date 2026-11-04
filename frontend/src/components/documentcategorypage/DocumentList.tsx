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
    // Newest academic year first, so a course that has been collecting notes for a
    // decade opens on the material that is still relevant. `year` is stored as
    // "2024 - 2025", which sorts correctly as a string.
    const [sort, setSort] = useState<DocumentSortOptions>({ field: 'year', direction: 'desc' });

    const { documents, loading, totalItems } = useRetrieveDocuments(
        page,
        itemsPerPage,
        course,
        category,
        false,
        filters,
        sort,
        false,
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
        <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <h2 className="vtk-section-title">
                    {t('course-page.documents.header')}
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                    {selectedDocuments.length > 0 && (
                        <div className="mr-1 flex items-center gap-2">
                            <span className="text-sm text-vtk-body">
                                {t('course-page.documents.selected', { amount: selectedDocuments.length })}
                            </span>
                            <DownloadButton documents={selectedDocuments} size={15} showText={true} className="vtk-button-sm" />
                            <button
                                onClick={handleClearSelection}
                                className="vtk-icon-button h-8 w-8"
                                title={t('course-page.documents.clear-selection')}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

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

                    <CreateDocumentButton initialData={{ course, category }} size={16} />
                </div>
            </div>

            {/* Rows on the page itself, hairline between them, as the wireframes list documents. */}
            <div>
                {loading ? (
                    <div className="flex items-center justify-center py-14">
                        <LoaderCircle className="animate-spin text-vtk-muted" size={28} />
                    </div>
                ) : documents.length === 0 ? (
                    <p className="vtk-empty m-0">{t('course-page.documents.no-documents')}</p>
                ) : (
                    <>
                        <div className="flex items-center border-b border-vtk-line-2 px-2 pb-2.5">
                            <Checkbox
                                label={allSelected ? t('course-page.documents.deselect-all') : t('course-page.documents.select-all')}
                                checked={allSelected}
                                onChange={handleSelectAll}
                                className="my-0 text-[13px] text-vtk-muted"
                            />
                        </div>

                        <div className="[&>*]:border-b [&>*]:border-vtk-line-2">
                            {documents.map((document) => (
                                <DocumentListItem
                                    key={document.id}
                                    document={document}
                                    isSelected={isDocumentSelected(document)}
                                    onToggleSelect={handleToggleSelect}
                                />
                            ))}
                        </div>

                        <div className="px-2 py-4">
                            <Pagination totalAmount={totalItems} currentPage={page} itemsPerPage={itemsPerPage} onPageChange={handlePageChange} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DocumentList;
