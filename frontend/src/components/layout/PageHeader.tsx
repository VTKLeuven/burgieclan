'use client';

import { openMobileNav, openSearch } from '@/components/layout/navEvents';
import { useCurriculumPanel, useSidebarPanel } from '@/components/layout/ShellPanels';
import ShowSidebarButton from '@/components/layout/ShowSidebarButton';
import { useUser } from '@/components/UserContext';
import { cn } from '@/lib/utils';
import { ChevronRight, ListTree, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface Crumb {
    label: string;
    href?: string;
    icon?: ReactNode;
    /** Full text for the tooltip when the label is shortened. */
    title?: string;
}

/**
 * The whole trail on a phone, as a row of its own under the header bar: next to the page's
 * actions there is no room left for it. It scrolls sideways when it is long and starts scrolled
 * to the end, so the levels closest to the page are the ones in view.
 */
function MobileBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
    const ref = useRef<HTMLElement>(null);
    const signature = crumbs.map((crumb) => crumb.href ?? crumb.label).join('|');

    useEffect(() => {
        const nav = ref.current;
        if (nav) nav.scrollLeft = nav.scrollWidth;
    }, [signature]);

    return (
        <nav
            ref={ref}
            aria-label="Breadcrumb"
            className="flex h-10 items-center gap-1 overflow-x-auto border-t border-border px-3 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden"
        >
            {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                const content = (
                    <span className="inline-flex items-center gap-1.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-icon">
                        {crumb.icon}
                        <span className="max-w-[16rem] truncate">{crumb.label}</span>
                    </span>
                );

                return (
                    <Fragment key={`${crumb.href ?? crumb.label}:${index}`}>
                        {index > 0 && (
                            <ChevronRight className="size-3.5 shrink-0 text-fg-placeholder" aria-hidden="true" />
                        )}
                        {crumb.href && !last ? (
                            <Link
                                href={crumb.href}
                                title={crumb.title ?? crumb.label}
                                className="flex shrink-0 items-center rounded-[6px] px-1 py-1.5 text-small whitespace-nowrap text-fg-muted active:bg-neutral-150"
                            >
                                {content}
                            </Link>
                        ) : (
                            <span
                                aria-current={last ? 'page' : undefined}
                                className={cn('flex shrink-0 px-1 text-small whitespace-nowrap', last ? 'font-medium text-fg' : 'text-fg-muted')}
                            >
                                {content}
                            </span>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}

/**
 * The trail in the page header: feature icon and name first, `›` between levels, the current
 * page last in full weight. On a phone PageHeader moves a trail of more than one level to a row
 * of its own.
 */
export function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
    // Levels give way by the room the trail actually has, which the columns beside the page
    // decide as much as the window does: the middle ones first ("first › … › parent ›
    // current"), then the first, then the parent. Hover the ellipsis for the levels it stands for.
    // Squeezing them all instead left a row of empty chevrons.
    const collapsible = crumbs.length > 3;
    const hidden = crumbs.slice(1, -2);
    const parentIndex = crumbs.length - 2;
    // A container has no width of its own content, so a single crumb (which may sit in a
    // flex-none slot) is left out of it; it has nothing to collapse anyway.
    const measured = crumbs.length > 1;

    return (
        <div className={cn('flex min-w-0', measured && '@container flex-1', className)}>
            <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                {crumbs.map((crumb, index) => {
                    const last = index === crumbs.length - 1;
                    const isMiddle = collapsible && index > 0 && index < parentIndex;
                    const content = (
                        <span className="inline-flex min-w-0 items-center gap-2 [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-icon">
                            {crumb.icon}
                            <span className="truncate">{crumb.label}</span>
                        </span>
                    );

                    return (
                        <Fragment key={`${crumb.href ?? crumb.label}:${index}`}>
                            <span
                                className={cn(
                                    'flex items-center gap-1.5',
                                    // The current page takes what is left; the levels above it keep a readable
                                    // width rather than all shrinking to "M…".
                                    last ? 'min-w-0 shrink' : isMiddle ? 'max-w-[10rem] min-w-12 shrink-[3]' : 'max-w-[12rem] shrink-0',
                                    measured && index === 0 && index < parentIndex && 'hidden @md:flex',
                                    measured && index === parentIndex && 'hidden @xs:flex',
                                    isMiddle && 'hidden @3xl:flex',
                                )}
                            >
                                {index > 0 && (
                                    <ChevronRight
                                        className={cn('size-4 shrink-0 text-fg-placeholder', index === parentIndex && 'hidden @md:block')}
                                        aria-hidden="true"
                                    />
                                )}
                                {crumb.href && !last ? (
                                    <Link
                                        href={crumb.href}
                                        title={crumb.title ?? crumb.label}
                                        className="flex min-w-0 rounded-[6px] text-nav text-fg-muted transition-colors hover:text-fg"
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <span
                                        aria-current={last ? 'page' : undefined}
                                        title={crumb.title ?? crumb.label}
                                        className={cn('flex min-w-0 text-nav', last ? 'font-medium text-fg' : 'text-fg-muted')}
                                    >
                                        {content}
                                    </span>
                                )}
                            </span>
                            {collapsible && index === 0 && (
                                <span
                                    className="hidden shrink-0 items-center gap-1.5 text-nav text-fg-muted @md:flex @3xl:hidden"
                                    title={hidden.map((c) => c.label).join(' › ')}
                                >
                                    <ChevronRight className="size-4 shrink-0 text-fg-placeholder" aria-hidden="true" />
                                    <span aria-hidden="true">…</span>
                                </span>
                            )}
                        </Fragment>
                    );
                })}
            </nav>
        </div>
    );
}

/**
 * The 56px bar at the top of the white panel: where you are on the left, what you can do here on
 * the right (secondary actions first, then at most one primary). It stays put while the page
 * scrolls underneath. On a phone a trail of more than one level goes in a row below the bar,
 * where it has the full width.
 */
export default function PageHeader({
    crumbs,
    breadcrumb,
    actions,
    className,
}: {
    crumbs?: Crumb[];
    /** Something else in the trail's place; shown in the bar only, also on a phone. */
    breadcrumb?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    const { t } = useTranslation();
    const { user } = useUser();
    const sidebar = useSidebarPanel();
    const curriculumPanel = useCurriculumPanel();
    const showCurriculum = curriculumPanel.available && !curriculumPanel.open;
    const curriculumShown = curriculumPanel.available && curriculumPanel.open;
    const trail = crumbs ?? [];
    const trailInOwnRow = !breadcrumb && trail.length > 1;

    return (
        <header
            className={cn(
                'sticky top-0 z-30 shrink-0 border-b border-border bg-surface/95 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/85',
                className,
            )}
        >
            <div className="flex h-[var(--header-height)] items-center gap-3 px-3 md:px-5">
                <button
                    type="button"
                    onClick={openMobileNav}
                    className="vtk-icon-button -ml-0.5 md:hidden"
                    aria-label={t('open_menu')}
                >
                    <Menu className="size-[18px]" aria-hidden="true" />
                </button>
                {/* Reopen the hidden columns, from the breakpoint at which each exists: the sidebar from md,
                    the curriculum column from lg. While the curriculum column is open, the sidebar's button
                    sits in that column's header instead, at the panel's left edge. */}
                {(!sidebar.open || showCurriculum) && (
                    <div
                        className={cn(
                            '-ml-1.5 hidden shrink-0 items-center gap-0.5',
                            sidebar.open ? 'lg:flex' : 'md:flex',
                            !sidebar.open && curriculumShown && 'lg:hidden',
                        )}
                    >
                        <ShowSidebarButton />
                        {showCurriculum && (
                            <button
                                type="button"
                                onClick={() => curriculumPanel.setOpen(true)}
                                className="vtk-icon-button hidden lg:inline-grid"
                                aria-label={t('curriculum-panel.show')}
                                title={t('curriculum-panel.show')}
                            >
                                <ListTree className="size-[18px]" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                )}
                {breadcrumb ?? <Breadcrumbs crumbs={trail} className={trailInOwnRow ? 'max-sm:hidden' : undefined} />}
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    {actions}
                    {user && (
                        <button
                            type="button"
                            onClick={openSearch}
                            className="vtk-icon-button md:hidden"
                            aria-label={t('search.placeholder')}
                        >
                            <Search className="size-[18px]" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
            {trailInOwnRow && <MobileBreadcrumbs crumbs={trail} />}
        </header>
    );
}
