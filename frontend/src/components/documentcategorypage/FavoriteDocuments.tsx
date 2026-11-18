'use client';

import Badge from '@/components/ui/Badge';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { useUser } from '@/components/UserContext';
import { useApi } from '@/hooks/useApi';
import type { Course, Document, DocumentCategory } from '@/types/entities';
import { convertToDocument } from '@/utils/convertToEntity';
import { captureException } from '@sentry/nextjs';
import SectionHeader from '@/components/ui/SectionHeader';
import { ChevronRight, FileText, Star } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FavoriteDocumentsProps {
    category: DocumentCategory;
    course: Course;
}

const FavoriteDocuments: React.FC<FavoriteDocumentsProps> = ({ category, course }) => {
    const { user, loading: userLoading } = useUser();
    const { t } = useTranslation();
    const { request } = useApi();
    const [favoriteDocuments, setFavoriteDocuments] = useState<Document[]>([]);
    const [favoriteDocumentCount, setFavoriteDocumentCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavoriteDocuments = async () => {
            if (!user?.favoriteDocuments || user.favoriteDocuments.length === 0) {
                setFavoriteDocumentCount(0);
                setLoading(false);
                return;
            }

            // Filter potential favorites by course and category
            const potentialFavorites = user.favoriteDocuments.filter(
                doc => doc.course?.id === course.id && doc.category?.id === category.id
            );
            setFavoriteDocumentCount(potentialFavorites.length);

            if (potentialFavorites.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // Only four cards are rendered. Fetching details for every matching favorite
                // made large favorite libraries generate a hidden request fan-out.
                const documentPromises = potentialFavorites.slice(0, 4).map(doc =>
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
        // Nothing until it is known whether there is anything to show, so the list below does
        // not jump down and back up.
        return null;
    }

    if (favoriteDocuments.length === 0) {
        return null; // Don't show if no favorites match the current course/category
    }

    return (
        <section aria-labelledby="favorite-documents-heading">
            <SectionHeader
                id="favorite-documents-heading"
                icon={<Star className="fill-star text-star!" />}
                title={t('course-page.documents.header-favorites')}
                count={favoriteDocumentCount}
                action={favoriteDocumentCount > 4 && (
                    <Link href="/account" className="flex items-center gap-1 text-small font-medium text-fg-muted hover:text-fg">
                        {t('course-page.documents.favorites-see-all')}
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                )}
            />

            <div className="vtk-list">
                {favoriteDocuments.slice(0, 4).map((document) => (
                    <div key={document.id} className="group/row vtk-list-row vtk-list-row-hover">
                        <FileText className="size-4 shrink-0 text-icon" aria-hidden="true" />
                        <Link href={`/document/${document.id}`} className="min-w-0 flex-1 truncate text-body font-medium text-fg hover:underline">
                            {document.name}
                        </Link>
                        {document.underReview && (
                            <Badge text={t('document.under_review')} color="yellow" />
                        )}
                        <span className="hidden max-w-40 shrink-0 truncate text-small text-fg-muted sm:block">
                            {document.anonymous
                                ? t('course-page.documents.anonymous')
                                : (document.creator?.fullName || document.creator?.username)}
                        </span>
                        <span className="flex shrink-0 items-center gap-0.5">
                            <FavoriteButton
                                itemId={document.id}
                                itemType="document"
                                className="vtk-icon-button"
                                onToggle={(isFavorite) => {
                                    if (!isFavorite) {
                                        setFavoriteDocuments(prev => prev.filter(doc => doc.id !== document.id));
                                        setFavoriteDocumentCount(prev => Math.max(0, prev - 1));
                                    }
                                }}
                            />
                            <span className="reveal-on-hover">
                                <DownloadButton documents={[document]} size={16} />
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FavoriteDocuments;
