'use client';

import Loading from '@/app/[locale]/loading';
import CommentCategories from "@/components/coursepage/comment/CommentCategories";
import DocumentSections from "@/components/coursepage/DocumentSections";
import ProfessorDiv from "@/components/coursepage/ProfessorDiv";
import ErrorPage from "@/components/error/ErrorPage";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import FavoriteButton from "@/components/ui/FavoriteButton";
import SemesterIndicator from '@/components/ui/SemesterIndicator';
import { useUser } from '@/components/UserContext';
import { useApi } from "@/hooks/useApi";
import { Course, CourseComment } from "@/types/entities";
import { convertToCourse } from "@/utils/convertToEntity";
import { ChartPie, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function CoursePage() {
    const { id: courseId } = useParams();
    const [course, setCourse] = useState<Course | null>(null);
    const { loading: userLoading, refreshUser } = useUser();
    const { t } = useTranslation();
    const { request, loading, error } = useApi();

    useEffect(() => {
        async function getCourse() {
            const courseData = await request('GET', `/api/courses/${courseId}`);

            if (!courseData) {
                return null;
            }

            const course = convertToCourse(courseData);
            setCourse(course);
        }

        // Only fetch the course when user data is loaded
        if (!userLoading) {
            getCourse();
        }
    }, [courseId, userLoading, request]);

    useEffect(() => {
        if (course?.name) {
            document.title = `${course.name} | Burgieclan`;
        }
    }, [course?.name]);

    const handleCommentsUpdate = (newComments: CourseComment[]) => {
        if (course) {
            setCourse({
                ...course,
                courseComments: newComments
            });
        }
    };

    // Show loading state
    if (!courseId || loading) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <Loading />
            </div>
        );
    }

    if (error) {
        return <ErrorPage status={error.status} detail={error.message} />;
    }

    return (course &&
        <>
            <div className="w-full h-full">
                <div className="bg-gray-100 border-b border-gray-200 px-6 py-4">
                    {/* Breadcrumb */}
                    <div className="mb-4">
                        <DynamicBreadcrumb course={course} />
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Course Info */}
                        <div className="lg:col-span-2">
                            {/* Course Title & Code */}
                            <div className="flex items-center gap-3 mb-2">
                                <FavoriteButton
                                    itemId={course.id}
                                    itemType="course"
                                    size={24}
                                    onToggle={() => {
                                        refreshUser();
                                    }}
                                />
                                <h1 className="text-3xl font-semibold text-gray-900">{course.name}</h1>
                                <span className="text-xl font-mono text-gray-600 pl-3 mt-2">
                                    {course.code}
                                </span>
                            </div>

                            {/* Course Metadata */}
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <ChartPie size={16} className="text-gray-400" />
                                    <span>{course.credits} {t('credits')}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <SemesterIndicator semesters={course.semesters} size={16} />
                                    <span>
                                        {Array.isArray(course.semesters)
                                            ? (course.semesters.includes("Semester 1") && course.semesters.includes("Semester 2"))
                                                ? t('Year course')
                                                : course.semesters.join(", ")
                                            : course.semesters}
                                    </span>
                                </div>

                                <Link
                                    href={`https://onderwijsaanbod.kuleuven.be/syllabi/n/${course.code}N.htm`}
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    <LinkIcon size={16} />
                                    <span>ECTS</span>
                                </Link>
                            </div>
                        </div>

                        {/* Right Column - Professors */}
                        <div className="lg:col-span-1">
                            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-1">{t('course-page.teachers')}</h3>
                            <div className="flex -space-x-3">
                                {course?.professors?.map((p, index) => (
                                    <ProfessorDiv key={index} unumber={p} index={index} t={t} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documents Section */}
                <div className="px-6 py-8">
                    <DocumentSections courseId={course.id} />
                </div>

                {/* Comments Section */}
                <div className="px-6 py-8 border-t border-gray-100">
                    <CommentCategories
                        comments={course.courseComments ?? []}
                        courseId={course.id}
                        onCommentsUpdate={handleCommentsUpdate}
                    />
                </div>
            </div>
        </>
    )
}