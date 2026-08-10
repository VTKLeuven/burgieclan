'use client'

import DocumentList from "@/components/documentcategorypage/DocumentList";
import FavoriteDocuments from "@/components/documentcategorypage/FavoriteDocuments";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import type { Course, DocumentCategory } from "@/types/entities";
import { FileText } from "lucide-react";
import { localizedCourseName } from '@/utils/courseName';
import { useTranslation } from 'react-i18next';

interface DocumentCategoryPageProps {
    category: DocumentCategory;
    course: Course;
}

export default function DocumentCategoryPage({ category, course }: DocumentCategoryPageProps) {
    const { i18n } = useTranslation();
    return (
        <div className="vtk-shell pb-16">
            <div className="vtk-page-head">
                <div>
                    <div className="vtk-page-kicker">
                        <DynamicBreadcrumb course={course} category={category} />
                    </div>
                    <div className="flex items-start gap-3">
                        <FileText className="mt-1.5 h-6 w-6 shrink-0 text-vtk-muted" />
                        <h1 className="vtk-page-title">{category.name}</h1>
                    </div>
                    <p className="vtk-page-subtitle">{localizedCourseName(course, i18n.language)}</p>
                </div>
            </div>

            <div className="mt-7 grid gap-6">
                <FavoriteDocuments category={category} course={course} />

                <DocumentList category={category} course={course} />
            </div>
        </div>
    )
}