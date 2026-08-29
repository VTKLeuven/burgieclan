'use client';

import { useUser } from '@/components/UserContext';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { GraduationCap, Layers } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Matches the recent-activity list next to it, so the two panels read as one column. */
const MAX_PER_TYPE = 4;

interface FavoriteRowProps {
    id: number;
    name: string;
    typeLabel: string;
    type: 'module' | 'program';
    icon: LucideIcon;
}

const FavoriteRow = ({ id, name, typeLabel, type, icon: Icon }: FavoriteRowProps) => (
    // The star has to sit outside the link — a button nested in an anchor is invalid markup —
    // so it is overlaid on the row instead, the same way the sidebar favourites do it.
    <div className="group relative">
        <Link
            className="flex items-center gap-3.5 px-5 py-2.5 pr-12 transition-colors hover:bg-vtk-paper-2"
            href={type === 'program' ? curriculumHref.program({ id }) : curriculumHref.module({ id })}
        >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-vtk-muted" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-snug text-vtk-ink">{name}</p>
                <p className="truncate text-[13px] leading-snug text-vtk-muted">{typeLabel}</p>
            </div>
        </Link>
        <div className="absolute inset-y-0 right-4 flex items-center opacity-0 transition-opacity duration-100 focus-within:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100">
            <FavoriteButton itemId={id} itemType={type} size={16} />
        </div>
    </div>
);

/**
 * Favourite programmes and modules, under the recent-activity panel. Neither has a detail page of
 * its own, so both rows deep-link into the curriculum navigator, which opens them in place.
 */
export const FavoriteCurriculum = () => {
    const { t } = useTranslation();
    const { user } = useUser();

    const programs = user?.favoritePrograms ?? [];
    const modules = user?.favoriteModules ?? [];

    // Nothing starred yet: stay out of the way rather than show two empty lists.
    if (programs.length === 0 && modules.length === 0) {
        return null;
    }

    const truncated = programs.length > MAX_PER_TYPE || modules.length > MAX_PER_TYPE;

    return (
        <div className="vtk-panel overflow-hidden">
            <div className="border-b border-vtk-line px-5 py-3.5">
                <h2 className="m-0 text-base font-semibold tracking-tight text-vtk-ink">
                    {t('home.favorite_curriculum')}
                </h2>
            </div>

            <div className="divide-y divide-vtk-line">
                {programs.slice(0, MAX_PER_TYPE).map(program => (
                    <FavoriteRow
                        key={`program-${program.id}`}
                        id={program.id}
                        name={program.name ?? ''}
                        typeLabel={t('home.favorite_program_label')}
                        type="program"
                        icon={GraduationCap}
                    />
                ))}
                {modules.slice(0, MAX_PER_TYPE).map(module => (
                    <FavoriteRow
                        key={`module-${module.id}`}
                        id={module.id}
                        name={module.name ?? ''}
                        typeLabel={t('home.favorite_module_label')}
                        type="module"
                        icon={Layers}
                    />
                ))}
            </div>

            {truncated && (
                <div className="border-t border-vtk-line px-5 py-2.5">
                    <Link
                        href="/account"
                        className="text-[13px] text-vtk-muted transition-colors hover:text-vtk-ink"
                    >
                        {t('home.favorite_curriculum_all')}
                    </Link>
                </div>
            )}
        </div>
    );
};
