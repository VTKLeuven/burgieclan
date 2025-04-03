'use client'
import { useEffect, useState } from "react";
import CoursePageSection from "./DocumentCategory";
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:mt-5 transform scale-90 origin-left">
                {documentCategories.map((category) => (
                    <CoursePageSection
                        key={category.id}
                        title={category.name ?? ''}
                        href={`/courses/${courseId}/documents?category=${category.id}`}
                    />
                ))}
            </div>
        </>
    );
}