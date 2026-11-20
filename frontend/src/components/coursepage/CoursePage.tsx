'use client';

import Loading from '@/components/loading/LoadingPage';
import CoursePlacement from "@/components/curriculum/CoursePlacement";
import { useCurriculumLocation, usePublishCurriculumLocation } from "@/components/curriculum/CurriculumLocationContext";
import CommentCategories from "@/components/coursepage/comment/CommentCategories";
import DocumentSections from "@/components/coursepage/DocumentSections";
import ExamSection from "@/components/coursepage/exam/ExamSection";
import { useFeature } from "@/components/FeaturesContext";
import ProfessorDiv from "@/components/coursepage/ProfessorDiv";
import RelatedCourses from "@/components/coursepage/RelatedCourses";
import ErrorPage from "@/components/error/ErrorPage";
import CreateDocumentButton from "@/components/ui/CreateDocumentButton";
import DownloadButton from "@/components/ui/DownloadButton";
import CurriculumPageHeader from "@/components/ui/DynamicBreadcrumb";
import FavoriteButton from "@/components/ui/FavoriteButton";
import SemesterIndicator from '@/components/ui/SemesterIndicator';
import { useApi } from "@/hooks/useApi";
import { usePreloadedApi } from '@/components/ApiSeed';
import { Course, CourseComment } from "@/types/entities";
import { convertToCourse } from "@/utils/convertToEntity";
import { ArrowUpRight, BookOpen } from "lucide-react";
import Link from '@/components/ui/Link';
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { courseTitle } from '@/utils/courseName';
import { apiEndpoints } from '@/utils/apiEndpoints';

function MetaDot() {
    return <span aria-hidden="true">·</span>;
}

export default function CoursePage() {
    const readPreloadedApi = usePreloadedApi();
    const { id: courseId } = useParams();
    const endpoint = apiEndpoints.course(String(courseId));
    const [course, setCourse] = useState<Course | null>(() => {
        const preloaded = readPreloadedApi(endpoint);
        return preloaded ? convertToCourse(preloaded) : null;
    });
    const { t } = useTranslation();
    const examsEnabled = useFeature('exam_reconstructions');
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
    const { activePath } = useCurriculumLocation();

    const courseName = courseTitle(course);

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

    if (!courseId || !course || (loading && !course)) {
        return (
            <>
                <CurriculumPageHeader />
                <Loading variant="course" />
            </>
        );
    }

    const semesters = course.semesters ?? [];
    const semesterLabel = semesters.includes("Semester 1") && semesters.includes("Semester 2")
        ? t('course-page.year-course')
        : semesters.join(", ");
    const professors = course.professors ?? [];

    return (
        <>
            <CurriculumPageHeader
                actions={
                    <>
                        <FavoriteButton itemId={course.id} itemType="course" size={18} className="vtk-icon-button" />
                        <DownloadButton courses={[course]} size={18} />
                        <CreateDocumentButton initialData={{ course }} size={16} />
                    </>
                }
            />

            <div className="page-in min-w-0 flex-1 px-4 pt-7 pb-16 md:px-8">
                <div className="mx-auto max-w-[960px]">
                    {/* Every fact about the course sits under its name, so the documents get the
                        full width of the page instead of sharing it with a properties column. */}
                    <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                        <div className="flex min-w-0 flex-1 basis-[26rem] items-start gap-3.5">
                            <span className="mt-0.5 hidden size-10 shrink-0 place-items-center rounded-card border border-border bg-surface shadow-card sm:grid">
                                <BookOpen className="size-5 text-icon-strong" strokeWidth={1.75} aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                <h1 className="vtk-page-title">{courseName}</h1>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-fg-muted">
                                    <span className="tabular">{course.code}</span>
                                    <MetaDot />
                                    <span>{course.credits} {t('credits')}</span>
                                    {semesterLabel && (
                                        <>
                                            <MetaDot />
                                            <span className="inline-flex items-center gap-1.5">
                                                <SemesterIndicator semesters={course.semesters} size={14} />
                                                {semesterLabel}
                                            </span>
                                        </>
                                    )}
                                    {activePath && (
                                        <>
                                            <MetaDot />
                                            <CoursePlacement />
                                        </>
                                    )}
                                    <MetaDot />
                                    <Link
                                        href={`https://onderwijsaanbod.kuleuven.be/syllabi/n/${course.code}N.htm`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 font-medium text-link hover:underline"
                                    >
                                        {t('course-page.ects-sheet')}
                                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {professors.length > 0 && (
                            <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                                <span className="text-caption font-medium text-fg-muted">{t('course-page.teachers')}</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {professors.map((p, index) => (
                                        <ProfessorDiv key={p} unumber={p} index={index} size={36} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <RelatedCourses course={course} />

                    <div className="mt-8 grid gap-10">
                        <DocumentSections course={course} documentCounts={course.documentCounts} />
                        {examsEnabled && <ExamSection courseId={course.id} />}
                        <CommentCategories
                            comments={course.courseComments ?? []}
                            courseId={course.id}
                            course={course}
                            onCommentsUpdate={handleCommentsUpdate}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}
