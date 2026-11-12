'use client'
import Loading from '@/components/loading/LoadingPage';
import DocumentCategoryPage from "@/components/coursepage/DocumentCategory";
import SectionHeader from '@/components/ui/SectionHeader';
import { HydraCollection, readPreloadedApi, useApi } from "@/hooks/useApi";
import type { Course, DocumentCategory } from "@/types/entities";
import { convertToDocumentCategory } from "@/utils/convertToEntity";
import { FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface DocumentSectionsProps {
    course: Course;
    documentCounts?: Record<number, number>;
}

export default function DocumentSections({ course, documentCounts }: DocumentSectionsProps) {
    const courseId = course.id;
    const { t, i18n } = useTranslation();
    const categoriesEndpoint = `/api/document_categories?lang=${i18n.language}`;
    const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>(() => {
        const preloaded = readPreloadedApi(categoriesEndpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member'].map(convertToDocumentCategory) ?? [];
    });
    const [showEmpty, setShowEmpty] = useState(false);
    const { request, loading } = useApi<HydraCollection<unknown>>();

    const countFor = (category: DocumentCategory) => documentCounts?.[category.id] ?? 0;

    useEffect(() => {
        if (documentCategories.length > 0) return;

        async function fetchDocumentCategories() {
            const result = await request('GET', categoriesEndpoint);
            if (!result) {
                return null;
            }
            setDocumentCategories(result['hydra:member'].map(convertToDocumentCategory));
        }

        fetchDocumentCategories();
    }, [categoriesEndpoint, documentCategories.length, request]);

    // The counts exclude documents still under review, so a category holding nothing but
    // pending uploads reads as empty here. That is why hiding is reversible rather than
    // absolute: whoever just uploaded can still reach the folder through the toggle.
    // convertToCourse leaves documentCounts undefined when the payload has no counts at
    // all. Every category would read as empty then, so fall back to showing the full grid
    // rather than blanking the section on a shape we did not expect.
    const hasCounts = documentCounts !== undefined;
    const emptyCategories = hasCounts
        ? documentCategories.filter((category) => countFor(category) === 0)
        : [];
    const visibleCategories = showEmpty || !hasCounts
        ? documentCategories
        : documentCategories.filter((category) => countFor(category) > 0);

    const total = documentCategories.reduce((sum, category) => sum + countFor(category), 0);

    return (
        <section aria-labelledby="documents-heading">
            <SectionHeader
                id="documents-heading"
                icon={<FolderOpen />}
                title={t('course-page.files')}
                count={hasCounts ? total : undefined}
                action={emptyCategories.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowEmpty((previous) => !previous)}
                        aria-expanded={showEmpty}
                        className="vtk-button vtk-button-sm vtk-button-ghost"
                    >
                        {showEmpty
                            ? t('course-page.hide-empty-categories')
                            : t('course-page.show-empty-categories', { count: emptyCategories.length })}
                    </button>
                )}
            />
            {loading ? (
                <Loading compact />
            ) : visibleCategories.length === 0 ? (
                <div className="vtk-panel vtk-empty">{t('course-page.no-documents-yet')}</div>
            ) : (
                <div className="vtk-list">
                    {visibleCategories.map((category) => (
                        <DocumentCategoryPage
                            key={category.id}
                            title={category.name ?? ''}
                            href={`/course/${courseId}/documents/category/${category.id}`}
                            apiEndpoints={[
                                `/api/courses/${courseId}?summary=true`,
                                `/api/document_categories/${category.id}?lang=${i18n.language}`,
                            ]}
                            count={countFor(category)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
