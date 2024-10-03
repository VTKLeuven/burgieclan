'use client'

import React, { ReactNode } from 'react';
import { Announcement } from '@/types';


interface HomePageProps {
    announcements: Announcement[];
    bottomLeft?: ReactNode;
    bottomRight?: ReactNode;
}

export default function HomePage({ announcements, bottomLeft, bottomRight }: HomePageProps) {

    return (
        <div className="mt-10 flex justify-center">
            <div className="w-[80%]">
                <h1 className="text-black">Home</h1>
                <p className="pb-5 w-[70%] text-wireframe-darkest-gray">
                    Lorem ipsum dolor sit amet consectetur. At orci quis morbi vulputate nibh interdum lectus quam nec.
                    Ipsum feugiat viverra justo consectetur.
                </p>

                <div className="grid grid-rows-[35%_65%] h-[90vh]">
                    <div>
                        {announcements.map((announcement) => (
                            <div key={announcement.title}
                                 className={`bg-${announcement.color}-200 p-4 grid grid-cols-2 gap-4`}>
                                <h2>{announcement.title}</h2>
                                <p>{announcement.description}</p>
                            </div>
                        ))}
                    </div>


                    <div className="grid grid-cols-2">
                        <div className="bg-red-200">
                            {bottomLeft}
                        </div>
                        <div className="bg-blue-200">
                            {bottomRight}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}