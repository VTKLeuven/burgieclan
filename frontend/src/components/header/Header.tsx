'use client'

import React, {Suspense, useState} from 'react';
import { Dialog } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Logo from '@/components/common/Logo';
import {Skeleton} from "@/components/ui/skeleton";
import Search from "@/components/header/Search";

const navigation = [
    { name: 'Courses', href: '#' },
    { name: 'FAQ', href: '#' },
    { name: 'Overview', href: '#' },
];

export default async function Header({isAuthenticated} : {isAuthenticated: boolean}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="bg-white">
            <nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between border-b border-gray-900/10 p-6 lg:px-8">

                {/* Logo and search */}
                <div className="flex gap-x-8 items-center justify-start sm:justify-center pr-8">
                    <a href="/" className="-m-1.5 p-1.5 flex-shrink-0">
                        <span className="sr-only">Burgieclan</span>
                        <Logo width={50} height={50}/>
                    </a>
                    {isAuthenticated && <Search />}
                </div>

                {/* Mobile menu toggle button */}
                <Suspense fallback={<Skeleton width={100} height={20}/>}>
                    {isAuthenticated ?
                        <div className="flex md:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                className="-m-1.5 p-1.5 w-[50px] h-[50px] rounded-md text-gray-700 justify-center items-center flex"
                            >
                                <span className="sr-only">Open menu</span>
                                <Bars3Icon aria-hidden="true" className="h-6 w-6"/>
                            </button>
                        </div>
                        :
                        <div className="flex md:hidden">

                            <a href="login" className="primary-button">
                                Login
                            </a>

                        </div>
                    }
                </Suspense>

                {/* Whitespace and login/profile links */}
                <div className="hidden md:flex md:gap-x-8">
                    <Suspense fallback={<Skeleton width={100} height={20}/>}>
                        {isAuthenticated &&
                        navigation.map((item) => (
                            <a key={item.name} href={item.href} className="text-sm font-semibold leading-6 text-gray-900">
                                {item.name}
                            </a>
                        ))}

                        {isAuthenticated ?
                        <a href="account" className="text-sm font-semibold leading-6 text-gray-900">
                            Profile
                        </a> :
                        <a href="login" className="primary-button">
                            Login
                        </a>
                        }
                    </Suspense>
                </div>
            </nav>

            {/* Mobile menu */}
                <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="md:hidden">
                    <div
                        className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
                        <div className="flex items-center justify-between sm:justify-end">

                            {/* Logo and search */}
                            <div className="flex gap-x-8 items-center justify-start sm:justify-center pr-8">
                                <a href="/" className="-m-1.5 p-1.5 flex-shrink-0 flex sm:hidden">
                                    <span className="sr-only">Burgieclan</span>
                                    <Logo width={50} height={50}/>
                                </a>
                                <div className="flex sm:hidden">
                                    <Search />
                                </div>
                            </div>

                            {/* Mobile menu toggle button */}
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(false)}
                                className="-m-1.5 p-1.5 w-[50px] h-[50px] rounded-md text-gray-700 justify-center items-center flex"
                            >
                                <span className="sr-only">Close menu</span>
                                <XMarkIcon aria-hidden="true" className="h-6 w-6"/>
                            </button>
                        </div>

                        {/* Menu items */}
                        <div className="mt-6 flow-root">
                            <div className="-my-6 divide-y divide-gray-500/10">
                                <div className="space-y-2 py-6">
                                    {navigation.map((item) => (
                                        <a
                                            key={item.name}
                                            href={item.href}
                                            className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                                        >
                                            {item.name}
                                        </a>
                                    ))}
                                </div>
                                <div className="py-6">
                                    <a href="account" className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50">
                                        Profile
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </Dialog>

        </header>
    );
}
