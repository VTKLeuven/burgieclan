'use client'

import DocumentList from "@/components/documentcategorypage/DocumentList";
import FavoriteDocuments from "@/components/documentcategorypage/FavoriteDocuments";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import PageHead from "@/components/ui/PageHead";
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
            <PageHead
                kicker={<DynamicBreadcrumb course={course} category={category} />}
                title={category.name}
                icon={FileText}
                subtitle={localizedCourseName(course, i18n.language)}
            />

            <div className="mt-7 grid gap-6">
                <FavoriteDocuments category={category} course={course} />

                <DocumentList category={category} course={course} />
            </div>
        </div>
    )
}