import React, { useState, useEffect } from 'react';
import useRetrieveDocuments from '@/hooks/useRetrieveDocuments';
import useDownloadContent from '@/hooks/useDownloadContent';
import { LoaderCircle, Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from '@/components/ui/Pagination';
import DocumentListItem from './DocumentListItem';
import type { Course, DocumentCategory, Document } from '@/types/entities';
import { Checkbox } from '@/components/ui/Checkbox';

interface DocumentListProps {
    course?: Course;
    category?: DocumentCategory;
}

const DocumentList: React.FC<DocumentListProps> = ({ course, category }) => {
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const { documents, loading, totalItems } = useRetrieveDocuments(page, itemsPerPage, course, category, false);
    const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
    const { t } = useTranslation();
    const { downloadContent, loading: isDownloading, error: downloadError } = useDownloadContent();

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

    // Reset selection when documents change
    useEffect(() => {
        setSelectedDocuments([]);
    }, [documents]);

    // Log download errors
    useEffect(() => {
        if (downloadError) {
            console.error('Download error:', downloadError);
            // You could add a toast notification here
        }
    }, [downloadError]);

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

    const handleDownloadSelected = () => {
        if (selectedDocuments.length > 0) {         
            downloadContent({
                documents: selectedDocuments,
            });
        }
    };

    const isDocumentSelected = (document: Document) => {
        return selectedDocuments.some(doc => doc.id === document.id);
    };

    const allSelected = documents.length > 0 && selectedDocuments.length === documents.length;

    return (
        <div className="mt-6 rounded-lg">
            <div className="flex justify-between items-center mb-3">
                <h3>{t('course-page.documents.header')} <span className="text-sm">({totalItems})</span></h3>
                
                {selectedDocuments.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">
                            {t('course-page.documents.selected', { amount: selectedDocuments.length })}
                        </span>
                        <button
                            onClick={handleDownloadSelected}
                            disabled={isDownloading}
                            className="px-3 py-2 bg-vtk-blue-500 hover:bg-vtk-blue-600 text-white rounded-md flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('course-page.documents.download-selected')}
                        >
                            <Download size={16} className={`mr-1 ${isDownloading ? 'animate-pulse' : ''}`} />
                            <span>{isDownloading ? t('course-page.documents.downloading') : t('course-page.documents.download')}</span>
                        </button>
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
            
            <div className="rounded-lg shadow-sm">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
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
                        <Pagination totalAmount={totalItems} currentPage={page} itemsPerPage={itemsPerPage} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentList;