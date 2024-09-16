'use client'

import Image from 'next/image'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import React, { useRef, useEffect, useState } from 'react';
import LitusOAuthButton from "@/components/login/LitusOAuthButton";

export default function HomePage() {

    return (
        <div className="mt-5 flex justify-center">
            <div className="w-[90%]">
                <h1 className="text-black">Home</h1>
                <p className="pb-5 w-[70%] text-wireframe-darkest-gray">
                    Lorem ipsum dolor sit amet consectetur. At orci quis morbi vulputate nibh interdum lectus quam nec.
                    Ipsum feugiat viverra justo consectetur.
                </p>

                <div className="grid grid-rows-[60%_40%] h-[90vh]">
                    <div className="grid grid-cols-2">
                        <div className="bg-red-200">First Column (50%)</div>
                        <div className="bg-blue-200">Second Column (50%)</div>
                    </div>

                    <div className="grid grid-cols-[30%_70%]">
                        <div className="bg-green-200">First Column (30%)</div>
                        <div className="bg-yellow-200">Second Column (70%)</div>
                    </div>
                </div>

            </div>
        </div>
    );
}