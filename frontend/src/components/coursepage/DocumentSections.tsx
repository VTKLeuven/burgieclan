'use client'
import { useEffect, useState } from "react";
import DocumentCategoryPage from "@/components/coursepage/DocumentCategory";
import Loading from '@/app/[locale]/loading';
import { convertToDocumentCategory } from "@/utils/convertToEntity";
import type { DocumentCategory } from "@/types/entities";
import { useTranslation } from "react-i18next";
import { useApi } from "@/hooks/useApi";
import useDownloadContent from "@/hooks/useDownloadContent";
import { Download } from "lucide-react";

export default function DocumentSections({ courseId }: { courseId: number }) {
    const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([]);
    const { t } = useTranslation();
    const { request, loading } = useApi();
    const { downloadContent, loading: isDownloading } = useDownloadContent();

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

    const handleDownload = () => {
        if (courseId) {
            downloadContent({
                courseIds: [courseId]
            });
        }
    };

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
                <div className="ml-auto">
                    <button
                        onClick={handleDownload}
                        className="primary-button inline-flex items-center"
                    >
                        <Download className="sm:mr-2 w-5 h-5" />
                        <span className="hidden sm:inline">{isDownloading ? t('course-page.documents.downloading') : t('course-page.documents.download-all')}</span>
                    </button>
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