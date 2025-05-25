import React, { useState, useEffect, useCallback, memo } from 'react';
import type { Course } from '@/types/entities';
import Link from "next/link";
import SemesterIndicator from "@/components/ui/SemesterIndicator";
import { Star, UserRound } from "lucide-react";
import { useUser } from '@/components/UserContext';
import { useFavorites } from '@/hooks/useFavorites';

interface CourseRowProps {
    course: Course;
    highlightMatch?: boolean;
    isFirstRow?: boolean;
}

export const CourseRow = memo(({
    course,
    highlightMatch = false,
    isFirstRow = false,
}: CourseRowProps) => {
    const { user } = useUser();
    const { updateFavorite } = useFavorites(user);
    const [isFavorite, setIsFavorite] = useState<boolean>(
        !!user?.favoriteCourses?.some(favCourse => favCourse.id === course.id)
    );
    const [showTooltip, setShowTooltip] = useState<boolean>(false);
    const [professorNames, setProfessorNames] = useState<string[]>([]);
    const [professorsLoaded, setProfessorsLoaded] = useState<boolean>(false);

    const handleFavoriteClick = useCallback(async () => {
        if (!user) return;

        const isCurrentlyFavorite = user.favoriteCourses?.some(favCourse => favCourse.id === course.id);
        const newFavoriteState = !isCurrentlyFavorite;
        setIsFavorite(newFavoriteState);
        await updateFavorite(course.id, "courses", newFavoriteState);
    }, [user, course.id, updateFavorite]);

    const fetchProfessorNames = useCallback(async () => {
        if (!course.professors?.length || professorsLoaded) return;

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
    }, [course.professors, professorsLoaded]);

    // Only load professor data when the tooltip is hovered
    const handleProfessorHover = useCallback(() => {
        setShowTooltip(true);
        fetchProfessorNames();
    }, [fetchProfessorNames]);

    // Add margin-top classes conditionally based on whether this is the first row
    const marginClass = isFirstRow ? '' : 'mt-2';

    return (
        <div className={`grid grid-cols-12 py-3 border-b hover:bg-gray-50 rounded-md ${highlightMatch ? 'ring-2 ring-yellow-300' : ''
            } ${marginClass}`}>
            <div className="col-span-5 px-4 flex">
                <div
                    className="hover:scale-110 hover:cursor-pointer transition-transform duration-300 flex items-center"
                    onClick={handleFavoriteClick}>
                    <div className="inline-block mr-2">
                        <Star className='text-vtk-yellow-500' fill={isFavorite ? "currentColor" : "none"} />
                    </div>
                </div>
                <Link href={`/course/${course.id}`} className="hover:text-wireframe-primary-blue hover:underline">
                    {course.name}
                </Link>
            </div>
            <div className="col-span-1 px-4">{course.code}</div>
            <div className="col-span-1 px-4 text-center">{course.credits}</div>
            <div className="col-span-2 flex justify-center items-center">
                <SemesterIndicator semesters={course.semesters} />
            </div>
            <div className="col-span-2 flex justify-center items-center relative">
                <div
                    className="cursor-pointer p-1 hover:bg-gray-100 rounded-full"
                    onMouseEnter={handleProfessorHover}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    <UserRound className="text-wireframe-primary-blue" size={20} />
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