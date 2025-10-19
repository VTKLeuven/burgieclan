'use client'

import DocumentList from "@/components/documentcategorypage/DocumentList";
import FavoriteDocuments from "@/components/documentcategorypage/FavoriteDocuments";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import type { Course, DocumentCategory } from "@/types/entities";
import { FileText } from "lucide-react";

interface DocumentCategoryPageProps {
    category: DocumentCategory;
    course: Course;
}

export default function DocumentCategoryPage({ category, course }: DocumentCategoryPageProps) {
    return (
        <>
            <div className="w-full h-full">
                <div className="bg-wireframe-lightest-gray relative p-10 pt-5 md:pt-10">
                    {/* Breadcrumb */}
                    <div className="mb-4">
                        <DynamicBreadcrumb course={course} category={category} />
                    </div>

                    <div className="flex items-center space-x-2 mt-3">
                        <FileText className="h-8 w-8 text-wireframe-primary-blue" />
                        <h1 className="md:text-4xl text-3xl mb-4 text-wireframe-primary-blue">{category.name} {course.name}</h1>
                    </div>
                </div>

                <FavoriteDocuments category={category} course={course} />

                <DocumentList category={category} course={course} />
            </div>
        </>
    )
}