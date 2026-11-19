import DocumentFilter from '@/components/documentcategorypage/DocumentFilter';
import DocumentListItem from '@/components/documentcategorypage/DocumentListItem';
import DocumentSort from '@/components/documentcategorypage/DocumentSort';
import { Checkbox } from '@/components/ui/Checkbox';
import DownloadButton from '@/components/ui/DownloadButton';
import Pagination from '@/components/ui/Pagination';
import useRetrieveDocuments, { DocumentFilters, DocumentSortOptions } from '@/hooks/useRetrieveDocuments';
import type { Course, Document, DocumentCategory } from '@/types/entities';
import { RowsSkeleton } from '@/components/loading/LoadingPage';
import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DocumentListProps {
    course?: Course;
    category?: DocumentCategory;
    /** Extra controls at the right end of the toolbar, e.g. a link to the folder's own page. */
    toolbarEnd?: React.ReactNode;
}

const DocumentList: React.FC<DocumentListProps> = ({ course, category, toolbarEnd }) => {
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
        <section aria-label={t('course-page.documents.header')}>
            {/* Toolbar: filter and sort on the left, the selection's own actions on the right. */}
            <div className="mb-3 flex min-h-8 flex-wrap items-center gap-2">
                <DocumentFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    course={course}
                    category={category}
                />
                <DocumentSort currentSort={sort} onSortChange={handleSortChange} />

                {selectedDocuments.length > 0 && (
                    <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-small text-fg-muted">
                            {t('course-page.documents.selected', { amount: selectedDocuments.length })}
                        </span>
                        <DownloadButton documents={selectedDocuments} size={16} showText={true} className="vtk-button-sm" />
                        <button
                            type="button"
                            onClick={handleClearSelection}
                            className="vtk-icon-button"
                            title={t('course-page.documents.clear-selection')}
                            aria-label={t('course-page.documents.clear-selection')}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                {toolbarEnd && (
                    <div className={selectedDocuments.length > 0 ? 'flex items-center' : 'ml-auto flex items-center'}>
                        {toolbarEnd}
                    </div>
                )}
            </div>

            <div className="vtk-panel overflow-hidden">
                {loading ? (
                    <RowsSkeleton rows={6} className="rounded-none border-0" />
                ) : documents.length === 0 ? (
                    <p className="vtk-empty m-0">{t('course-page.documents.no-documents')}</p>
                ) : (
                    <>
                        <div className="flex h-10 items-center gap-3 border-b border-border bg-surface-muted px-4">
                            <Checkbox
                                label={allSelected ? t('course-page.documents.deselect-all') : t('course-page.documents.select-all')}
                                checked={allSelected}
                                onChange={handleSelectAll}
                                className="my-0"
                                labelClassName="text-small font-medium text-fg-muted"
                            />
                            <span className="ml-auto text-small text-fg-muted tabular">
                                {totalItems === 1
                                    ? t('course-page.document-count.one')
                                    : t('course-page.document-count.other', { count: totalItems })}
                            </span>
                        </div>

                        <div className="vtk-rows">
                            {documents.map((document) => (
                                <DocumentListItem
                                    key={document.id}
                                    document={document}
                                    isSelected={isDocumentSelected(document)}
                                    onToggleSelect={handleToggleSelect}
                                />
                            ))}
                        </div>

                        {totalItems > itemsPerPage && (
                            <div className="border-t border-border px-4 py-3">
                                <Pagination totalAmount={totalItems} currentPage={page} itemsPerPage={itemsPerPage} onPageChange={handlePageChange} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default DocumentList;
