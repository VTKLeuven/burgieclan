import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeadProps {
    /** A small muted line above the title. The breadcrumb lives in the page header now. */
    kicker?: ReactNode;
    title: ReactNode;
    /** Drawn as a 40px tile to the left of the title. */
    icon?: LucideIcon;
    /** Inline controls right after the title, such as the favourite star. */
    actions?: ReactNode;
    subtitle?: ReactNode;
    /** Right-aligned summary (counts), muted. Hidden on narrow screens. */
    meta?: ReactNode;
    /** A right-hand block with markup of its own. Ignored when `meta` is set. */
    aside?: ReactNode;
    /** Detail under the title, such as a row of facts. */
    children?: ReactNode;
    className?: string;
}

/**
 * The top of a page's content: a 24px title with a muted line under it, as on Dopl's pages.
 * No rule underneath and no display type; the page header above already says where you are.
 */
export default function PageHead({
    kicker,
    title,
    icon: Icon,
    actions,
    subtitle,
    meta,
    aside,
    children,
    className,
}: PageHeadProps) {
    return (
        <div className={cn('flex items-start gap-4', className)}>
            {Icon && (
                <span className="mt-0.5 hidden size-10 shrink-0 place-items-center rounded-card border border-border bg-surface shadow-card sm:grid">
                    <Icon className="size-5 text-icon-strong" strokeWidth={1.75} aria-hidden="true" />
                </span>
            )}
            <div className="min-w-0 flex-1">
                {kicker && <div className="mb-1 text-caption font-medium text-fg-muted">{kicker}</div>}
                <div className="flex items-center gap-2">
                    <h1 className="vtk-page-title min-w-0 break-words">{title}</h1>
                    {actions}
                </div>
                {subtitle && <div className="vtk-page-subtitle [&_p]:m-0">{subtitle}</div>}
                {children}
            </div>
            {meta ? (
                <div className="hidden shrink-0 pt-1.5 text-small text-fg-muted tabular sm:block">{meta}</div>
            ) : (
                aside
            )}
        </div>
    );
}
