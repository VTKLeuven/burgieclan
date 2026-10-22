'use client'

import { Suspense, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Menu, X } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import Search from "@/components/header/Search";
import HeaderProfileButton from "@/components/header/HeaderProfileButton";
import { useUser } from '@/components/UserContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/header/LanguageSwitcher';
import Link from 'next/link';
import Image from 'next/image';
import { recordOldBurgieclanClick } from '@/actions/analytics';
import FeedbackDialog from '@/components/header/FeedbackDialog';

interface NavigationItem {
    name: string;
    href: string;
    external?: boolean;
    onClick?: () => void;
    /** A button that opens a dialog instead of a link to `href`. */
    dialog?: boolean;
}



/**
 * Sticky navy header with light navigation: the same dark bookend as the
 * footer, so the site opens and closes dark. Matches `.vtk-site-header` in
 * vtk-website-new.
 */
export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [feedbackOpen, setFeedbackOpen] = useState(false);

    const { t, i18n } = useTranslation();

    const { user } = useUser();
    const isAuthenticated = user !== null;

    const navigation: NavigationItem[] = [
        { name: t('courses'), href: '/courses' },
        { name: t('FAQ'), href: '/faq' },
        {
            name: t('header.old_burgieclan'),
            href: 'https://burgieclan-backup.vtk.be',
            external: true,
            onClick: () => { void recordOldBurgieclanClick(); },
        },
        {
            // Dopl's feedback form, opened in FeedbackDialog rather than a new
            // tab; the dialog carries its own "open in a new tab" link.
            name: t('header.new_burgieclan_feedback'),
            href: 'https://dopl.vtk.be/f/burgieclan-burgieclan-feedback',
            dialog: true,
            onClick: () => setFeedbackOpen(true),
        },
        //{ name: t('overview'), href: '#' },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-vtk-navy text-vtk-paper antialiased">
            <nav
                aria-label="Global"
                className="flex min-h-[72px] w-full items-center gap-x-4 px-4 sm:px-6 md:gap-x-8"
            >
                {/* Brand */}
                <Link href={`/${i18n.language}`} className="flex shrink-0 items-center gap-2.5">
                    <span className="sr-only">Burgieclan</span>
                    <Image
                        src="/images/logos/burgieclan-cloud-silver.svg"
                        alt=""
                        aria-hidden="true"
                        width={61}
                        height={34}
                        className="block h-[34px] w-auto shrink-0"
                        priority
                    />
                    <Image
                        src="/images/logos/burgieclan-wordmark-silver.svg"
                        alt="Burgieclan"
                        width={138}
                        height={18}
                        className="hidden h-[18px] w-auto object-contain lg:block"
                        priority
                    />
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
                        <div className="ml-auto flex xl:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                className="grid h-[38px] w-[38px] place-items-center rounded-full border border-vtk-paper/35 bg-white/12 text-vtk-paper transition hover:border-vtk-paper hover:bg-white/22 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                            >
                                <span className="sr-only">{t('open_menu')}</span>
                                <Menu aria-hidden="true" className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="ml-auto flex xl:hidden">
                            <Link href="/login" className="vtk-button vtk-button-accent vtk-button-sm">
                                {t('login')}
                            </Link>
                        </div>
                    )}
                </Suspense>

                {/* Desktop navigation and account controls */}
                <div className="ml-auto hidden items-center gap-x-6 xl:flex">
                    <Suspense fallback={<Skeleton style={{ width: 100, height: 20 }} />}>
                        {isAuthenticated &&
                            navigation.map((item) => item.dialog ? (
                                <button
                                    key={item.name}
                                    type="button"
                                    onClick={item.onClick}
                                    className="whitespace-nowrap text-sm font-medium text-vtk-paper/80 transition-colors hover:text-white rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                                >
                                    {item.name}
                                </button>
                            ) : (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    target={item.external ? '_blank' : undefined}
                                    rel={item.external ? 'noopener noreferrer' : undefined}
                                    onClick={item.onClick}
                                    className="whitespace-nowrap text-sm font-medium text-vtk-paper/80 transition-colors hover:text-white rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
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
            <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="xl:hidden">
                <div className="fixed inset-0 z-40 bg-vtk-ink/40" aria-hidden="true" />
                <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-vtk-navy px-6 py-5 text-vtk-paper sm:max-w-sm">
                    <div className="flex items-center justify-between">
                        <Link href={`/${i18n.language}`} className="flex shrink-0 items-center gap-2.5">
                            <span className="sr-only">Burgieclan</span>
                            <Image
                                src="/images/logos/burgieclan-cloud-silver.svg"
                                alt=""
                                aria-hidden="true"
                                width={57}
                                height={32}
                                className="block h-[32px] w-auto shrink-0"
                                priority
                            />
                            <Image
                                src="/images/logos/burgieclan-wordmark-silver.svg"
                                alt="Burgieclan"
                                width={123}
                                height={16}
                                className="h-4 w-auto object-contain"
                                priority
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
                        {navigation.map((item) => item.dialog ? (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    item.onClick?.();
                                }}
                                className="rounded-xl px-3 py-2.5 text-left text-base font-medium text-vtk-paper/80 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                {item.name}
                            </button>
                        ) : (
                            <Link
                                key={item.name}
                                href={item.href}
                                target={item.external ? '_blank' : undefined}
                                rel={item.external ? 'noopener noreferrer' : undefined}
                                onClick={() => {
                                    item.onClick?.();
                                    setMobileMenuOpen(false);
                                }}
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

            <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} user={user} />
        </header>
    );
}
