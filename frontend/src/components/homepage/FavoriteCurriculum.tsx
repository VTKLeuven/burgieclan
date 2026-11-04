'use client';

import { useUser } from '@/components/UserContext';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import FavoriteButton from '@/components/ui/FavoriteButton';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { GraduationCap, Layers } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Enough to orient; the rest is one click away on the account page. */
const MAX_PER_TYPE = 4;

interface FavoriteRowProps {
    id: number;
    name: string;
    typeLabel: string;
    type: 'module' | 'program';
    icon: LucideIcon;
}

const FavoriteRow = ({ id, name, typeLabel, type, icon: Icon }: FavoriteRowProps) => (
    // The star has to sit outside the link — a button nested in an anchor is invalid markup.
    <div className="flex items-center gap-1.5">
        <FavoriteButton itemId={id} itemType={type} size={14} className="shrink-0" />
        <ApiPrefetchLink
            className="group flex min-w-0 flex-1 items-center gap-2 text-sm text-vtk-link hover:underline hover:underline-offset-2"
            href={type === 'program' ? curriculumHref.program({ id }) : curriculumHref.module({ id })}
            apiEndpoints={type === 'program' ? `/api/programs/${id}` : `/api/modules/${id}`}
            title={typeLabel}
        >
            <span className="truncate">{name}</span>
            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-vtk-muted" />
        </ApiPrefetchLink>
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
        <div className="grid content-start gap-y-2">
            <h3 className="m-0 font-sans text-sm font-bold tracking-normal text-vtk-navy">
                {t('home.favorite_curriculum')}
            </h3>
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

            {truncated && (
                <Link
                    href="/account#my-courses"
                    className="text-[13px] font-bold text-vtk-link hover:underline"
                >
                    {t('home.favorite_curriculum_all')}
                </Link>
            )}
        </div>
    );
};
