'use client'
import { useEffect, useState } from "react";
import DocumentCategoryPage from "@/components/coursepage/DocumentCategory";
import { ApiClient } from "@/actions/api";
import Loading from '@/app/[locale]/loading';
import { convertToDocumentCategory } from "@/utils/convertToEntity";
import type { DocumentCategory } from "@/types/entities";
import { useTranslation } from "react-i18next";

export default function DocumentSections({ courseId }: { courseId: number }) {
    const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { t } = useTranslation();

    useEffect(() => {
        async function fetchDocumentCategories() {
            setLoading(true);
            const result = await ApiClient('GET', '/api/document_categories');
            if (!result.error) {
                setDocumentCategories(result['hydra:member'].map(convertToDocumentCategory));
            }
            setLoading(false);
        }

        fetchDocumentCategories();
    }, []);

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
                        href={`/courses/${courseId}/documents?category=${category.id}`}
                    />
                ))}
            </div>
        </>
    );
}