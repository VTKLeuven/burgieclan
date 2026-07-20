'use client'

import React, { Suspense, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Menu, X } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import Search from "@/components/header/Search";
import HeaderProfileButton from "@/components/header/HeaderProfileButton";
import { useUser } from '@/components/UserContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/header/LanguageSwitcher';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Sticky navy header with light navigation: the same dark bookend as the
 * footer, so the site opens and closes dark. Matches `.vtk-site-header` in
 * vtk-website-new.
 */
export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const { t, i18n } = useTranslation();

    const { user } = useUser();
    const isAuthenticated = user !== null;

    const navigation = [
        { name: t('courses'), href: '/courses' },
        { name: t('FAQ'), href: '/faq' },
        { name: t('overview'), href: '#' },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-vtk-navy text-vtk-paper antialiased">
            <nav
                aria-label="Global"
                className="mx-auto flex min-h-[72px] max-w-(--max) items-center gap-x-4 px-5 sm:px-9 md:gap-x-8"
            >
                {/* Brand */}
                <Link href={`/${i18n.language}`} className="flex shrink-0 items-center gap-4">
                    <span className="sr-only">Burgieclan</span>
                    <Image
                        src="/images/logos/vtk-logo-white.png"
                        alt=""
                        width={140}
                        height={38}
                        className="h-[34px] w-auto max-w-[150px] object-contain object-left"
                        priority
                    />
                    {/* Optical nudge: flex centring aligns the full line box, which
                        leaves the cap-height block sitting high against the mark. */}
                    <span className="hidden translate-y-[2px] text-xl font-bold tracking-tight lg:inline">Burgieclan</span>
                </Link>

                {/* Search */}
                {isAuthenticated && (
                    <div className="min-w-0 flex-1">
                        <Search />
                    </div>
                )}

                {/* Mobile menu toggle */}
                <Suspense fallback={<Skeleton style={{ width: 100, height: 20 }} />}>
                    {isAuthenticated ? (
                        <div className="ml-auto flex md:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                className="grid h-[38px] w-[38px] place-items-center rounded-full border border-vtk-paper/35 bg-white/12 text-vtk-paper transition hover:border-vtk-paper hover:bg-white/22"
                            >
                                <span className="sr-only">{t('open_menu')}</span>
                                <Menu aria-hidden="true" className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="ml-auto flex md:hidden">
                            <Link href="/login" className="vtk-button vtk-button-accent vtk-button-sm">
                                {t('login')}
                            </Link>
                        </div>
                    )}
                </Suspense>

                {/* Desktop navigation and account controls */}
                <div className="ml-auto hidden items-center gap-x-6 md:flex">
                    <Suspense fallback={<Skeleton style={{ width: 100, height: 20 }} />}>
                        {isAuthenticated &&
                            navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="whitespace-nowrap text-sm font-medium text-vtk-paper/80 transition-colors hover:text-white"
                                >
                                    {item.name}
                                </Link>
                            ))}

                        <div className="flex items-center gap-x-3">
                            <LanguageSwitcher />
                            {isAuthenticated ? (
                                <HeaderProfileButton />
                            ) : (
                                <Link href="/login" className="vtk-button vtk-button-accent vtk-button-sm">
                                    {t('login')}
                                </Link>
                            )}
                        </div>
                    </Suspense>
                </div>
            </nav>

            {/* Mobile menu */}
            <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="md:hidden">
                <div className="fixed inset-0 z-40 bg-vtk-ink/40" aria-hidden="true" />
                <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-vtk-navy px-6 py-5 text-vtk-paper sm:max-w-sm">
                    <div className="flex items-center justify-between">
                        <Link href={`/${i18n.language}`} className="flex shrink-0 items-center gap-2.5">
                            <span className="sr-only">Burgieclan</span>
                            <Image
                                src="/images/logos/vtk-logo-white.png"
                                alt=""
                                width={140}
                                height={38}
                                className="h-[32px] w-auto object-contain object-left"
                            />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="grid h-[38px] w-[38px] place-items-center rounded-full border border-vtk-paper/35 bg-white/12 text-vtk-paper transition hover:border-vtk-paper hover:bg-white/22"
                        >
                            <span className="sr-only">{t('close_menu')}</span>
                            <X aria-hidden="true" className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mt-8 flex flex-col">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-xl px-3 py-2.5 text-base font-medium text-vtk-paper/80 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                {item.name}
                            </Link>
                        ))}
                        <div className="my-4 border-t border-white/15" />
                        <Link
                            href="/account"
                            onClick={() => setMobileMenuOpen(false)}
                            className="rounded-xl px-3 py-2.5 text-base font-medium text-vtk-paper/80 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            {t('profile')}
                        </Link>
                    </div>
                </div>
            </Dialog>
        </header>
    );
}
