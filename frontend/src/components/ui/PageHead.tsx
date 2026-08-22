import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeadProps {
    /**
     * The line above the title: a breadcrumb where the page sits in a hierarchy,
     * a plain label on top-level pages that have nothing to trace back through.
     */
    kicker?: ReactNode;
    title: ReactNode;
    /** Rendered to the left of the title, aligned to its first line. */
    icon?: LucideIcon;
    /** Controls belonging to the title, rendered before the icon (e.g. the favorite toggle). */
    actions?: ReactNode;
    subtitle?: ReactNode;
    /** Right-aligned counts, styled as small uppercase meta. Hidden on narrow screens. */
    meta?: ReactNode;
    /**
     * A right-hand block for pages needing markup of their own there (the course page's
     * teacher avatars). Ignored when `meta` is set; the two share one grid column.
     */
    aside?: ReactNode;
    /** Detail rendered under the title, such as the course badge/credits row. */
    children?: ReactNode;
}

/**
 * The editorial page head shared by every page: kicker, display title, optional subtitle
 * and right-aligned meta, with a rule underneath. Kept in one place so the spacing and
 * markup cannot drift between pages the way six hand-rolled copies did.
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
}: PageHeadProps) {
    return (
        <div className="vtk-page-head">
            <div>
                {kicker && <div className="vtk-page-kicker">{kicker}</div>}

                <div className="flex items-start gap-3">
                    {actions}
                    {Icon && <Icon className="mt-1.5 h-6 w-6 shrink-0 text-vtk-muted" />}
                    <h1 className="vtk-page-title">{title}</h1>
                </div>

                {subtitle && <div className="vtk-page-subtitle [&_p]:m-0">{subtitle}</div>}

                {children}
            </div>

            {meta ? <div className="vtk-page-meta hidden sm:block">{meta}</div> : aside}
        </div>
    );
}
