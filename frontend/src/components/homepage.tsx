'use client'

import React, { ReactNode } from 'react';

interface HomePageProps {
    topLeft?: ReactNode;
    topRight?: ReactNode;
    bottomLeft?: ReactNode;
    bottomRight?: ReactNode;
}

export default function HomePage({ topLeft, topRight, bottomLeft, bottomRight }: HomePageProps) {

    return (
        <div className="mt-10 flex justify-center">
            <div className="w-[80%]">
                <h1 className="text-black">Home</h1>
                <p className="pb-5 w-[70%] text-wireframe-darkest-gray">
                    Lorem ipsum dolor sit amet consectetur. At orci quis morbi vulputate nibh interdum lectus quam nec.
                    Ipsum feugiat viverra justo consectetur.
                </p>

                <div className="grid grid-rows-[65%_35%] h-[90vh]">
                    <div className="grid grid-cols-2">
                        <div className="bg-red-200">
                            {topLeft}
                        </div>
                        <div className="bg-blue-200">
                            {topRight}
                        </div>
                    </div>

                    <div className="grid grid-cols-[30%_70%]">
                        <div className="bg-green-200">
                            {bottomLeft}
                        </div>
                        <div className="bg-yellow-200">
                            {bottomRight}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}