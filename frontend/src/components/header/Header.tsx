'use client'

import React, { Suspense, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { Skeleton } from "@/components/ui/skeleton";
import Search from "@/components/header/Search";
import HeaderProfileButton from "@/components/header/HeaderProfileButton";
import { useUser } from '@/components/UserContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/header/LanguageSwitcher';
import Link from 'next/link';


export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const { t, i18n } = useTranslation();

    const { user } = useUser();
    const isAuthenticated = user !== null;

    const navigation = [
        { name: t('courses'), href: '/courses' },
        { name: t('FAQ'), href: '#' },
        { name: t('overview'), href: '#' },
    ];

    return (
        <header className="bg-white">
            <nav aria-label="Global"
                 className="mx-auto flex items-center justify-between border-b border-gray-900/10 p-6 lg:px-8">

                {/* Logo and search */}
                <div className="flex gap-x-8 items-center justify-start sm:justify-center pr-8">
                    <Link href={`/${i18n.language}`} className="-m-1.5 p-1.5 flex-shrink-0">
                        <span className="sr-only">Burgieclan</span>
                        <Logo width={50} height={50} />
                    </Link>
                    {isAuthenticated && <Search />}
                </div>

                {/* Mobile menu toggle button */}
                <Suspense fallback={<Skeleton style={{ width: 100, height: 20 }} />}>
                    {isAuthenticated ?
                        <div className="flex md:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                className="-m-1.5 p-1.5 w-[50px] h-[50px] rounded-md text-gray-700 justify-center items-center flex"
                            >
                                <span className="sr-only">{t('open_menu')}</span>
                                <Menu aria-hidden="true" className="h-6 w-6" />
                            </button>
                        </div>
                        :
                        <div className="flex md:hidden">

                            <Link href="/login" className="primary-button">
                                {t('login')}
                            </Link>

                        </div>
                    }
                </Suspense>

                {/* Whitespace and login/profile links */}
                <div className="hidden md:flex md:gap-x-8 md:items-center">
                    <Suspense fallback={<Skeleton style={{width: 100, height: 20}}/>}>
                        {isAuthenticated &&
                            navigation.map((item) => (
                                <Link key={item.name} href={item.href}
                                    className="text-sm font-semibold leading-6 text-gray-900">
                                    {item.name}
                                </Link>
                            ))}

                        <div className="flex items-center gap-x-6">
                            <LanguageSwitcher />
                            {isAuthenticated
                                ?   <HeaderProfileButton />
                                :   <Link href="/login" className="primary-button">
                                        {t('login')}
                                    </Link>
                            }
                        </div>
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
                            <Link href={`/${i18n.language}`} className="-m-1.5 p-1.5 flex-shrink-0 flex sm:hidden">
                                <span className="sr-only">Burgieclan</span>
                                <Logo width={50} height={50} />
                            </Link>
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
                            <span className="sr-only">{t('close_menu')}</span>
                            <X aria-hidden="true" className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Menu items */}
                    <div className="mt-6 flow-root">
                        <div className="-my-6 divide-y divide-gray-500/10">
                            <div className="space-y-2 py-6">
                                {navigation.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                            <div className="py-6">
                                <Link href="/account" className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50">
                                    {t('profile')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </header>
    );
}
