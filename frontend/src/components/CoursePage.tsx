'use client'

export default function CoursePage() {

    return (
        <>
            <div className="w-full h-full">
                <div className="h-[50%] bg-wireframe-lightest-gray relative p-10">
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex space-x-2">
                            <div className="inline-block">Bachelor</div>
                            <div className="inline-block">/ Gemeenschappelijke basis</div>
                            <div className="inline-block">/ Wiskunde</div>
                            <div className="inline-block">/ Analyse, deel 1</div>
                        </div>

                        <h1>Analyse, deel 1</h1>

                        <div className="flex space-x-2">
                            <div className="inline-block">
                                <h5>H01A0B</h5>
                            </div>
                            <div className="inline-block">
                                <h5>6 studiepunten</h5>
                            </div>
                            <div className="inline-block">
                                <h5>KU Leuven</h5>
                            </div>
                        </div>

                        <h5 className="w-[60%]">
                            Lorem ipsum dolor sit amet consectetur.
                            At orci quis morbi vulputate nibh interdum lectus quam nec.
                            Ipsum feugiat viverra justo consectetur. Odio commodo aliquet elit.
                        </h5>

                        <div className="absolute bottom-0 space-x-2">
                            <div className="inline-block">
                                <h5>Favoriet</h5>
                            </div>
                            <div className="inline-block">
                                <h5>Delen</h5>
                            </div>
                        </div>
                    </div>


                </div>

                <div className="flex p-10 space-x-2">
                    <div className="w-[60%]">
                        <h2>Title</h2>
                        <h5 className="w-[76%]">
                            Lorem ipsum dolor sit amet consectetur.
                            At orci quis morbi vulputate nibh interdum lectus quam nec.
                            Ipsum feugiat viverra justo consectetur.
                            Odio commodo aliquet elit auctor vulputate in fames condimentum leo.
                            Venenatis amet ullamcorper pharetra congue arcu at non mi quam.
                        </h5>
                    </div>
                    <div>
                        <h2>Docenten</h2>
                        <div className="grid grid-cols-3 grid-rows-2 gap-4">
                            <div className="border p-2">S. Vandewalle</div>
                            <div className="border p-2">S. Vandewalle</div>
                            <div className="border p-2">L. Beernaert</div>
                            <div className="border p-2">L. Beernaert</div>
                            <div className="border p-2">R. Vandebril</div>
                            <div className="border p-2">R. Vandebril</div>
                        </div>
                    </div>
                </div>

                <div className="p-10">
                    <h2>Subtitle</h2>
                    <div className="grid grid-cols-4 gap-4 mt-5">
                        <div>Samenvattingen</div>
                        <div>Werkcolleges</div>
                        <div>Examens</div>
                        <div>Lorem Ipsum</div>
                    </div>
                </div>
            </div>
        </>
    )
}