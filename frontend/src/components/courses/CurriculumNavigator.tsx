'use client'

import React, { useEffect, useState } from 'react';
import { ApiClient } from "@/actions/api";
import Loading from '@/app/[locale]/loading';
import { convertToCourse } from "@/utils/convertToEntity";
import type { Course } from '@/types/entities';
import { ApiError } from '@/utils/error/apiError';
import { CourseRow } from '@/components/courses/CourseRow';
import { CourseTableHeader } from '@/components/courses/CourseTableHeader';
import ErrorPage from '@/components/error/ErrorPage';

export default function CurriculumNavigator() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [error, setError] = useState<ApiError | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await ApiClient('GET', `/api/courses`);
                if (result.error) {
                    setError(new ApiError(result.error.message, result.error.status));
                    return;
                }

                const fetchedCourses = result["hydra:member"].map((course: any) => convertToCourse(course));
                setCourses(fetchedCourses);
            } catch (err) {
                setError(new ApiError((err as Error).message || "Unknown error", 500));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <Loading />;
    }

    if (error) {
        return <ErrorPage detail={error.message} status={error.status} />;
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8 text-wireframe-primary-blue">Curriculum Navigator</h1>

            <div className="border rounded-md">
                <CourseTableHeader />

                {courses.length > 0 ? (
                    courses.map((course) => (
                        <CourseRow key={course.id} course={course} />
                    ))
                ) : (
                    <div className="py-4 text-center">
                        No courses found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
}
