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
            <div className="flex items-center gap-2">
                <h2 className="mr-2">{t('course-page.files')}</h2>
                <div className="ml-auto flex items-center gap-2">
                    <div className="relative group">
                        <CreateDocumentButton 
                        initialData={{ course: { id: courseId } }} 
                        size={20}
                        className="h-10" />
                    </div>
                    <div className="relative group">
                        <DownloadButton
                            courses={[{ id: courseId }]}
                            size={20}
                            className="inline-flex items-center justify-center w-10 h-10 p-0 primary-button"
                        />
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-6 md:mt-5">
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