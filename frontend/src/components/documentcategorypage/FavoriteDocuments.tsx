'use client';

import Loading from '@/app/[locale]/loading';
import Badge from '@/components/ui/Badge';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { useUser } from '@/components/UserContext';
import { useApi } from '@/hooks/useApi';
import type { Course, Document, DocumentCategory } from '@/types/entities';
import { convertToDocument } from '@/utils/convertToEntity';
import { captureException } from '@sentry/nextjs';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FavoriteDocumentsProps {
    category: DocumentCategory;
    course: Course;
}

const extractFilename = (contentUrl?: string): string => {
    if (!contentUrl) return '';
    const parts = contentUrl.split('/');
    return parts[parts.length - 1]; // Get the last part of the path
};

const FavoriteDocuments: React.FC<FavoriteDocumentsProps> = ({ category, course }) => {
    const { user, loading: userLoading } = useUser();
    const { t } = useTranslation();
    const { request } = useApi();
    const [favoriteDocuments, setFavoriteDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavoriteDocuments = async () => {
            if (!user?.favoriteDocuments || user.favoriteDocuments.length === 0) {
                setLoading(false);
                return;
            }

            // Filter potential favorites by course and category
            const potentialFavorites = user.favoriteDocuments.filter(
                doc => doc.course?.id === course.id && doc.category?.id === category.id
            );

            if (potentialFavorites.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // Fetch all document details in parallel
                const documentPromises = potentialFavorites.map(doc =>
                    request('GET', `/api/documents/${doc.id}`)
                );

                const documentsData = await Promise.all(documentPromises);

                // Convert the API responses to Document objects
                const documents = documentsData
                    .filter(Boolean) // Filter out any null responses
                    .map(docData => convertToDocument(docData));

                setFavoriteDocuments(documents);
            } catch (error) {
                captureException(
                    error instanceof Error ? error : new Error(String(error)),
                    {
                        extra: { context: "Error fetching favorite documents" },
                    }
                );
            } finally {
                setLoading(false);
            }
        };

        if (!userLoading) {
            fetchFavoriteDocuments();
        }
    }, [user?.favoriteDocuments, course.id, category.id, userLoading, request]);

    if (userLoading || loading) {
        return <div className="my-6"><Loading /></div>;
    }

    if (favoriteDocuments.length === 0) {
        return null; // Don't show if no favorites match the current course/category
    }

    return (
        <div className="mt-3 rounded-lg">
            <div className="flex justify-between items-center">
                <h3>{t('course-page.documents.header-favorites')}</h3>
                {favoriteDocuments.length > 3 && (
                    <Link
                        href="/account"
                        className="flex items-center text-sm text-vtk-blue-500 hover:text-vtk-blue-700"
                    >
                        {t('course-page.documents.favorites-see-all')}
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto pb-2">
                {favoriteDocuments.slice(0, 4).map((document) => (
                    <div
                        key={document.id}
                        className="relative bg-white rounded-lg border border-gray-200 p-3"
                    >
                        <Link
                            href={`/document/${document.id}`}
                            className="block"
                        >
                            <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 truncate">{document.name}</h4>
                                {document.underReview && (
                                    <Badge text={t('document.under_review')} color="yellow" />
                                )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                                {extractFilename(document.contentUrl)}
                            </p>

                            <div className="text-xs text-gray-500 flex justify-between mt-1">
                                <p className="whitespace-nowrap">
                                    {document.updatedAt && new Date(document.updatedAt).toLocaleString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    })}
                                </p>
                                <p className="truncate ml-2">
                                    {document.anonymous
                                        ? t('course-page.documents.anonymous')
                                        : (document.creator?.fullName || document.creator?.username)}
                                </p>
                            </div>
                        </Link>

                        <div className="flex justify-between pt-3 border-t border-gray-100">
                            <FavoriteButton
                                itemId={document.id}
                                itemType="document"
                                onToggle={(isFavorite) => {
                                    if (!isFavorite) {
                                        // Remove from local state when unfavorited
                                        setFavoriteDocuments(prev =>
                                            prev.filter(doc => doc.id !== document.id)
                                        );
                                    }
                                }}
                            />

                            <DownloadButton 
                                documents={[document]} 
                                className="p-1 bg-vtk-blue-400 hover:bg-vtk-blue-600 text-white hover:text-gray-300 rounded-md flex items-center justify-center"
                                size={16}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FavoriteDocuments;