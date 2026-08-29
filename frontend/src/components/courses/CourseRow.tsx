import ProfessorDiv from '@/components/coursepage/ProfessorDiv';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import SemesterIndicator from "@/components/ui/SemesterIndicator";
import { useProgramLanguage } from '@/components/courses/ProgramLanguageContext';
import { useApi } from "@/hooks/useApi";
import type { Course } from '@/types/entities';
import { convertToCourse } from "@/utils/convertToEntity";
import { rememberBranch } from '@/utils/curriculumBranch';
import { captureException } from '@sentry/nextjs';
import Link from "next/link";
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
    isFirstRow = false,
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

    // Add margin-top classes conditionally based on whether this is the first row
    const marginClass = isFirstRow ? '' : 'mt-0';

    // Render the row structure, using either real data or skeletons
    const content = loading || !course ? {
        name: <Skeleton />,
        code: <Skeleton />,
        credits: <Skeleton />,
        semesters: <Skeleton circle width={16} height={16} />,
        professor: <Skeleton circle width={28} height={28} />
    } : {
        name: localizedCourseName(course, programLanguage ?? i18n.language),
        code: course.code,
        credits: (
            <span className="vtk-badge vtk-badge-muted">
                {course.credits}
            </span>
        ),
        semesters: <SemesterIndicator semesters={course.semesters} size={16} />,
        professor: (
            <div className="flex -space-x-1.5">
                {course.professors?.map((unumber, index) => (
                    <ProfessorDiv
                        key={unumber}
                        unumber={unumber}
                        index={index}
                        size={28}
                        linkToProfile={false}
                    />
                ))}
            </div>
        )
    };

    return (
        <div role="row" className={`grid grid-cols-12 py-2 px-3 border-b leading-tight hover:bg-vtk-paper rounded-md ${highlightMatch ? 'ring-1 ring-vtk-yellow' : ''
            } ${marginClass}`}>
            <div role="cell" className="col-span-5 flex items-center">
                {loading || !course ? (
                    <div className="mr-2 inline-block">
                        <Skeleton circle width={16} height={16} />
                    </div>
                ) : (
                    <FavoriteButton
                        itemId={course.id}
                        itemType="course"
                        size={16}
                        className="mr-1 shrink-0"
                    />
                )}
                {loading || !course ? (
                    <div className="grow">
                        {content.name}
                    </div>
                ) : (
                    <Link
                        href={`/course/${course.id}`}
                        // The branch the reader walked, so the course page's breadcrumb and
                        // folder tree name the programme they actually came from rather than
                        // whichever one the course happens to be listed under first.
                        onClick={moduleId === undefined ? undefined : () => rememberBranch(course.id, moduleId)}
                        className="hover:text-vtk-navy hover:underline text-sm text-vtk-body rounded-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy focus-visible:ring-offset-1"
                    >
                        {content.name}
                    </Link>
                )}
            </div>
            <div role="cell" className="col-span-1 flex items-center text-sm font-mono text-vtk-body">{content.code}</div>
            <div role="cell" className="col-span-1 flex items-center justify-center">{content.credits}</div>
            <div role="cell" className="col-span-2 flex justify-center items-center">
                {content.semesters}
            </div>
            <div role="cell" className="col-span-2 flex justify-center items-center relative hover:z-50">
                {content.professor}
            </div>
            <div role="cell" className="col-span-1 flex justify-end items-center">
                {!loading && course && <DownloadButton courses={[course]} size={16} />}
            </div>
        </div>
    );
});

CourseRow.displayName = "CourseRow";

