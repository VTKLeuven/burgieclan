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
            <div className="vtk-shell pb-16">
                {/* Editorial page head: breadcrumb kicker, display title, and
                    the course facts as a right-aligned spec block. */}
                <div className="vtk-page-head">
                    <div>
                        <div className="vtk-page-kicker">
                            <DynamicBreadcrumb course={course} />
                        </div>

                        <div className="flex items-start gap-3">
                            <FavoriteButton
                                itemId={course.id}
                                itemType="course"
                                size={20}
                                className="mt-2"
                                onToggle={() => {
                                    refreshUser();
                                }}
                            />
                            <h1 className="vtk-page-title">{course.name}</h1>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-vtk-body">
                            <span className="vtk-badge vtk-badge-muted font-mono">{course.code}</span>

                            <span className="flex items-center gap-2">
                                <ChartPie size={15} className="text-vtk-muted" />
                                {course.credits} {t('credits')}
                            </span>

                            <span className="flex items-center gap-2">
                                <SemesterIndicator semesters={course.semesters} size={15} />
                                {Array.isArray(course.semesters)
                                    ? (course.semesters.includes("Semester 1") && course.semesters.includes("Semester 2"))
                                        ? t('Year course')
                                        : course.semesters.join(", ")
                                    : course.semesters}
                            </span>

                            <Link
                                href={`https://onderwijsaanbod.kuleuven.be/syllabi/n/${course.code}N.htm`}
                                className="vtk-link flex items-center gap-1.5"
                            >
                                <LinkIcon size={14} />
                                ECTS
                            </Link>
                        </div>
                    </div>

                    {/* Teachers */}
                    {course?.professors && course.professors.length > 0 && (
                        <div className="text-right">
                            <div className="vtk-label mb-2.5">{t('course-page.teachers')}</div>
                            <div className="flex justify-end -space-x-3">
                                {course.professors.map((p, index) => (
                                    <ProfessorDiv key={index} unumber={p} index={index} t={t} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Documents */}
                <div className="mt-8">
                    <DocumentSections courseId={course.id} />
                </div>

                {/* Comments */}
                <div className="mt-10 border-t border-vtk-line pt-8">
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