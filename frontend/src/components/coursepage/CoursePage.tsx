'use client';

import Loading from '@/components/loading/LoadingPage';
import CoursePlacement from "@/components/curriculum/CoursePlacement";
import { usePublishCurriculumLocation } from "@/components/curriculum/CurriculumLocationContext";
import CommentCategories from "@/components/coursepage/comment/CommentCategories";
import DocumentSections from "@/components/coursepage/DocumentSections";
import ProfessorDiv from "@/components/coursepage/ProfessorDiv";
import RelatedCourses from "@/components/coursepage/RelatedCourses";
import ErrorPage from "@/components/error/ErrorPage";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import PageHead from "@/components/ui/PageHead";
import FavoriteButton from "@/components/ui/FavoriteButton";
import SemesterIndicator from '@/components/ui/SemesterIndicator';
import { readPreloadedApi, useApi } from "@/hooks/useApi";
import { Course, CourseComment } from "@/types/entities";
import { convertToCourse } from "@/utils/convertToEntity";
import { ChartPie, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { localizedCourseName } from '@/utils/courseName';

export default function CoursePage() {
    const { id: courseId } = useParams();
    const endpoint = `/api/courses/${courseId}`;
    const [course, setCourse] = useState<Course | null>(() => {
        const preloaded = readPreloadedApi(endpoint);
        return preloaded ? convertToCourse(preloaded) : null;
    });
    const { t, i18n } = useTranslation();
    const { request, loading, error } = useApi();

    useEffect(() => {
        if (course?.id === Number(courseId)) return;

        let cancelled = false;

        async function getCourse() {
            const courseData = await request('GET', endpoint);

            if (cancelled || !courseData) {
                return null;
            }

            const fullCourse = convertToCourse(courseData);
            setCourse(fullCourse);
        }

        getCourse();

        return () => { cancelled = true; };
    }, [course?.id, courseId, endpoint, request]);

    // Feeds the folder tree and the breadcrumb in the layout, which cannot read this route.
    usePublishCurriculumLocation({ course: course ?? undefined });

    const courseName = localizedCourseName(course, i18n.language);

    useEffect(() => {
        if (courseName) {
            document.title = `${courseName} | Burgieclan`;
        }
    }, [courseName]);

    const handleCommentsUpdate = (newComments: CourseComment[]) => {
        if (course) {
            setCourse({
                ...course,
                courseComments: newComments
            });
        }
    };

    if (error) {
        return <ErrorPage status={error.status} detail={error.message} />;
    }

    // Show loading state only if we don't have course data yet
    if (!courseId || !course || (loading && !course)) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <Loading />
            </div>
        );
    }

    return (course &&
        <>
            <div className="vtk-shell pb-16">
                {/* Editorial page head: breadcrumb kicker, display title, and
                    the course facts as a right-aligned spec block. */}
                <PageHead
                    kicker={<DynamicBreadcrumb />}
                    title={courseName}
                    actions={
                        <FavoriteButton
                            itemId={course.id}
                            itemType="course"
                            size={20}
                            className="mt-2"
                        />
                    }
                    aside={
                        course?.professors && course.professors.length > 0 ? (
                            <div className="text-right">
                                <div className="vtk-label mb-2.5">{t('course-page.teachers')}</div>
                                <div className="flex justify-end -space-x-3">
                                    {course.professors.map((p, index) => (
                                        <ProfessorDiv key={index} unumber={p} index={index} />
                                    ))}
                                </div>
                            </div>
                        ) : undefined
                    }
                >
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-vtk-body">
                        <span className="vtk-badge vtk-badge-muted font-mono">{course.code}</span>

                        <span className="flex items-center gap-2">
                            <ChartPie size={15} className="text-vtk-muted" />
                            {course.credits} {t('credits')}
                        </span>

                        {/* Skipped entirely when the semester is unknown: the indicator renders
                            nothing in that case, so the span would be an empty flex item and
                            the row would show a stray gap. */}
                        {(course.semesters?.length ?? 0) > 0 && (
                            <span className="flex items-center gap-2">
                                <SemesterIndicator semesters={course.semesters} size={15} />
                                {course.semesters!.includes("Semester 1") && course.semesters!.includes("Semester 2")
                                    ? t('course-page.year-course')
                                    : course.semesters!.join(", ")}
                            </span>
                        )}

                        <Link
                            href={`https://onderwijsaanbod.kuleuven.be/syllabi/n/${course.code}N.htm`}
                            className="vtk-link flex items-center gap-1.5"
                        >
                            <LinkIcon size={14} />
                            ECTS
                        </Link>

                        <CoursePlacement />
                    </div>

                    <RelatedCourses course={course} />
                </PageHead>

                {/* Documents */}
                <div className="mt-8">
                    <DocumentSections course={course} documentCounts={course.documentCounts} />
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
