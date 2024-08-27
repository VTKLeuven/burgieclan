'use client'

import Image from 'next/image'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import React, { useRef, useEffect, useState } from 'react';
import LitusOAuthButton from "@/components/login/LitusOAuthButton";
import {ApiClient, ApiClientError} from "@/utils/api";
import {useRouter} from "next/navigation";
import {SetJWTAsCookie} from "@/utils/oauth";
import Logo from "@/components/branding/Logo";

/**
 * Login form component, displays initial login form with VTK login option and expands
 * when user chooses to log in manually.
 *
 * Should be rendered as full page.
 */
export default function LoginForm() {
    const router = useRouter();

    const [isOpen, setIsOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const toggleCollapse = () => {
        setIsOpen(!isOpen);
    };

    const handleLogin = (event) => {
        // Prevent the form from causing a page reload
        event.preventDefault();

        /**
         * Handles credentials login
         */
        const Login = async () => {
            try {
                const response = await ApiClient('POST', `/api/auth/login`, {
                    username: username,
                    password: password,
                });
                await SetJWTAsCookie(response.token);

                router.push('/');
            } catch (err: any) {
                setError(err.detail || 'Bad credentials, please verify that your username/password are correctly set.');
            }
        };

        Login();
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

                    {/* Handles OAuth login via Litus */}
                    <LitusOAuthButton />

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
                    <form onSubmit={handleLogin} className="w-full max-w-sm mt-10">
                        <div>
                            <label htmlFor="username">
                                <p className="mt-2 text-sm font-medium">Username</p>
                            </label>
                            <div className="mt-2">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-amber-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password">
                                <p className="mt-2 text-sm font-medium">Password</p>
                            </label>
                            <div className="mt-2">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 text-vtk-blue-600 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-amber-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        { error && (
                            <p className="mt-4 text-sm text-red-600">{ error }</p>
                        )}

                        <div className="mt-5 w-full max-w-sm">
                            <button
                                type="submit"
                                className="primary-button"
                            >
                                Sign in
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}