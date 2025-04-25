'use client'

import React, { useEffect, useState } from 'react';
import Loading from '@/app/[locale]/loading';
import { convertToCourse } from "@/utils/convertToEntity";
import type { Course } from '@/types/entities';
import { CourseRow } from '@/components/courses/CourseRow';
import { CourseTableHeader } from '@/components/courses/CourseTableHeader';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';

export default function CurriculumNavigator() {
    const [courses, setCourses] = useState<Course[]>([]);
    const { request, loading, error } = useApi();
    const { t } = useTranslation();

    useEffect(() => {
        const fetchData = async () => {
            const result = await request('GET', `/api/courses`);
            if (!result) {
                return null;
            }

            const fetchedCourses = result["hydra:member"].map((course: any) => convertToCourse(course));
            setCourses(fetchedCourses);
        };

        fetchData();
    }, [request]);

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8 text-wireframe-primary-blue">Curriculum Navigator</h1>

            <div className="border rounded-md">
                <CourseTableHeader />

                {error && (
                    <div className="py-4 text-center">
                        {t('unexpected')}
                    </div>
                )}

                {!error && (courses.length > 0 ? (
                    courses.map((course) => (
                        <CourseRow key={course.id} course={course} />
                    ))
                ) : (
                    <div className="py-4 text-center">
                        {t('curriculum-navigator.no-courses')}
                    </div>
                ))}
            </div>
        </div>
    );
}
