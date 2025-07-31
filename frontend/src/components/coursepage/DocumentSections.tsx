'use client'
import { useEffect, useState } from "react";
import DocumentCategoryPage from "@/components/coursepage/DocumentCategory";
import Loading from '@/app/[locale]/loading';
import { convertToDocumentCategory } from "@/utils/convertToEntity";
import type { DocumentCategory } from "@/types/entities";
import { useTranslation } from "react-i18next";
import { useApi } from "@/hooks/useApi";
import DownloadButton from "@/components/ui/DownloadButton";

export default function DocumentSections({ courseId }: { courseId: number }) {
    const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([]);
    const { t } = useTranslation();
    const { request, loading } = useApi();

    useEffect(() => {
        async function fetchDocumentCategories() {
            const result = await request('GET', '/api/document_categories');
            if (!result) {
                return null;
            }
            setDocumentCategories(result['hydra:member'].map(convertToDocumentCategory));
        }

        fetchDocumentCategories();
    }, [request]);

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
                <div className="ml-auto relative group">
                    <DownloadButton 
                        courses={[{ id: courseId }]} 
                        size={20}
                        className="inline-flex items-center justify-center w-10 h-10 p-0 primary-button"
                    />
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