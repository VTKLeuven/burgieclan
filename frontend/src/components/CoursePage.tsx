'use client'
import CoursePageSection from "@/components/CoursePageSection";
import { Course, Breadcrumb } from "@/types";
import Image from 'next/image';
import DocumentIcon from '/public/images/vectors/document_icon.svg';
import FolderIcon from '/public/images/vectors/folder.svg';
import PiechartIcon from '/public/images/vectors/studiepunten.svg';
import HomeIcon from '/public/images/vectors/home.svg';
import FavoriteStar from '/public/images/vectors/favorite_star.svg';



export default function CoursePage({course, breadcrumb}: {course: Course, breadcrumb: Breadcrumb}) {

    const ProfessorDiv = ([firstname, lastname, coordinator]: [string, string, boolean]) => (
        <div className="flex items-start h-full">
            <div className="relative w-16 h-16 overflow-hidden rounded-full border border-yellow-500">
                <Image src={"/images/proffen/" + firstname.toLowerCase() + "_" + lastname.toLowerCase() + ".jpeg"}
                       className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-auto" alt={"Professor " + lastname} width={64} height={64}/>
            </div>
            <div className="flex flex-col items-start justify-center ml-4 h-full">
                <p className="text-lg hover:underline hover:cursor-pointer">{firstname[0] + ". " + lastname}</p>
                {coordinator && <p className="text-sm text-gray-600">Coördinator</p>}
                {!coordinator && <p className="text-sm text-gray-600">Professor</p>}
            </div>
        </div>
    );

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
                            <div className="inline-block flex items-center space-x-1 gap-2">
                                <Image src={FolderIcon} alt="Folder Icon" width={24} height={24}/>
                                <p className="text-lg">{course.courseCode}</p>
                            </div>
                            <div className="inline-block flex items-center space-x-1 gap-2">
                            <Image src={PiechartIcon} alt="Piechart Icon" width={24} height={24}/>
                                <p className="text-lg">{course.credits} studiepunten</p>
                            </div>
                            <div className="inline-block flex items-center space-x-1 gap-2">
                                <Image src={HomeIcon} alt="Home Icon" width={24} height={24}/>
                                <p className="text-lg">{course.location}</p>
                            </div>
                        </div>

                        <p className="text-lg w-[60%]">
                            {course.description_top}
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
                        <p className="text-lg w-[76%]">
                            {course.description_bottom}
                        </p>
                    </div>
                    <div>
                        <h2>Docenten</h2>
                        <div className="grid grid-cols-2 grid-rows-3 gap-4">
                            {course.professors.map(professor => ProfessorDiv(professor))}
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