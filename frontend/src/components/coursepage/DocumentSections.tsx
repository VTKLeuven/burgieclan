'use client'
import { useEffect, useState } from "react";
import DocumentCategoryPage from "@/components/coursepage/DocumentCategory";
import Loading from '@/app/[locale]/loading';
import { convertToDocumentCategory } from "@/utils/convertToEntity";
import type { DocumentCategory } from "@/types/entities";
import { useTranslation } from "react-i18next";
import { useApi } from "@/hooks/useApi";
import useDownloadContent from "@/hooks/useDownloadContent";
import { Download, Loader2 } from "lucide-react";

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
                    <div className="relative group">
                        <button
                            onClick={handleDownload}
                            className="primary-button inline-flex items-center justify-center w-10 h-10 p-0"
                            disabled={isDownloading}
                        >
                            {isDownloading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Download className="w-5 h-5" />
                            )}
                        </button>
                        
                        {/* Tooltip */}
                        <div className="absolute top-full right-0 mt-2 bg-gray-900 text-white text-sm px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            {isDownloading ? t('course-page.documents.downloading') : t('course-page.documents.download-all')}
                        </div>
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