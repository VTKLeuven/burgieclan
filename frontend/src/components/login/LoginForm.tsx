'use client'

import Image from 'next/image'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import {useState} from "react";

export default function LoginForm() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleCollapse = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            {/*
            This example requires updating your template:

            ```
            <html class="h-full bg-white">
            <body class="h-full">
            ```
            */}
            <div className="h-screen px-6 py-12 lg:px-8">
                <div className="h-1/5"></div>
                <div className="flex flex-col items-center justify-center h-2/5">
                    <div className="w-full max-w-sm">
                        <Image
                            src="/images/logos/seafile-logo.png"
                            alt="Burgieclan Logo"
                            width={100}
                            height={100}
                            className="mx-auto"
                        />
                        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-vtk-blue-500">
                            Sign in to your account
                        </h2>
                    </div>

                    <div className="mt-10 w-full max-w-sm">
                        <form className="space-y-6" action="#" method="POST">
                            <button
                                type="submit"
                                className="flex flex-row w-full justify-center items-center rounded-md border-0 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-300 font-semibold leading-6 text-black shadow-sm hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vtk-blue-400"
                            >
                                <Image
                                    src="/images/logos/vtk-logo-blue.png"
                                    alt="VTK Logo"
                                    width={50}
                                    height={25}
                                    className="p-2 pb-3"
                                />
                                <p className="inline p-2 text-vtk-blue-500">Log in with VTK</p>
                            </button>
                        </form>
                    </div>

                    <div
                        className="mt-10 w-full max-w-sm font-semibold text-center text-sm leading-6 text-vtk-blue-500 hover:text-vtk-blue-400 cursor-pointer flex items-center justify-center"
                        onClick={toggleCollapse}>
                        <p>Or log in manually</p>
                        {isOpen ? <ChevronDownIcon className="mt-0.5 h-4 w-4" aria-hidden="true" /> : <ChevronRightIcon className="mt-0.5 h-4 w-4" aria-hidden="true" />}
                    </div>
                </div>
                <div className={`flex flex-col items-center justify-center ${isOpen ? 'h-2/5' : 'h-0'} overflow-hidden`}>
                    <div className="mt-10 w-full max-w-sm">
                        <label htmlFor="email"
                               className="block text-sm font-medium leading-6 text-gray-900">
                            Email address
                        </label>
                        <div className="mt-2">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-amber-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div className="w-full max-w-sm">
                        <div className="flex items-center justify-between">
                            <label htmlFor="password"
                                   className="mt-2 block text-sm font-medium leading-6 text-gray-900">
                                Password
                            </label>
                            <div className="mt-2 text-sm">
                                <a href="#" className="font-semibold text-vtk-blue-600 hover:text-vtk-blue-500">
                                    Forgot password?
                                </a>
                            </div>
                        </div>
                        <div className="mt-2">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-amber-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div className="mt-5 w-full max-w-sm">
                        <button
                            type="submit"
                            className="flex w-full justify-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vtk-blue-600"
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}