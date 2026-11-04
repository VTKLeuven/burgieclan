'use client';

import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface CurriculumLinkRowProps {
    href: string;
    apiEndpoints?: string | string[];
    name: ReactNode;
    /** Full name for the tooltip when `name` is shortened. */
    title?: string;
    favorite: { id: number; type: 'program' | 'module' };
    /** Trailing actions, such as the download button. */
    actions?: ReactNode;
}

/**
 * One programme or group in the curriculum, drawn as the wireframes draw a row on "Gekozen vak":
 * the favourite star, the name in bold with the round yellow arrow after it, a hairline under
 * the row. The whole name is the link; the star and the actions sit beside it.
 */
export default function CurriculumLinkRow({ href, apiEndpoints, name, title, favorite, actions }: CurriculumLinkRowProps) {
    return (
        <div className="flex items-center gap-2.5 border-b border-vtk-line-2 py-3.5">
            <FavoriteButton itemId={favorite.id} itemType={favorite.type} size={18} className="shrink-0" />
            <ApiPrefetchLink
                href={href}
                apiEndpoints={apiEndpoints}
                title={title}
                className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
            >
                <span className="min-w-0 truncate font-display text-[17px] font-semibold tracking-tight text-vtk-ink group-hover:text-vtk-navy">
                    {name}
                </span>
                <span className="vtk-arrow-button vtk-arrow-button-sm" aria-hidden="true">
                    <ArrowUpRight size={14} strokeWidth={2.25} />
                </span>
            </ApiPrefetchLink>
            {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
    );
}
