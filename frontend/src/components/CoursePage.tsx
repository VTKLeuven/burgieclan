'use client'
import CoursePageSection from "@/components/CoursePageSection";
import { Course, Breadcrumb } from "@/types";
import Image from 'next/image';
import DocumentIcon from '/public/images/vectors/document_icon.svg';
import FolderIcon from '/public/images/vectors/folder.svg';
import PiechartIcon from '/public/images/vectors/studiepunten.svg';
import HomeIcon from '/public/images/vectors/home.svg';
import FavoriteStar from '/public/images/vectors/favorite_star.svg';
import {useEffect, useState} from "react";
import {ApiClient} from "@/actions/api";
import {ApiError} from "next/dist/server/api-utils";



export default function CoursePage({courseId, breadcrumb}: {courseId: number, breadcrumb: Breadcrumb}) {
    const [course, setCourse] = useState<Course | null>(null);

    async function fetchCourse (query: number) {
        try {
            return await ApiClient('GET', `/api/courses/${query}`);
        } catch (err) {
            throw new ApiError(500, err.message);
        }
    }

    useEffect(() => {
        async function getCourse() {
            const courseData = await fetchCourse(courseId);
            setCourse(courseData);
        }
        getCourse().catch(console.error);
    }, []);

    const ProfessorDiv = ({unumber, index}: {unumber: string, index: number}) => (
        <div className="flex items-start h-full">
            <div className="relative w-16 h-16 overflow-hidden rounded-full border border-yellow-500">
                <Image src={"/images/proffen/" + unumber + ".jpeg"}
                       className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-auto" alt={unumber} width={64} height={64}/>
            </div>
            <div className="flex flex-col items-start justify-center ml-4 h-full">
                <p className="text-lg hover:underline hover:cursor-pointer">L. Beernaert</p>
                {index == 0 && <p className="text-sm text-gray-600">Coördinator</p>}
                {!(index == 0) && <p className="text-sm text-gray-600">Professor</p>}
            </div>
        </div>
    );

    if (!course) {
        return <p>Loading...</p>;
    }

    return (
        <>
            <div className="w-full h-full">
                <div className="h-[40%] bg-wireframe-lightest-gray relative p-10">
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex space-x-2">
                            {breadcrumb.breadcrumb.map((item, index) => (
                                <div key={item} className="inline-block hover:cursor-pointer">
                                    {index > 0 ? (
                                        <>
                                            <span>/ </span>
                                            <span className="hover:underline">{item}</span>
                                        </>
                                    ) : (
                                        <span className="hover:underline">{item}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Image src={DocumentIcon} alt="Document Icon" width={40} height={40}/>
                            <h1 className="text-5xl mb-4">{course.name}</h1>
                        </div>

                        <div className="flex space-x-2 mt-4 mb-4 gap-14">
                            <div className="flex items-center space-x-1 gap-2">
                                <Image src={FolderIcon} alt="Folder Icon" width={24} height={24}/>
                                <p className="text-lg">{course.code}</p>
                            </div>
                            <div className="flex items-center space-x-1 gap-2">
                            <Image src={PiechartIcon} alt="Piechart Icon" width={24} height={24}/>
                                <p className="text-lg">{course.credits} studiepunten</p>
                            </div>
                            <div className="flex items-center space-x-1 gap-2">
                                <Image src={HomeIcon} alt="Home Icon" width={24} height={24}/>
                                <p className="text-lg">KU Leuven</p>
                            </div>
                        </div>

                        <p className="text-lg w-[60%]"> {/*Description top*/}
                            Lorem ipsum dolor sit amet consectetur.
                            At orci quis morbi vulputate nibh interdum lectus quam nec.
                            Ipsum feugiat viverra justo consectetur. Odio commodo aliquet elit.
                        </p>


                        <div className="absolute bottom-0 space-x-2 bg-white rounded-[28px] pl-3 pr-3 pt-1 pb-1 mb-5 border border-transparent hover:scale-105 hover:border-wireframe-primary-blue hover:cursor-pointer transition-transform duration-300 flex items-center">
                            <div className="inline-block">
                                <Image src={FavoriteStar} alt="Favorites star" width={17} height={17}/>
                            </div>
                            <div className="inline-block">
                                <p className="text-lg text-wireframe-mid-gray">Favoriet</p>
                            </div>
                        </div>
                    </div>


                </div>

                <div className="flex p-10 space-x-2">
                <div className="w-[60%]">
                        <h2>Over het vak</h2>
                        <p className="text-lg w-[76%]"> {/*Description bottom*/}
                            Lorem ipsum dolor sit amet consectetur.
                            At orci quis morbi vulputate nibh interdum lectus quam nec.
                            Ipsum feugiat viverra justo consectetur.
                            Odio commodo aliquet elit auctor vulputate in fames condimentum leo.
                            Venenatis amet ullamcorper pharetra congue arcu at non mi quam.
                        </p>
                    </div>
                    <div>
                        <h2>Docenten</h2>
                        <div className="grid grid-cols-2 grid-rows-3 gap-4">
                            {course.professors.map((p, index) => (
                                <ProfessorDiv key={index} unumber={p} index={index}/>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-10">
                    <h2>Bestanden</h2>
                    <div className="grid grid-cols-4 gap-4 mt-5 transform scale-90 origin-left">
                        <CoursePageSection title="Samenvattingen" description="Lorem ipsum dolor sit amet"/>
                        <CoursePageSection title="Werkcollege" description="Lorem ipsum dolor sit amet"/>
                        <CoursePageSection title="Examens" description="Lorem ipsum dolor sit amet"/>
                    </div>
                </div>
            </div>
        </>
    )
}