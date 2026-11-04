'use client'

import { Suspense, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Menu, MessageSquareDot, X } from 'lucide-react';
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
}

/** The navy cloud with the name next to it, as the wireframes put the logo top left. */
const HeaderLogo = ({ compact = false }: { compact?: boolean }) => (
    <>
        <Image
            src="/images/logos/burgieclan-cloud-navy.png"
            alt=""
            width={57}
            height={32}
            className="h-8 w-auto shrink-0"
            priority
        />
        <span
            className={`${compact ? '' : 'hidden lg:inline'} font-display text-[19px] font-bold tracking-tight text-vtk-navy`}
        >
            Burgieclan
        </span>
    </>
);

const navLinkClass =
    'whitespace-nowrap rounded-sm font-display text-[15px] font-medium text-vtk-ink transition-colors hover:text-vtk-navy focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy';

/**
 * White header with a hairline underneath, as in the wireframes: logo and search on the left,
 * navigation, the feedback button, the account avatar and the language switch on the right.
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
    ];

    // Dopl's feedback form, opened in FeedbackDialog rather than a new tab; the dialog
    // carries its own "open in a new tab" link. The wireframes give it the speech-bubble icon.
    const feedbackLabel = t('header.new_burgieclan_feedback');

    return (
        <header className="sticky top-0 z-50 border-b border-vtk-line bg-vtk-surface text-vtk-ink antialiased">
            <nav
                aria-label="Global"
                className="flex min-h-[72px] w-full items-center gap-x-4 px-4 sm:px-6 md:gap-x-8"
            >
                {/* Brand */}
                <Link
                    href={`/${i18n.language}`}
                    className="flex shrink-0 items-center gap-2.5 rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
                >
                    <span className="sr-only">Burgieclan</span>
                    <HeaderLogo />
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
                                className="grid h-[38px] w-[38px] place-items-center rounded-full bg-vtk-paper text-vtk-ink transition hover:bg-vtk-paper-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
                            >
                                <span className="sr-only">{t('open_menu')}</span>
                                <Menu aria-hidden="true" className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="ml-auto flex items-center gap-x-4 xl:hidden">
                            <LanguageSwitcher />
                            <Link href="/login" className="vtk-button vtk-button-primary vtk-button-sm">
                                {t('login')}
                            </Link>
                        </div>
                    )}
                </Suspense>

                {/* Desktop navigation and account controls */}
                <div className="ml-auto hidden items-center gap-x-7 xl:flex">
                    <Suspense fallback={<Skeleton style={{ width: 100, height: 20 }} />}>
                        {isAuthenticated &&
                            navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    target={item.external ? '_blank' : undefined}
                                    rel={item.external ? 'noopener noreferrer' : undefined}
                                    onClick={item.onClick}
                                    className={navLinkClass}
                                >
                                    {item.name}
                                </Link>
                            ))}

                        <div className="flex items-center gap-x-4">
                            {isAuthenticated && (
                                <button
                                    type="button"
                                    onClick={() => setFeedbackOpen(true)}
                                    className="grid h-9 w-9 place-items-center rounded-full text-vtk-ink transition-colors hover:bg-vtk-paper focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
                                    aria-label={feedbackLabel}
                                    title={feedbackLabel}
                                >
                                    <MessageSquareDot size={21} strokeWidth={1.75} aria-hidden="true" />
                                </button>
                            )}
                            {isAuthenticated ? (
                                <HeaderProfileButton />
                            ) : (
                                <Link href="/login" className="vtk-button vtk-button-primary vtk-button-sm">
                                    {t('login')}
                                </Link>
                            )}
                            <LanguageSwitcher />
                        </div>
                    </Suspense>
                </div>
            </nav>

            {/* Mobile menu */}
            <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="xl:hidden">
                <div className="fixed inset-0 z-40 bg-vtk-ink/40" aria-hidden="true" />
                <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-vtk-surface px-6 py-5 text-vtk-ink sm:max-w-sm">
                    <div className="flex items-center justify-between">
                        <Link href={`/${i18n.language}`} className="flex shrink-0 items-center gap-2.5">
                            <span className="sr-only">Burgieclan</span>
                            <HeaderLogo compact />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="grid h-[38px] w-[38px] place-items-center rounded-full bg-vtk-paper text-vtk-ink transition hover:bg-vtk-paper-2"
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
                                target={item.external ? '_blank' : undefined}
                                rel={item.external ? 'noopener noreferrer' : undefined}
                                onClick={() => {
                                    item.onClick?.();
                                    setMobileMenuOpen(false);
                                }}
                                className="rounded-md px-3 py-2.5 font-display text-base font-medium text-vtk-ink transition-colors hover:bg-vtk-paper"
                            >
                                {item.name}
                            </Link>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                setMobileMenuOpen(false);
                                setFeedbackOpen(true);
                            }}
                            className="rounded-md px-3 py-2.5 text-left font-display text-base font-medium text-vtk-ink transition-colors hover:bg-vtk-paper"
                        >
                            {feedbackLabel}
                        </button>
                        <div className="my-4 border-t border-vtk-line" />
                        <Link
                            href="/account"
                            onClick={() => setMobileMenuOpen(false)}
                            className="rounded-md px-3 py-2.5 font-display text-base font-medium text-vtk-ink transition-colors hover:bg-vtk-paper"
                        >
                            {t('profile')}
                        </Link>
                        <div className="px-3 py-2.5">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </Dialog>

            <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} user={user} />
        </header>
    );
}
