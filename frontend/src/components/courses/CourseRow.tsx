import ProfessorDiv from '@/components/coursepage/ProfessorDiv';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import SemesterIndicator from "@/components/ui/SemesterIndicator";
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { useProgramLanguage } from '@/components/courses/ProgramLanguageContext';
import { useApi } from "@/hooks/useApi";
import type { Course } from '@/types/entities';
import { convertToCourse } from "@/utils/convertToEntity";
import { rememberBranch } from '@/utils/curriculumBranch';
import { captureException } from '@sentry/nextjs';
import { memo, useEffect, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import { useTranslation } from 'react-i18next';
import 'react-loading-skeleton/dist/skeleton.css';
import { localizedCourseName } from '@/utils/courseName';

interface CourseRowProps {
    course: Course;
    highlightMatch?: boolean;
    isFirstRow?: boolean;
    /**
     * The module this row is listed under. Half the courses are shared between programmes, so
     * without it the course page would have to guess which of them the reader came through.
     */
    moduleId?: number;
}

function hasCourseRowData(course: Course): boolean {
    return course.name !== undefined &&
        course.code !== undefined &&
        course.professors !== undefined &&
        course.semesters !== undefined;
}

export const CourseRow = memo(({
    course: initialCourse,
    highlightMatch = false,
    moduleId,
}: CourseRowProps) => {
    const { i18n } = useTranslation();
    // Inside the curriculum navigator the programme decides the title language; elsewhere there is
    // no programme in context and the reader's own locale is the right fallback.
    const programLanguage = useProgramLanguage();
    const [course, setCourse] = useState<Course | null>(
        () => hasCourseRowData(initialCourse) ? initialCourse : null
    );
    const [loading, setLoading] = useState<boolean>(() => !hasCourseRowData(initialCourse));
    const { request } = useApi();

    // Module details embed all row data. Keep a defensive item fallback for older/cached API
    // responses, but a normal curriculum expansion does not trigger one request per course.
    useEffect(() => {
        async function fetchCourseData() {
            if (!initialCourse.id) return;

            // If we have essential data, just use it
            setLoading(true);
            try {
                const courseData = await request('GET', `/api/courses/${initialCourse.id}`);
                if (courseData) {
                    const fullCourse = convertToCourse(courseData);
                    setCourse(fullCourse);
                }
            } catch (error) {
                captureException(
                    error instanceof Error ? error : new Error(String(error)),
                    {
                        extra: { context: "Failed to fetch course data" },
                    }
                );
            } finally {
                setLoading(false);
            }
        }

        if (!hasCourseRowData(initialCourse)) {
            fetchCourseData();
        }
    }, [initialCourse, request]);

    // Render the row structure, using either real data or skeletons
    const content = loading || !course ? {
        name: <Skeleton />,
        code: <Skeleton />,
        credits: <Skeleton />,
        semesters: <Skeleton circle width={16} height={16} />,
        professor: <Skeleton circle width={24} height={24} />
    } : {
        name: localizedCourseName(course, programLanguage ?? i18n.language),
        code: course.code,
        credits: course.credits,
        semesters: <SemesterIndicator semesters={course.semesters} size={16} />,
        professor: (
            <div className="flex -space-x-1">
                {course.professors?.map((unumber, index) => (
                    <ProfessorDiv
                        key={unumber}
                        unumber={unumber}
                        index={index}
                        size={24}
                        linkToProfile={false}
                    />
                ))}
            </div>
        )
    };

    return (
        <div role="row" className={`group/row flex min-h-12 items-center gap-3 py-1.5 pr-2 pl-3 transition-colors hover:bg-surface-hover ${highlightMatch ? 'bg-surface-selected' : ''}`}>
            <div role="cell" className="flex w-8 shrink-0 justify-center">
                {loading || !course ? (
                    <Skeleton circle width={16} height={16} />
                ) : (
                    <FavoriteButton itemId={course.id} itemType="course" size={16} className="vtk-icon-button size-7" />
                )}
            </div>
            <div role="cell" className="min-w-0 flex-1">
                {loading || !course ? (
                    content.name
                ) : (
                    <ApiPrefetchLink
                        href={`/course/${course.id}`}
                        apiEndpoints={[
                            `/api/courses/${course.id}`,
                            `/api/document_categories?lang=${i18n.language}`,
                            `/api/comment_categories?lang=${i18n.language}`,
                            `/api/courses/${course.id}/ratings`,
                        ]}
                        // The branch the reader walked, so the course page's breadcrumb names
                        // the programme they actually came from rather than whichever one the
                        // course happens to be listed under first.
                        onClick={moduleId === undefined ? undefined : () => rememberBranch(course.id, moduleId)}
                        className="block truncate text-body font-medium text-fg hover:underline"
                    >
                        {content.name}
                    </ApiPrefetchLink>
                )}
            </div>
            <div role="cell" className="hidden w-20 shrink-0 text-small text-fg-muted tabular sm:block">{content.code}</div>
            <div role="cell" className="hidden w-12 shrink-0 text-right text-small text-fg-secondary tabular sm:block">{content.credits}</div>
            <div role="cell" className="hidden w-16 shrink-0 justify-center md:flex">{content.semesters}</div>
            <div role="cell" className="relative hidden w-24 shrink-0 hover:z-50 lg:flex">{content.professor}</div>
            <div role="cell" className="reveal-on-hover flex w-8 shrink-0 justify-end">
                {!loading && course && <DownloadButton courses={[course]} size={16} />}
            </div>
        </div>
    );
});

CourseRow.displayName = "CourseRow";
