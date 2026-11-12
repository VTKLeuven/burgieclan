'use client';

import { openMobileNav, openSearch } from '@/components/layout/navEvents';
import { useUser } from '@/components/UserContext';
import { cn } from '@/lib/utils';
import { ChevronRight, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface Crumb {
    label: string;
    href?: string;
    icon?: ReactNode;
    /** Full text for the tooltip when the label is shortened. */
    title?: string;
}

/**
 * The trail in the page header: feature icon and name first, `›` between levels, the current
 * page last in full weight. On a phone only the last two levels are shown, so it stays one line.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
    // Middle levels give way first: below xl the trail is "first › … › parent › current", and on
    // a phone only "parent › current". Hover the ellipsis for the levels it stands for.
    const collapsible = crumbs.length > 3;
    const hidden = crumbs.slice(1, -2);

    return (
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                const isMiddle = collapsible && index > 0 && index < crumbs.length - 2;
                const hiddenOnPhone = index < crumbs.length - 2;
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
                                'flex min-w-0 items-center gap-1.5',
                                last ? 'shrink-[1]' : 'max-w-[14rem] shrink-[3]',
                                hiddenOnPhone && 'hidden sm:flex',
                                isMiddle && 'sm:hidden xl:flex',
                            )}
                        >
                            {index > 0 && (
                                <ChevronRight
                                    className={cn('size-4 shrink-0 text-fg-placeholder', index === crumbs.length - 2 && 'hidden sm:block')}
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
                                className="hidden shrink-0 items-center gap-1.5 text-nav text-fg-muted sm:flex xl:hidden"
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
    );
}

/**
 * The 56px bar at the top of the white panel: where you are on the left, what you can do here on
 * the right (secondary actions first, then at most one primary). It stays put while the page
 * scrolls underneath.
 */
export default function PageHeader({
    crumbs,
    breadcrumb,
    actions,
    className,
}: {
    crumbs?: Crumb[];
    /** A ready-made trail, for pages whose location comes from context (DynamicBreadcrumb). */
    breadcrumb?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    const { t } = useTranslation();
    const { user } = useUser();

    return (
        <header
            className={cn(
                'sticky top-0 z-30 flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-3 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/85 md:px-5',
                className,
            )}
        >
            <button
                type="button"
                onClick={openMobileNav}
                className="vtk-icon-button -ml-0.5 md:hidden"
                aria-label={t('open_menu')}
            >
                <Menu className="size-[18px]" aria-hidden="true" />
            </button>
            {breadcrumb ?? <Breadcrumbs crumbs={crumbs ?? []} />}
            <div className="flex shrink-0 items-center gap-1.5">
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
        </header>
    );
}
