'use client'

import Image from 'next/image'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import React, { useRef, useEffect, useState } from 'react';
import LitusOAuthButton from "@/components/login/LitusOAuthButton";

export default function HomePage() {

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
                            <div className="pl-5 pt-5">
                                <h3>Pick up where you left off</h3>
                            </div>
                        </div>
                        <div className="bg-blue-200">
                            <div className="flex items-center justify-center h-full">
                                <h3>Drag & drop bestanden</h3>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[30%_70%]">
                        <div className="bg-green-200">
                            <div className="pt-5">
                                <h3>Nieuws</h3>
                            </div>
                        </div>
                        <div className="bg-yellow-200">
                            <div className="pt-5">
                                <h3>Snel navigeren naar</h3>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}