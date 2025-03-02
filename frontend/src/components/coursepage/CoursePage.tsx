'use client'
import CoursePageSection from "@/components/coursepage/CoursePageSection";
import { Course, Breadcrumb } from "@/types/entities";
import Image from 'next/image';
import DocumentIcon from '/public/images/icons/document_icon.svg';
import FolderIcon from '/public/images/icons/folder.svg';
import PiechartIcon from '/public/images/icons/studiepunten.svg';
import HomeIcon from '/public/images/icons/home.svg';
import FavoriteStarFilled from '/public/images/icons/favorite_star_filled.svg';
import FavoriteStarOutline from '/public/images/icons/favorite_star_outline.svg';
import { useEffect, useState } from "react";
import { ApiClient } from "@/actions/api";
import { ApiError } from "next/dist/server/api-utils";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShare } from '@fortawesome/free-solid-svg-icons';
import Loading from '@/app/[locale]/loading'
import { useToast } from '@/components/ui/Toast';
import initTranslations from "@/app/i18n";
import ProfessorDiv from "@/components/coursepage/ProfessorDiv";
import { useFavorites } from '@/hooks/useFavorites';
import { useUser } from '@/components/UserContext';

export default function CoursePage({ courseId, breadcrumb }: { courseId: number, breadcrumb: Breadcrumb }) {
    const [course, setCourse] = useState<Course | null>(null);
    const [t, setT] = useState<any>(() => (key: string) => key); // Default translation function
    const { showToast } = useToast();
    const [error, setError] = useState<boolean>(false);
    const { user, loading } = useUser();
    const { updateFavoriteCourse } = useFavorites(user);
    const [isFavorite, setIsFavorite] = useState<boolean>(false);

    async function fetchCourse(query: number) {
        try {
            return await ApiClient('GET', `/api/courses/${query}`);
        } catch (err) {
            throw new ApiError(500, err.message);
        }
    }

    useEffect(() => {
        async function getCourse() {
            try {
                const courseData = await fetchCourse(courseId);
                setCourse(courseData);

                // This is used to set the page language depending on the language of the course, and not the global website language set by the user
                const { t: translationFunction } = await initTranslations(courseData.language);
                setT(() => translationFunction);

                // Set initial favorite state
                console.log(user);
                console.log(user?.favoriteCourses?.some(favCourse => favCourse.id === courseId))
                setIsFavorite(user?.favoriteCourses?.some(favCourse => favCourse.id === courseId) || false);
            } catch {
                setError(true);
                showToast(t('course.error-fetching'), 'error');
            }
        }

        if (!loading) {
            getCourse();
        }
    }, [courseId, showToast, user, loading]);

    const handleFavoriteClick = async () => {
        if (!course) return;
        const newFavoriteState = !isFavorite;
        await updateFavoriteCourse(course.id, newFavoriteState);
        setIsFavorite(newFavoriteState);
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <p>{t('course.error-fetching')}</p>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <Loading/>
            </div>
        )
    }

    return (
        <>
            <div className="w-full h-full">
                <div className="min-h-[35%] md:h-[40%] bg-wireframe-lightest-gray relative p-10 pt-5 md:pt-10">
                    <div>
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
                            <Image src={DocumentIcon} alt="Document Icon" className="w-[24px] h-[24px] md:w-[40px] md:h-[40px]"/>
                            <h1 className="md:text-5xl text-4xl mb-4 text-wireframe-primary-blue">{course.name}</h1>
                        </div>

                        <div className="flex flex-col md:flex-row md:mt-4 mb-4 md:gap-14 gap-2">
                            <div className="flex items-center space-x-1 gap-2">
                                <Image src={FolderIcon} alt="Folder Icon" className="w-[24px] h-[24px]" />
                                <p className="text-lg">{course.code}</p>
                            </div>
                            <div className="flex items-center space-x-1 gap-2">
                                <Image src={PiechartIcon} alt="Piechart Icon" width={24} height={24} />
                                <p className="text-lg">{course.credits} {t('credits')}</p>
                            </div>
                            <div className="flex items-center space-x-1 gap-2">
                                <Image src={HomeIcon} alt="Home Icon" width={24} height={24} />
                                <p className="text-lg">KU Leuven</p>
                            </div>
                        </div>

                        <p className="pt-3 md:pt-0 text-lg md:w-[60%] mb-5"> {/*Description top*/}
                            Lorem ipsum dolor sit amet consectetur.
                            At orci quis morbi vulputate nibh interdum lectus quam nec.
                            Ipsum feugiat viverra justo consectetur. Odio commodo aliquet elit.
                        </p>

                        <div className="absolute bottom-0 flex space-x-4 mt-5 mb-5">
                            <div
                                className="bg-white rounded-[28px] pl-5 pr-5 pt-2 pb-2 border border-transparent hover:scale-105 hover:border-wireframe-primary-blue hover:cursor-pointer transition-transform duration-300 flex items-center"
                                onClick={handleFavoriteClick}>
                                <div className="inline-block mr-2">
                                    <Image src={isFavorite ? FavoriteStarFilled : FavoriteStarOutline}
                                           alt="Favorites star" width={17} height={17}/>
                                </div>
                                <div className="inline-block">
                                    <p className="text-lg text-wireframe-mid-gray"> {t('favorite')} </p>
                                </div>
                            </div>
                            <div
                                className="bg-white rounded-[28px] pl-5 pr-5 pt-2 pb-2 border border-transparent hover:scale-105 hover:border-wireframe-primary-blue hover:cursor-pointer transition-transform duration-300 flex items-center">
                                <div className="inline-block mr-2">
                                    <FontAwesomeIcon icon={faShare} className="text-wireframe-primary-panache" />
                                </div>
                                <div className="inline-block">
                                    <p className="text-lg text-wireframe-mid-gray"> {t('share')} </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:p-10 pt-7 pl-7 pr-7 md:space-x-2">
                    <div className="md:w-[60%] mb-4 md:mb-0">
                        <h2> {t('course-page.about')} </h2>
                        <p className="text-lg md:w-[76%]"> {/*Description bottom*/}
                            Lorem ipsum dolor sit amet consectetur.
                            At orci quis morbi vulputate nibh interdum lectus quam nec.
                            Ipsum feugiat viverra justo consectetur.
                            Odio commodo aliquet elit auctor vulputate in fames condimentum leo.
                            Venenatis amet ullamcorper pharetra congue arcu at non mi quam.
                        </p>
                    </div>
                    <div className="mb-2 md:mb-0">
                        <h2> {t('course-page.teachers')} </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {course?.professors?.map((p, index) => (
                                <ProfessorDiv key={index} unumber={p} index={index} t={t}/>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="md:p-10 p-7 mb-10">
                    <h2> {t('course-page.files')} </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:mt-5 transform scale-90 origin-left ">
                        <CoursePageSection title={t('course-page.summaries')} description={t('course-page.summaries-description')} />
                        <CoursePageSection title={t('course-page.exercise-session')} description={t('course-page.exercise-session-description')} />
                        <CoursePageSection title={t('course-page.exams')} description={t('course-page.exams-description')} />
                    </div>
                </div>
            </div>
        </>
    )
}