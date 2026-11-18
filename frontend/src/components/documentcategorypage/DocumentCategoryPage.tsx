'use client'

import PageHeader from "@/components/layout/PageHeader";
import DocumentList from "@/components/documentcategorypage/DocumentList";
import FavoriteDocuments from "@/components/documentcategorypage/FavoriteDocuments";
import CreateDocumentButton from "@/components/ui/CreateDocumentButton";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import type { Course, DocumentCategory } from "@/types/entities";
import { localizedCourseName } from '@/utils/courseName';
import Link from "next/link";
import { useTranslation } from 'react-i18next';

interface DocumentCategoryPageProps {
    category: DocumentCategory;
    course: Course;
}

/**
 * One folder of a course, as a Dopl list view: the breadcrumb and the one primary action in the
 * header, the folder's name with its course under it, your favourites from this folder pinned on
 * top, then every document as a row.
 */
export default function DocumentCategoryPage({ category, course }: DocumentCategoryPageProps) {
    const { i18n } = useTranslation();
    const courseName = localizedCourseName(course, i18n.language);

    return (
        <>
            <PageHeader
                breadcrumb={<DynamicBreadcrumb />}
                actions={<CreateDocumentButton initialData={{ course, category }} size={16} />}
            />

            <div className="vtk-shell">
                <h1 className="vtk-page-title">{category.name}</h1>
                <p className="vtk-page-subtitle m-0">
                    <Link href={`/course/${course.id}`} className="hover:text-fg hover:underline">
                        {courseName}
                    </Link>
                    {course.code && <span className="tabular"> · {course.code}</span>}
                </p>

                <div className="mt-6 grid gap-8">
                    <FavoriteDocuments category={category} course={course} />
                    <DocumentList category={category} course={course} />
                </div>
            </div>
        </>
    )
}
