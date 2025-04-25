'use client'
import DocumentSections from "@/components/coursepage/DocumentSections";
import { Course, Breadcrumb } from "@/types/entities";
import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import Loading from '@/app/[locale]/loading'
import ProfessorDiv from "@/components/coursepage/ProfessorDiv";
import { useFavorites } from '@/hooks/useFavorites';
import { useUser } from '@/components/UserContext';
import { Star, Folder, ChartPie, Link as LinkIcon } from "lucide-react";
import { convertToCourse } from "@/utils/convertToEntity";
import Link from "next/link";
import SemesterIndicator from '@/components/ui/SemesterIndicator';
import CommentCategories from "@/components/coursepage/CommentCategories";
import { useTranslation } from "react-i18next";
import ErrorPage from "../error/ErrorPage";

export default function CoursePage({ courseId, breadcrumb }: { courseId: number, breadcrumb: Breadcrumb }) {
    const [course, setCourse] = useState<Course | null>(null);
    const { user, loading: userLoading, refreshUser } = useUser();
    const { updateFavorite } = useFavorites(user);
    const [isFavorite, setIsFavorite] = useState<boolean>(false);
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

    // Update favorite status when user data changes
    useEffect(() => {
        if (user?.favoriteCourses) {
            setIsFavorite(user.favoriteCourses.some(favCourse => favCourse.id === courseId));
        }
    }, [user, courseId]);

    const handleFavoriteClick = async () => {
        if (!courseId || !user) return;

        const isCurrentlyFavorite = user.favoriteCourses?.some(favCourse => favCourse.id === courseId);
        const newFavoriteState = !isCurrentlyFavorite;
        setIsFavorite(newFavoriteState);
        await updateFavorite(courseId, "courses", newFavoriteState);
        await refreshUser();
    };

    // Show loading state
    if (loading) {
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
                <div className="bg-wireframe-lightest-gray relative p-10 pt-5 md:pt-10">
                    {/* Breadcrumb */}
                    <div className="flex flex-col md:flex-row space-x-2">
                        {breadcrumb.breadcrumb.map((item, index) => (
                            <div key={item} className="inline-block">
                                <span className="hover:underline hover:cursor-pointer text-wireframe-mid-gray">{item}</span>
                                {index + 1 < breadcrumb.breadcrumb.length && (
                                    <span className="text-wireframe-mid-gray"> / </span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center space-x-2 mt-3">
                        <div
                            className="hover:scale-110 hover:cursor-pointer transition-transform duration-300 flex items-center"
                            onClick={handleFavoriteClick}>
                            <div className="inline-block mr-2">
                                <Star className='text-vtk-yellow-500' fill={isFavorite ? "currentColor" : "none"} />
                            </div>
                        </div>
                        <h1 className="md:text-5xl text-4xl mb-4 text-wireframe-primary-blue">{course.name}</h1>
                    </div>
                    <div className="flex flex-col md:flex-row">

                        <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:mt-4 mb-4">
                                <div className="flex items-center space-x-1 gap-2">
                                    <Folder className="w-[24px] h-[24px]" />
                                    <p className="text-lg">{course.code}</p>
                                </div>
                                <div className="flex items-center space-x-1 gap-2">
                                    <ChartPie className="w-[24px] h-[24px]" />
                                    <p className="text-lg">{course.credits} {t('credits')}</p>
                                </div>
                                <div className="flex items-center space-x-1 gap-2">
                                    <SemesterIndicator semesters={course.semesters} />
                                    <p className="text-lg">
                                        {Array.isArray(course.semesters)
                                            ? (course.semesters.includes("Semester 1") && course.semesters.includes("Semester 2"))
                                                ? t('Year course')
                                                : course.semesters.join(", ")
                                            : course.semesters}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-1 gap-2">
                                    <Link href={`https://onderwijsaanbod.kuleuven.be/syllabi/n/${course.code}N.htm`} className="text-lg flex items-center gap-2 hover:underline hover:cursor-pointer">
                                        <LinkIcon className="w-[24px] h-[24px]" />
                                        ECTS
                                    </Link>
                                </div>
                            </div>

                        </div>
                        <div className="mb-2 md:mb-0 md:ml-auto">
                            <h4> {t('course-page.teachers')} </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {course?.professors?.map((p, index) => (
                                    <ProfessorDiv key={index} unumber={p} index={index} t={t} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:p-5 p-7">
                    <DocumentSections courseId={courseId} />
                </div>

                <div className="md:p-5 p-7">
                    <CommentCategories
                        comments={course.courseComments ?? []}
                        courseId={courseId}
                    />
                </div>
            </div>
        </>
    )
}