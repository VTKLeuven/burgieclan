import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Star } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useTranslation } from 'react-i18next';
import type { Document } from '@/types/entities';
import { Checkbox } from '@/components/ui/Checkbox';
import useDownloadContent from '@/hooks/useDownloadContent';
import { useUser } from '@/components/UserContext';
import { useFavorites } from '@/hooks/useFavorites';

interface DocumentListItemProps {
    document: Document;
    isSelected: boolean;
    onToggleSelect: (document: Document) => void;
}

const extractFilename = (contentUrl?: string): string => {
    if (!contentUrl) return '';
    const parts = contentUrl.split('/');
    return parts[parts.length - 1]; // Get the last part of the path
};

const DocumentListItem: React.FC<DocumentListItemProps> = ({ document, isSelected, onToggleSelect }) => {
    const { t } = useTranslation();
    const { downloadSingleDocument, loading: isDownloading } = useDownloadContent();
    const { user } = useUser();
    const { updateFavorite } = useFavorites(user);
    
    // Initialize local state from user data
    const [isFavorite, setIsFavorite] = useState(false);
    
    // Sync with user data on initial load
    useEffect(() => {
        const initialFavoriteState = user?.favoriteDocuments?.some(doc => doc.id === document.id) || false;
        setIsFavorite(initialFavoriteState);
    }, [user, document.id]);

    const handleDownload = (e: React.MouseEvent) => {
        e.preventDefault();
        downloadSingleDocument(document);
    };

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (user) {
            setIsFavorite(!isFavorite);
            updateFavorite(document.id, 'documents', !isFavorite);
        }
    };

    return (
        <div className="border p-3 rounded-md relative" key={document.id}>
            <div className="flex items-center">
                <div className="mr-3">
                    <Checkbox 
                        label=""
                        checked={isSelected}
                        onChange={() => onToggleSelect(document)}
                        aria-label={t('course-page.documents.select')}
                        className="my-0"
                    />
                </div>
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
                    <button
                        onClick={handleToggleFavorite}
                        className="p-2 rounded-full hover:bg-gray-100"
                        title={isFavorite ? t('course-page.documents.remove-favorite') : t('course-page.documents.add-favorite')}
                    >
                        <Star 
                            size={20} 
                            className={isFavorite 
                                ? "fill-yellow-500 text-yellow-500" 
                                : "text-gray-400 hover:text-gray-600"
                            } 
                        />
                    </button>
                    <div className="text-right">
                        <p className="text-gray-500 text-xs whitespace-nowrap">{new Date(document.updateDate!).toLocaleString('en-GB', {
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
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="p-2 bg-vtk-blue-500 hover:bg-vtk-blue-600 text-white rounded-md flex items-center justify-center"
                        title={t('course-page.documents.download')}
                    >
                        {isDownloading ? (
                            <span className="animate-spin h-5 w-5 border-t-2 border-white rounded-full" />
                        ) : (
                            <Download size={20} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentListItem;