"use client";

import Loading from '@/app/[locale]/loading';
import DocumentCategoryPage from '@/components/documentcategorypage/DocumentCategoryPage';
import { useApi } from '@/hooks/useApi';
import type { Course, DocumentCategory } from '@/types/entities';
import { convertToCourse, convertToDocumentCategory } from '@/utils/convertToEntity';
import { useEffect, useState } from 'react';

interface CourseDocumentsContentProps {
    courseId: number;
    categoryId: number;
}

export default function CourseDocumentsContent({ courseId, categoryId }: CourseDocumentsContentProps) {
    const [course, setCourse] = useState<Course | null>(null);
    const [category, setCategory] = useState<DocumentCategory | null>(null);
    const { request } = useApi();

    useEffect(() => {
        async function getCourse() {
            const courseData = await request('GET', `/api/courses/${courseId}`);

            if (!courseData) {
                return null;
            }

            const course = convertToCourse(courseData);
            setCourse(course);
        }

        getCourse();
    }, [courseId, request]);

    useEffect(() => {
        async function getCategory() {
            const categoryData = await request('GET', `/api/document_categories/${categoryId}`);

            if (!categoryData) {
                return null;
            }

            const category = convertToDocumentCategory(categoryData);
            setCategory(category);
        }

        getCategory();
    }, [categoryId, request]);

    useEffect(() => {
        if (course?.name && category?.name) {
            document.title = `${course.name} - ${category.name} | Burgieclan`;
        }
    }, [course?.name, category?.name]);

    if (!course || !category) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <Loading />
            </div>
        );
    }

    return (
        <div className="flex h-full w-full items-center justify-center">
            <DocumentCategoryPage category={category} course={course} />
        </div>
    );
}
