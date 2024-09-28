'use client'
import CoursePageSection from "@/components/CoursePageSection";

export default function CoursePage() {

    const ProfessorDiv = (name: string, coordinator: boolean, img_url: string) => (
        <div className="flex items-start">
            <div className="relative w-16 h-16 overflow-hidden rounded-full border border-yellow-500">
                <img src={img_url}
                     className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-auto" alt={"Professor " + name}/>
            </div>
            <div className="ml-4">
                <h5 className="text-lg font-bold">{name}</h5>
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
                            <div className="inline-block">Bachelor</div>
                            <div className="inline-block">/ Gemeenschappelijke basis</div>
                            <div className="inline-block">/ Wiskunde</div>
                            <div className="inline-block">/ Analyse, deel 1</div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <img src="/images/vectors/document_icon.svg" alt="Document Icon" width="40" height="40"/>
                            <h1 className="text-5xl mb-4">Analyse, deel 1</h1>
                        </div>

                        <div className="flex space-x-2 mt-4 mb-4 gap-14">
                            <div className="inline-block flex items-center space-x-1 gap-2">
                            <img src="/images/vectors/folder.svg" alt="Folder Icon" width="24" height="24"/>
                                <p className="text-lg">H01A0B</p>
                            </div>
                            <div className="inline-block flex items-center space-x-1 gap-2">
                                <img src="/images/vectors/studiepunten.svg" alt="Piechart Icon" width="24" height="24"/>
                                <p className="text-lg">6 studiepunten</p>
                            </div>
                            <div className="inline-block flex items-center space-x-1 gap-2">
                                <img src="/images/vectors/home.svg" alt="Home Icon" width="24" height="24"/>
                                <p className="text-lg">KU Leuven</p>
                            </div>
                        </div>

                        <p className="text-lg w-[60%]">
                            Lorem ipsum dolor sit amet consectetur.
                            At orci quis morbi vulputate nibh interdum lectus quam nec.
                            Ipsum feugiat viverra justo consectetur. Odio commodo aliquet elit.
                        </p>

                        <div className="absolute bottom-0 space-x-2 bg-white rounded-[28px] pl-3 pr-3 pt-1 pb-1 mb-5">
                            <div className="inline-block">
                                <img src="/images/vectors/favorite_star.svg" alt="Favorites star"/>
                            </div>
                            <div className="inline-block">
                                <p className="text-lg text-wireframe-mid-gray">Favoriet</p>
                            </div>
                        </div>
                    </div>


                </div>

                <div className="flex p-10 space-x-2">
                <div className="w-[60%]">
                        <h2>Title</h2>
                        <p className="text-lg w-[76%]">
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
                            {ProfessorDiv("S. Vandewalle", true, "/images/proffen/vandewalle.jpeg")}
                            {ProfessorDiv("S. Vandewalle", true, "/images/proffen/vandewalle.jpeg")}
                            {ProfessorDiv("L. Beernaert", false, "/images/proffen/lutgarde.jpeg")}
                            {ProfessorDiv("L. Beernaert", false, "/images/proffen/lutgarde.jpeg")}
                            {ProfessorDiv("R. Vandebril", false, "/images/proffen/vandebril.jpeg")}
                            {ProfessorDiv("R. Vandebril", false, "/images/proffen/vandebril.jpeg")}
                        </div>
                    </div>
                </div>

                <div className="p-10">
                    <h2>Subtitle</h2>
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