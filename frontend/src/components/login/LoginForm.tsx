'use client'

import Image from 'next/image'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import React, { useState } from 'react';
import LitusOAuthButton from "@/components/login/LitusOAuthButton";
import {initiateLitusOAuthFlow} from "@/utils/oauth";
import ErrorPage from "@/components/error/ErrorPage";
import {useRouter} from "next/navigation";
/**
 * Login form component, displays initial login form with VTK login option and expands
 * when user chooses to log in manually.
 *
 * Should be rendered as full page.
 */
export default function LoginForm() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<Error>(null);

    const handleLoginClick = (event: { preventDefault: () => void; }) => {
        event.preventDefault();
        try {
            initiateLitusOAuthFlow(router);
        }
        catch (err: any) {
            setError(err);
        }
    };

    const toggleCollapse = () => {
        setIsOpen(!isOpen);
    };

    if (error) {
        return <ErrorPage detail={ error.message } />;
    }

    return (
        <>
            <div className="min-h-screen px-6 py-10 lg:px-8">
                <div className="flex flex-col items-center justify-center mt-[10vh]">
                    <div className="w-full max-w-sm">
                        <Image
                            // TODO: Replace with the actual logo
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

                    <LitusOAuthButton loginClickHandler={ handleLoginClick }/>

                    <div
                        className="mt-4 w-full max-w-sm font-semibold text-center text-sm leading-6 text-vtk-blue-500 hover:text-vtk-blue-400 cursor-pointer flex items-center justify-center"
                        onClick={toggleCollapse}>
                        <p>Or log in manually</p>
                        {isOpen ? <ChevronDownIcon className="mt-0.5 h-4 w-4" aria-hidden="true"/> :
                            <ChevronRightIcon className="mt-0.5 h-4 w-4" aria-hidden="true"/>}
                    </div>
                </div>
                <div
                    className={`flex flex-col items-center justify-center ${isOpen ? 'h-3/7 pb-2' : 'h-0'} overflow-hidden`}>
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
                                   className="mt-2 block text-sm font-medium leading-6 text-vtk-blue-600">
                                Password
                            </label>
                            <div className="mt-2 text-sm">
                                <a href="#" className="text-xs font-semibold text-vtk-blue-600 focus:outline-none hover:text-vtk-blue-500 focus:ring-2 focus:ring-offset-1 focus:ring-vtk-blue-600">
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
                                className="block w-full rounded-md border-0 py-1.5 text-vtk-blue-600 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-amber-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div className="mt-5 w-full max-w-sm">
                        <button
                            type="submit"
                            className="primary-button"
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}