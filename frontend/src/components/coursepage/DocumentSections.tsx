'use client'
import { useEffect, useState } from "react";
import DocumentCategoryPage from "@/components/coursepage/DocumentCategory";
import Loading from '@/app/[locale]/loading';
import { convertToDocumentCategory } from "@/utils/convertToEntity";
import type { DocumentCategory } from "@/types/entities";
import { useTranslation } from "react-i18next";
import { useApi } from "@/hooks/useApi";

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
            <h2> {t('course-page.files')} </h2>
            <div className="flex flex-wrap gap-6 md:mt-5">
                {documentCategories.map((category) => (
                    <DocumentCategoryPage
                        key={category.id}
                        title={category.name ?? ''}
                        href={`/course/${courseId}/documents?category=${category.id}`}
                    />
                ))}
            </div>
        </>
    );
}