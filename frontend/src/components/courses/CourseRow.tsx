import React, { useState, useEffect, useCallback, memo } from 'react';
import type { Course } from '@/types/entities';
import Link from "next/link";
import SemesterIndicator from "@/components/ui/SemesterIndicator";
import { Star, UserRound } from "lucide-react";
import { useUser } from '@/components/UserContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useApi } from "@/hooks/useApi";
import { convertToCourse } from "@/utils/convertToEntity";
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

interface CourseRowProps {
    course: Course;
    highlightMatch?: boolean;
    isFirstRow?: boolean;
}

export const CourseRow = memo(({
    course: initialCourse,
    highlightMatch = false,
    isFirstRow = false,
}: CourseRowProps) => {
    const { user } = useUser();
    const { updateFavorite } = useFavorites(user);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const { request } = useApi();
    const [isFavorite, setIsFavorite] = useState<boolean>(false);
    const [showTooltip, setShowTooltip] = useState<boolean>(false);
    const [professorNames, setProfessorNames] = useState<string[]>([]);
    const [professorsLoaded, setProfessorsLoaded] = useState<boolean>(false);

    // Fetch complete course data if we only have the ID
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
                console.error("Failed to fetch course data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchCourseData();
    }, [initialCourse, request]);

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
        await updateFavorite(initialCourse.id, "courses", newFavoriteState);
    }, [user, initialCourse.id, updateFavorite]);

    const fetchProfessorNames = useCallback(async () => {
        if (!course?.professors?.length || professorsLoaded) return;

        try {
            setProfessorsLoaded(true);
            const professors = course.professors ?? [];
            const namePromises = professors.map(async unumber => {
                if (!unumber) return "";

                const sanitizedUnumber = unumber.replace(/\D/g, '');
                if (!sanitizedUnumber) return "";

                try {
                    const response = await fetch(`https://dataservice.kuleuven.be/employee/_doc/0${sanitizedUnumber}`);
                    if (!response.ok) return "";

                    const data = await response.json();
                    return data?._source?.firstName && data?._source?.surname
                        ? `${data._source.firstName[0]}. ${data._source.surname}`
                        : "";
                } catch {
                    return "";
                }
            });

            const names = await Promise.all(namePromises);
            setProfessorNames(names.filter(name => name));
        } catch (error) {
            setProfessorNames([]);
        }
    }, [course?.professors, professorsLoaded]);

    // Only load professor data when the tooltip is hovered
    const handleProfessorHover = useCallback(() => {
        setShowTooltip(true);
        fetchProfessorNames();
    }, [fetchProfessorNames]);

    // Add margin-top classes conditionally based on whether this is the first row
    const marginClass = isFirstRow ? '' : 'mt-2';

    // Render the row structure, using either real data or skeletons
    const content = loading || !course ? {
        name: <Skeleton />,
        code: <Skeleton />,
        credits: <Skeleton />,
        semesters: <Skeleton circle width={24} height={24} />,
        star: <Skeleton circle width={24} height={24} />,
        professor: <Skeleton circle width={20} height={20} />
    } : {
        name: course.name,
        code: course.code,
        credits: course.credits,
        semesters: <SemesterIndicator semesters={course.semesters} />,
        star: <Star className='text-vtk-yellow-500' fill={isFavorite ? "currentColor" : "none"} />,
        professor: <UserRound className="text-wireframe-primary-blue" size={20} />
    };

    return (
        <div className={`grid grid-cols-12 py-3 border-b hover:bg-gray-50 rounded-md ${highlightMatch ? 'ring-2 ring-yellow-300' : ''
            } ${marginClass}`}>
            <div className="col-span-5 px-4 flex">
                <div
                    className={`hover:scale-110 ${!loading && 'hover:cursor-pointer'} transition-transform duration-300 flex items-center`}
                    onClick={!loading && course ? handleFavoriteClick : undefined}>
                    <div className="inline-block mr-2">
                        {content.star}
                    </div>
                </div>
                {loading || !course ? (
                    <div className="flex-grow">
                        {content.name}
                    </div>
                ) : (
                    <Link href={`/course/${course.id}`} className="hover:text-wireframe-primary-blue hover:underline">
                        {content.name}
                    </Link>
                )}
            </div>
            <div className="col-span-1 px-4">{content.code}</div>
            <div className="col-span-1 px-4 text-center">{content.credits}</div>
            <div className="col-span-2 flex justify-center items-center">
                {content.semesters}
            </div>
            <div className="col-span-2 flex justify-center items-center relative">
                <div
                    className={`p-1 ${!loading && 'hover:bg-gray-100 cursor-pointer'} rounded-full`}
                    onMouseEnter={!loading && course ? handleProfessorHover : undefined}
                    onMouseLeave={!loading && course ? () => setShowTooltip(false) : undefined}
                >
                    {content.professor}
                    {showTooltip && professorNames.length > 0 && (
                        <ProfessorTooltip professorNames={professorNames} />
                    )}
                </div>
            </div>
        </div>
    );
});

CourseRow.displayName = "CourseRow";

const ProfessorTooltip = ({ professorNames }: { professorNames: string[] }) => (
    <div className="absolute bottom-full mb-2 bg-white rounded-md border border-vtk-blue-500 p-1 z-10 whitespace-nowrap text-sm">
        <ul className="list-none">
            {professorNames.map((professor, index) => (
                <li key={index}>{professor}</li>
            ))}
        </ul>
    </div>
);