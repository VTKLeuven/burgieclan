'use client'
import Loading from '@/app/[locale]/loading';
import DocumentCategoryPage from "@/components/coursepage/DocumentCategory";
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import DownloadButton from "@/components/ui/DownloadButton";
import { HydraCollection, useApi } from "@/hooks/useApi";
import type { DocumentCategory } from "@/types/entities";
import { convertToDocumentCategory } from "@/utils/convertToEntity";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function DocumentSections({ courseId }: { courseId: number }) {
    const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([]);
    const { t, i18n } = useTranslation();
    const { request, loading } = useApi<HydraCollection<unknown>>();

    useEffect(() => {
        async function fetchDocumentCategories() {
            const lang = i18n.language;
            const result = await request('GET', `/api/document_categories?lang=${lang}`);
            if (!result) {
                return null;
            }
            setDocumentCategories(result['hydra:member'].map(convertToDocumentCategory));
        }

        fetchDocumentCategories();
    }, [request, i18n.language]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-24 w-full">
                <Loading />
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between gap-3 border-b border-vtk-line pb-3.5">
                <h2 className="m-0 text-xl font-semibold tracking-tight text-vtk-ink">
                    {t('course-page.files')}
                </h2>
                <div className="flex items-center gap-2">
                    <CreateDocumentButton
                        initialData={{ course: { id: courseId } }}
                        size={16}
                    />
                    <DownloadButton courses={[{ id: courseId }]} size={16} />
                </div>
            </div>
            <div className="vtk-card-grid mt-5">
                {documentCategories.map((category) => (
                    <DocumentCategoryPage
                        key={category.id}
                        title={category.name ?? ''}
                        href={`/course/${courseId}/documents/category/${category.id}`}
                    />
                ))}
            </div>
        </>
    );
}