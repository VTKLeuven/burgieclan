import ProfessorDiv from '@/components/coursepage/ProfessorDiv';
import DownloadButton from '@/components/ui/DownloadButton';
import SemesterIndicator from "@/components/ui/SemesterIndicator";
import { useUser } from '@/components/UserContext';
import { useApi } from "@/hooks/useApi";
import { useFavorites } from '@/hooks/useFavorites';
import type { Course } from '@/types/entities';
import { convertToCourse } from "@/utils/convertToEntity";
import { captureException } from '@sentry/nextjs';
import { Star } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useEffect, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface CourseRowProps {
    course: Course;
    highlightMatch?: boolean;
    isFirstRow?: boolean;
    parentVisible?: boolean;
}

export const CourseRow = memo(({
    course: initialCourse,
    highlightMatch = false,
    isFirstRow = false,
    parentVisible = true,
}: CourseRowProps) => {
    const { user } = useUser();
    const { updateFavorite } = useFavorites(user);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const { request } = useApi();
    const [isFavorite, setIsFavorite] = useState<boolean>(false);
    const [showProfessors, setShowProfessors] = useState<boolean>(false);

    // Fetch complete course data if we only have the ID and parent is visible
    useEffect(() => {
        async function fetchCourseData() {
            if (!initialCourse.id) return;

            // If we have essential data, just use it
            if (initialCourse.name && initialCourse.code && initialCourse.credits && initialCourse.semesters) {
                setCourse(initialCourse);
                return;
            }

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

        if (parentVisible) {
            fetchCourseData();
        }
    }, [initialCourse, request, parentVisible]);

    // Update favorite status when user data changes
    useEffect(() => {
        if (user?.favoriteCourses && initialCourse.id) {
            setIsFavorite(user.favoriteCourses.some(favCourse => favCourse.id === initialCourse.id));
        }
    }, [user, initialCourse.id]);

    const handleFavoriteClick = useCallback(async () => {
        if (!user || !initialCourse.id) return;

        const isCurrentlyFavorite = user.favoriteCourses?.some(favCourse => favCourse.id === initialCourse.id);
        const newFavoriteState = !isCurrentlyFavorite;
        setIsFavorite(newFavoriteState);
        await updateFavorite(initialCourse.id, "course", newFavoriteState);
    }, [user, initialCourse.id, updateFavorite]);

    // Add margin-top classes conditionally based on whether this is the first row
    const marginClass = isFirstRow ? '' : 'mt-0';

    // Render the row structure, using either real data or skeletons
    const content = loading || !course ? {
        name: <Skeleton />,
        code: <Skeleton />,
        credits: <Skeleton />,
        semesters: <Skeleton circle width={16} height={16} />,
        star: <Skeleton circle width={16} height={16} />,
        professor: <Skeleton circle width={28} height={28} />
    } : {
        name: course.name,
        code: course.code,
        credits: (
            <span className="vtk-badge vtk-badge-muted">
                {course.credits}
            </span>
        ),
        semesters: <SemesterIndicator semesters={course.semesters} size={16} />,
        star: <Star className='text-vtk-yellow' fill={isFavorite ? "currentColor" : "none"} size={16} />,
        professor: (
            <div className="flex -space-x-1.5">
                {showProfessors && course.professors?.map((unumber, index) => (
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
        <div className={`grid grid-cols-12 py-2 px-3 border-b leading-tight hover:bg-vtk-paper rounded-md ${highlightMatch ? 'ring-1 ring-vtk-yellow' : ''
            } ${marginClass}`}>
            <div className="col-span-5 flex items-center">
                <div
                    className={`hover:scale-110 ${!loading && 'hover:cursor-pointer'} transition-transform duration-300 flex items-center`}
                    onClick={!loading && course ? handleFavoriteClick : undefined}>
                    <div className="inline-block mr-2">
                        {content.star}
                    </div>
                </div>
                {loading || !course ? (
                    <div className="grow">
                        {content.name}
                    </div>
                ) : (
                    <Link href={`/course/${course.id}`} className="hover:text-vtk-navy hover:underline text-sm text-vtk-body">
                        {content.name}
                    </Link>
                )}
            </div>
            <div className="col-span-1 flex items-center text-sm font-mono text-vtk-body">{content.code}</div>
            <div className="col-span-1 flex items-center justify-center">{content.credits}</div>
            <div className="col-span-2 flex justify-center items-center">
                {content.semesters}
            </div>
            <div className="col-span-2 flex justify-center items-center relative hover:z-50"
                onMouseEnter={!loading && course ? () => setShowProfessors(true) : undefined}
            >
                {content.professor}
            </div>
            <div className="col-span-1 flex justify-end items-center">
                {!loading && course && <DownloadButton courses={[course]} size={16} />}
            </div>
        </div>
    );
});

CourseRow.displayName = "CourseRow";