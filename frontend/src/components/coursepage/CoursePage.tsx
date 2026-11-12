'use client';

import Loading from '@/components/loading/LoadingPage';
import CoursePlacement from "@/components/curriculum/CoursePlacement";
import { usePublishCurriculumLocation } from "@/components/curriculum/CurriculumLocationContext";
import CommentCategories from "@/components/coursepage/comment/CommentCategories";
import DocumentSections from "@/components/coursepage/DocumentSections";
import ExamSection from "@/components/coursepage/exam/ExamSection";
import ProfessorDiv from "@/components/coursepage/ProfessorDiv";
import RelatedCourses from "@/components/coursepage/RelatedCourses";
import ErrorPage from "@/components/error/ErrorPage";
import PageHeader from "@/components/layout/PageHeader";
import CourseBadge from "@/components/layout/CourseBadge";
import CreateDocumentButton from "@/components/ui/CreateDocumentButton";
import DownloadButton from "@/components/ui/DownloadButton";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import FavoriteButton from "@/components/ui/FavoriteButton";
import SemesterIndicator from '@/components/ui/SemesterIndicator';
import { readPreloadedApi, useApi } from "@/hooks/useApi";
import { Course, CourseComment } from "@/types/entities";
import { convertToCourse } from "@/utils/convertToEntity";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { localizedCourseName } from '@/utils/courseName';

/** One label/value line of the properties sidebar, as on a Dopl item page. */
function Property({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-3 py-1.5">
            <dt className="pt-0.5 text-small text-fg-muted">{label}</dt>
            <dd className="m-0 min-w-0 text-body text-fg [overflow-wrap:anywhere]">{children}</dd>
        </div>
    );
}

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

    if (!courseId || !course || (loading && !course)) {
        return (
            <>
                <PageHeader breadcrumb={<DynamicBreadcrumb />} />
                <Loading />
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
            <PageHeader
                breadcrumb={<DynamicBreadcrumb />}
                actions={
                    <>
                        <FavoriteButton itemId={course.id} itemType="course" size={18} className="vtk-icon-button" />
                        <DownloadButton courses={[course]} size={18} />
                        <CreateDocumentButton initialData={{ course }} size={16} />
                    </>
                }
            />

            {/* Dopl's item page: the content in a main column, the facts in a sidebar beside it. */}
            <div className="flex flex-1 flex-col lg:flex-row">
                <div className="min-w-0 flex-1 px-4 pt-7 pb-16 md:px-8">
                    <div className="mx-auto max-w-[880px]">
                        <div className="flex items-start gap-3.5">
                            <CourseBadge name={courseName} seed={course.code} size={40} className="mt-0.5 hidden rounded-card sm:inline-flex" />
                            <div className="min-w-0">
                                <h1 className="vtk-page-title">{courseName}</h1>
                                <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 text-body text-fg-muted">
                                    <span className="tabular">{course.code}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{course.credits} {t('credits')}</span>
                                    {semesterLabel && (
                                        <>
                                            <span aria-hidden="true">·</span>
                                            <span>{semesterLabel}</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        <RelatedCourses course={course} />

                        <div className="mt-8 grid gap-10">
                            <DocumentSections course={course} documentCounts={course.documentCounts} />
                            <ExamSection courseId={course.id} />
                            <CommentCategories
                                comments={course.courseComments ?? []}
                                courseId={course.id}
                                onCommentsUpdate={handleCommentsUpdate}
                            />
                        </div>
                    </div>
                </div>

                <aside className="shrink-0 border-t border-border px-4 py-6 md:px-8 lg:w-[300px] lg:border-t-0 lg:border-l lg:px-6">
                    <div className="lg:sticky lg:top-[calc(var(--header-height)+24px)]">
                        <dl className="m-0">
                            <Property label="Code">
                                <span className="tabular">{course.code}</span>
                            </Property>
                            <Property label={t('curriculum-navigator.credits')}>
                                <span className="tabular">{course.credits}</span>
                            </Property>
                            {semesterLabel && (
                                <Property label={t('curriculum-navigator.semester')}>
                                    <span className="flex items-center gap-2">
                                        <SemesterIndicator semesters={course.semesters} size={14} />
                                        {semesterLabel}
                                    </span>
                                </Property>
                            )}
                            {professors.length > 0 && (
                                <Property label={t('course-page.teachers')}>
                                    <div className="flex flex-col">
                                        {professors.map((p, index) => (
                                            <ProfessorDiv key={p} unumber={p} index={index} size={24} variant="row" />
                                        ))}
                                    </div>
                                </Property>
                            )}
                            <CoursePlacement />
                        </dl>

                        <div className="mt-4 border-t border-border pt-4">
                            <Link
                                href={`https://onderwijsaanbod.kuleuven.be/syllabi/n/${course.code}N.htm`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-body font-medium text-link hover:underline"
                            >
                                {t('course-page.ects-sheet')}
                                <ArrowUpRight className="size-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    )
}
