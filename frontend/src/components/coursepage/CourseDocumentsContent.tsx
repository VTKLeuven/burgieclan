"use client";

import Loading from '@/components/loading/LoadingPage';
import { usePublishCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import DocumentCategoryPage from '@/components/documentcategorypage/DocumentCategoryPage';
import { readPreloadedApi, useApi } from '@/hooks/useApi';
import type { Course, DocumentCategory } from '@/types/entities';
import { convertToCourse, convertToDocumentCategory } from '@/utils/convertToEntity';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedCourseName } from '@/utils/courseName';

interface CourseDocumentsContentProps {
    courseId: number;
    categoryId: number;
}

export default function CourseDocumentsContent({ courseId, categoryId }: CourseDocumentsContentProps) {
    const { i18n } = useTranslation();
    const currentLocale = i18n.language;
    const courseEndpoint = `/api/courses/${courseId}?summary=true`;
    const categoryEndpoint = `/api/document_categories/${categoryId}?lang=${currentLocale}`;
    const [course, setCourse] = useState<Course | null>(() => {
        const preloaded = readPreloadedApi(courseEndpoint);
        return preloaded ? convertToCourse(preloaded) : null;
    });
    const [category, setCategory] = useState<DocumentCategory | null>(() => {
        const preloaded = readPreloadedApi(categoryEndpoint);
        return preloaded ? convertToDocumentCategory(preloaded) : null;
    });
    const { request } = useApi();

    useEffect(() => {
        async function getCourse() {
            if (course?.id === courseId) return;

            // The category page only renders course identity data in its heading/breadcrumb.
            // Avoid mapping comments, related courses, modules, and document counts again.
            const courseData = await request('GET', courseEndpoint);

            if (!courseData) {
                return null;
            }

            const convertedCourse = convertToCourse(courseData);
            setCourse(convertedCourse);
        }

        getCourse();
    }, [course?.id, courseEndpoint, courseId, request]);

    useEffect(() => {
        async function getCategory() {
            if (category?.id === categoryId) return;

            const categoryData = await request('GET', categoryEndpoint);

            if (!categoryData) {
                return null;
            }

            const convertedCategory = convertToDocumentCategory(categoryData);
            setCategory(convertedCategory);
        }

        getCategory();
    }, [category?.id, categoryEndpoint, categoryId, request]);

    // Feeds the folder tree and the breadcrumb in the layout, which cannot read this route.
    usePublishCurriculumLocation({ course: course ?? undefined, category: category ?? undefined });

    useEffect(() => {
        const courseName = localizedCourseName(course, currentLocale);
        if (courseName && category?.name) {
            document.title = `${courseName} - ${category.name} | Burgieclan`;
        }
    }, [course, currentLocale, category?.name]);

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
