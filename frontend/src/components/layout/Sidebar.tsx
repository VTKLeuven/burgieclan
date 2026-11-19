'use client';

import { recordOldBurgieclanClick } from '@/actions/analytics';
import { logOut } from '@/actions/auth';
import FeedbackDialog from '@/components/header/FeedbackDialog';
import LanguageSwitcher from '@/components/header/LanguageSwitcher';
import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import { openSearch } from '@/components/layout/navEvents';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/components/UserContext';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { cn } from '@/lib/utils';
import { localizedCourseName, sortCoursesByName } from '@/utils/courseName';
import {
    ArrowUpRight,
    CalendarDays,
    ChevronRight,
    ChevronsUpDown,
    CircleHelp,
    ExternalLink,
    FileText,
    GraduationCap,
    House,
    Languages,
    LogOut,
    MessageSquareText,
    PanelLeftClose,
    Search,
    Shield,
    UserRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** How many favourite documents the sidebar lists before it points to the account page. */
const MAX_DOCUMENTS = 6;

function stripLocale(pathname: string) {
    return pathname.replace(/^\/(?:en|nl)(?=\/|$)/, '') || '/';
}

function NavItem({
    href,
    icon,
    label,
    active,
    onNavigate,
    trailing,
    external,
    title,
    onClick,
}: {
    href: string;
    icon: ReactNode;
    label: string;
    active?: boolean;
    onNavigate?: () => void;
    trailing?: ReactNode;
    external?: boolean;
    title?: string;
    onClick?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={() => {
                onClick?.();
                onNavigate?.();
            }}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            aria-current={active ? 'page' : undefined}
            title={title}
            className={cn(
                'group flex h-7 items-center gap-2.5 rounded-control px-2.5 text-small font-medium text-fg-nav',
                'transition-colors duration-[var(--dur-fast)] ease-out',
                '[&_svg]:size-4 [&_svg]:shrink-0',
                // Navy marks where you are, the same navy as the primary button.
                active
                    ? 'bg-primary text-on-primary [&_svg]:text-on-primary/80'
                    : '[&_svg]:text-icon-strong hover:bg-sidebar-hover',
            )}
        >
            {icon}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {trailing}
        </Link>
    );
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
    return (
        <div className="mt-4 mb-0.5 flex h-6 items-center justify-between px-2.5">
            <span className="text-caption font-medium text-fg-muted">{children}</span>
            {action}
        </div>
    );
}

function initials(name?: string) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function SidebarBrand() {
    const { i18n } = useTranslation();
    return (
        <Link
            href={`/${i18n.language === 'nl' ? '' : i18n.language}`}
            className="flex h-11 min-w-0 items-center gap-2.5 rounded-control px-1"
        >
            <Image
                src="/images/logos/burgieclan-cloud-navy.svg"
                alt=""
                aria-hidden="true"
                width={52}
                height={29}
                className="h-[26px] w-auto shrink-0"
                priority
            />
            <span className="truncate text-[20px] leading-7 font-semibold tracking-[-0.02em] text-fg">Burgieclan</span>
        </Link>
    );
}

/**
 * The app's navigation, sitting directly on the grey canvas next to the white panel (Dopl's
 * shell). Top to bottom: brand, search, the few places there are, the reader's own courses and
 * documents, and the account menu. Everything that used to live in the navy header and the
 * footer is in here now, so a page never has to say where else you can go.
 */
export default function Sidebar({ onNavigate, onCollapse }: {
    onNavigate?: () => void;
    /** Hides the desktop sidebar; the mobile drawer closes by other means and leaves it out. */
    onCollapse?: () => void;
}) {
    const { t, i18n } = useTranslation();
    const { user, isAdmin } = useUser();
    const router = useRouter();
    const path = stripLocale(usePathname());
    const { course: currentCourse } = useCurriculumLocation();
    const [feedbackOpen, setFeedbackOpen] = useState(false);

    const isActive = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));
    const inCurriculum = ['/courses', '/course/', '/document/'].some((p) => path === p || path.startsWith(p));

    // Alphabetical by the title shown, so a course is found where you expect it rather than
    // where it happened to be starred.
    const courses = useMemo(
        () => sortCoursesByName(user?.favoriteCourses ?? [], i18n.language),
        [user?.favoriteCourses, i18n.language],
    );
    const documents = user?.favoriteDocuments ?? [];
    const adminUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin`;

    const handleLogout = async () => {
        await logOut();
        router.push('/login');
    };

    return (
        <nav aria-label="Burgieclan" className="flex h-full flex-col px-3 pt-3 pb-3">
            <div className="flex items-center gap-1">
                <div className="flex min-w-0 flex-1">
                    <SidebarBrand />
                </div>
                {onCollapse && (
                    <button
                        type="button"
                        onClick={onCollapse}
                        className="vtk-icon-button size-7!"
                        aria-label={t('shell.hide_sidebar')}
                        title={t('shell.hide_sidebar')}
                    >
                        <PanelLeftClose className="size-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            {user && (
                <button
                    type="button"
                    onClick={() => {
                        onNavigate?.();
                        openSearch();
                    }}
                    className="mt-3 flex h-8 w-full items-center gap-2 rounded-control border border-border-field bg-surface px-2.5 text-left text-small text-fg-placeholder shadow-xs transition-colors hover:border-fg-placeholder"
                >
                    <Search className="size-4 text-icon" aria-hidden="true" />
                    <span className="flex-1 truncate">{t('search.placeholder')}</span>
                    <span className="flex items-center gap-0.5" aria-hidden="true">
                        <kbd className="vtk-kbd">⌘</kbd>
                        <kbd className="vtk-kbd">K</kbd>
                    </span>
                </button>
            )}

            <div className="mt-3 flex flex-col gap-0.5">
                <NavItem href="/" icon={<House />} label={t('home.title')} active={path === '/'} onNavigate={onNavigate} />
                <NavItem
                    href="/courses"
                    icon={<GraduationCap />}
                    label={t('courses')}
                    active={inCurriculum && !courses.some((c) => c.id === currentCourse?.id)}
                    onNavigate={onNavigate}
                />
                {user && (
                    <NavItem
                        href="/planner"
                        icon={<CalendarDays />}
                        label={t('study_planner.nav')}
                        active={isActive('/planner')}
                        onNavigate={onNavigate}
                    />
                )}
                {user && (
                    <NavItem
                        href="/account"
                        icon={<UserRound />}
                        label={t('shell.my_account')}
                        active={isActive('/account')}
                        onNavigate={onNavigate}
                    />
                )}
                <NavItem href="/faq" icon={<CircleHelp />} label={t('FAQ')} active={isActive('/faq')} onNavigate={onNavigate} />
            </div>

            {/* Scrolls on its own, so the account menu always stays at the bottom. */}
            <div className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 scrollbar-thin">
                {user && (
                    <>
                        <SectionLabel
                            action={
                                <Link
                                    href="/courses"
                                    onClick={onNavigate}
                                    className="rounded-[6px] text-caption font-medium text-fg-muted hover:text-fg"
                                >
                                    {t('shell.browse')}
                                </Link>
                            }
                        >
                            {t('shell.my_courses')}
                        </SectionLabel>
                        <div className="flex flex-col gap-0.5">
                            {courses.length === 0 ? (
                                <p className="m-0 px-2.5 py-1.5 text-small text-fg-muted">{t('shell.no_courses')}</p>
                            ) : (
                                courses.map((course) => {
                                    const name = localizedCourseName(course, i18n.language) ?? course.code ?? '';
                                    const active = currentCourse?.id === course.id && inCurriculum;
                                    // The star says why the course is listed here, and clicking it
                                    // takes it off the list. A sibling laid over the icon slot rather
                                    // than inside the link, which may not hold a button.
                                    return (
                                        <div key={course.id} className="relative">
                                            <NavItem
                                                href={`/course/${course.id}`}
                                                icon={<span className="size-4 shrink-0" aria-hidden="true" />}
                                                label={name}
                                                title={name}
                                                active={active}
                                                onNavigate={onNavigate}
                                                trailing={
                                                    <span className="text-caption font-medium text-fg-muted tabular opacity-0 transition-opacity group-hover:opacity-100 group-aria-[current=page]:text-on-primary/70">
                                                        {course.code}
                                                    </span>
                                                }
                                            />
                                            <FavoriteButton
                                                itemId={course.id}
                                                itemType="course"
                                                size={14}
                                                // A light wash on the navy active row: the grey one that suits the
                                                // canvas reads as a hole punched in it.
                                                className={`absolute top-1/2 left-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-[6px]! p-0! ${active ? 'hover:bg-white/15!' : 'hover:bg-black/[0.07]!'}`}
                                            />
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {documents.length > 0 && (
                            <>
                                <SectionLabel>{t('shell.favorite_documents')}</SectionLabel>
                                <div className="flex flex-col gap-0.5">
                                    {documents.slice(0, MAX_DOCUMENTS).map((document) => (
                                        <NavItem
                                            key={document.id}
                                            href={`/document/${document.id}`}
                                            icon={<FileText />}
                                            label={document.name ?? ''}
                                            title={document.name}
                                            active={isActive(`/document/${document.id}`)}
                                            onNavigate={onNavigate}
                                        />
                                    ))}
                                    {documents.length > MAX_DOCUMENTS && (
                                        <Link
                                            href="/account"
                                            onClick={onNavigate}
                                            className="flex h-7 items-center gap-1 rounded-control px-2.5 text-small text-fg-muted hover:bg-sidebar-hover hover:text-fg"
                                        >
                                            {t('shell.show_all', { count: documents.length })}
                                            <ChevronRight className="size-3.5" aria-hidden="true" />
                                        </Link>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            <div className="mt-2 flex flex-col gap-0.5 border-t border-border pt-2">
                <NavItem
                    href="https://burgieclan-backup.vtk.be"
                    icon={<ArrowUpRight />}
                    label={t('header.old_burgieclan')}
                    external
                    onClick={() => { void recordOldBurgieclanClick(); }}
                    onNavigate={onNavigate}
                />
                {user && (
                    <button
                        type="button"
                        onClick={() => setFeedbackOpen(true)}
                        className="flex h-7 items-center gap-2.5 rounded-control px-2.5 text-left text-small font-medium text-fg-nav transition-colors hover:bg-sidebar-hover [&_svg]:size-4 [&_svg]:text-icon-strong"
                    >
                        <MessageSquareText aria-hidden="true" />
                        <span className="truncate">{t('shell.feedback')}</span>
                    </button>
                )}
                {/* Logged out, the switcher sits next to "Inloggen" below instead. */}
                {user && (
                    <div className="flex h-8 items-center gap-2.5 pr-0.5 pl-2.5 text-small font-medium text-fg-nav [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-icon-strong">
                        <Languages aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{t('language')}</span>
                        <Suspense fallback={null}>
                            <LanguageSwitcher />
                        </Suspense>
                    </div>
                )}
            </div>

            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="mt-1 flex h-11 w-full items-center gap-2.5 rounded-control px-2 text-left transition-colors hover:bg-sidebar-hover data-[state=open]:bg-sidebar-hover"
                            aria-label={t('account.menu')}
                        >
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-caption font-semibold text-on-primary">
                                {initials(user.fullName)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-body font-medium text-fg">{user.fullName}</span>
                                <span className="block truncate text-caption text-fg-muted">{user.username}</span>
                            </span>
                            <ChevronsUpDown className="size-4 shrink-0 text-icon" aria-hidden="true" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
                        <DropdownMenuLabel className="truncate">{user.email ?? user.username}</DropdownMenuLabel>
                        <DropdownMenuItem
                            onSelect={() => {
                                onNavigate?.();
                                router.push('/account');
                            }}
                        >
                            <UserRound />
                            {t('shell.my_account')}
                        </DropdownMenuItem>
                        {isAdmin && (
                            <DropdownMenuItem asChild>
                                <a href={adminUrl} target="_blank" rel="noopener noreferrer">
                                    <Shield />
                                    <span className="flex-1">{t('header.admin')}</span>
                                    <ExternalLink className="size-3.5!" />
                                </a>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                            <a href="https://vtk.be/account/" target="_blank" rel="noopener noreferrer">
                                <ArrowUpRight />
                                <span className="flex-1">{t('header.my_vtk')}</span>
                                <ExternalLink className="size-3.5!" />
                            </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={handleLogout} className="text-danger-text focus:text-danger-text [&_svg]:text-danger-text!">
                            <LogOut />
                            {t('logout')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <div className="mt-2 flex items-center gap-2">
                    <Link href="/login" onClick={onNavigate} className="vtk-button vtk-button-primary flex-1">
                        {t('login')}
                    </Link>
                    <Suspense fallback={null}>
                        <LanguageSwitcher />
                    </Suspense>
                </div>
            )}

            <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} user={user} />
        </nav>
    );
}
